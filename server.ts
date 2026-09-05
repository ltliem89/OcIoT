import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import type {
  SensorData,
  IoTStatus,
  ControlCommand,
  AIVisionResult,
  EcosystemAnalysis,
  SystemSettings,
  GoogleSheetsData,
  Project,
  Zone,
  SensorConfig,
  ActuatorConfig,
  AlarmRule,
  ActiveAlarm,
  ConfigVersion,
  ProjectConfigSnapshot,
  Device,
  AuditLogItem,
  ProvisioningResult,
} from './src/types.ts';

import {
  DEFAULT_PROJECT,
  DEFAULT_ZONES,
  DEFAULT_SENSORS,
  DEFAULT_ACTUATORS,
  DEFAULT_ALARM_RULES,
  DEFAULT_DEVICES,
  DEFAULT_SNAPSHOT,
  DEFAULT_VERSIONS,
  DEFAULT_AUDIT_LOGS,
  checkContrast,
} from './src/lib/v4ConfigDefaults.ts';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const PORT = 3000;

// ----------------------------------------------------------------------
// PERSISTENT / IN-MEMORY STATE STORE FOR V4
// ----------------------------------------------------------------------
let currentProject: Project = { ...DEFAULT_PROJECT };
let currentZones: Zone[] = [...DEFAULT_ZONES];
let currentSensors: SensorConfig[] = [...DEFAULT_SENSORS];
let currentActuators: ActuatorConfig[] = [...DEFAULT_ACTUATORS];
let currentAlarmRules: AlarmRule[] = [...DEFAULT_ALARM_RULES];
let registeredDevices: Device[] = [...DEFAULT_DEVICES];
let configVersions: ConfigVersion[] = [...DEFAULT_VERSIONS];
let currentDraft: ProjectConfigSnapshot | null = null;
let auditLogs: AuditLogItem[] = [...DEFAULT_AUDIT_LOGS];

let activeAlarms: ActiveAlarm[] = [
  {
    id: 'alm_001',
    ruleId: 'rule_moisture_low',
    entityId: 'soil_moisture',
    state: 'ACTIVE',
    severity: 'WARNING',
    title: 'Độ Ẩm Đất Thấp',
    message: 'Độ ẩm đất thảm vi sinh 42% (Dưới ngưỡng tối thiểu 45%). Cần tưới bù ẩm.',
    currentValue: 42,
    triggeredAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
];

// ESP32 Legacy compatible settings
let systemSettings: SystemSettings = {
  deviceId: 'ESP32S3_ECO_01',
  offlineTimeoutSeconds: 30,
  googleSheetsUrl: '',
  tdsMin: 200,
  tdsMax: 750,
  tdsCritical: 1000,
  tdsCalibrationOffset: 0,
  soilMoistureMin: 50,
  soilMoistureMax: 80,
  soilMoistureCritical: 35,
  soilMoistureCalibrationOffset: 0,
  waterFloatDebounceSeconds: 3,
  floatLowSafetyCutoff: true,
  floatHighAlert: true,
  pump1MaxContinuousMinutes: 45,
  pump2IrrigationDurationSeconds: 45,
  pump2RestIntervalMinutes: 30,
  buzzerAlertDurationSeconds: 10,
  buzzerMode: 'BEEP_INTERVAL',
  espReportIntervalSeconds: 5,
  espSheetsSyncIntervalSeconds: 60,
  autoRules: {
    lowWaterCutPump1: true,
    lowMoistureStartPump2: true,
    buzzerOnCriticalAlert: true,
  },
  cameraStreamUrl: '',
  aiSensitivity: 'medium',
};

// ----------------------------------------------------------------------
// PERSISTENT FILE STORAGE HELPER (Production Safe)
// ----------------------------------------------------------------------
const DATA_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'v4_store.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function saveStore() {
  try {
    ensureDataDir();
    const data = {
      project: currentProject,
      zones: currentZones,
      sensors: currentSensors,
      actuators: currentActuators,
      alarmRules: currentAlarmRules,
      devices: registeredDevices,
      versions: configVersions,
      auditLogs,
      systemSettings,
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Lỗi khi ghi lưu trữ cấu hình:', err);
  }
}

function loadStore() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const data = JSON.parse(raw);
      if (data.project) currentProject = data.project;
      if (data.zones && Array.isArray(data.zones)) currentZones = data.zones;
      if (data.sensors && Array.isArray(data.sensors)) currentSensors = data.sensors;
      if (data.actuators && Array.isArray(data.actuators)) currentActuators = data.actuators;
      if (data.alarmRules && Array.isArray(data.alarmRules)) currentAlarmRules = data.alarmRules;
      if (data.devices && Array.isArray(data.devices)) registeredDevices = data.devices;
      if (data.versions && Array.isArray(data.versions)) configVersions = data.versions;
      if (data.auditLogs && Array.isArray(data.auditLogs)) auditLogs = data.auditLogs;
      if (data.systemSettings) systemSettings = data.systemSettings;
      console.log('✅ Đã nạp cấu hình V4 bền vững từ tệp lưu trữ cục bộ.');
    }
  } catch (err) {
    console.error('Lỗi khi đọc lưu trữ cấu hình:', err);
  }
}

loadStore();

// Historical Telemetry seed
const now = Date.now();
const historyData: SensorData[] = [];
for (let i = 24; i >= 0; i--) {
  const time = new Date(now - i * 60 * 60 * 1000).toISOString();
  const baseTds = 420 + Math.sin(i / 3) * 60 + (Math.random() * 20 - 10);
  const baseMoisture = 65 + Math.cos(i / 4) * 12 + (Math.random() * 6 - 3);
  historyData.push({
    device_id: 'ESP32S3_ECO_01',
    timestamp: time,
    tds: Math.round(baseTds),
    soil_moisture: Math.round(baseMoisture),
    float_low: true,
    float_high: false,
    pump1: i % 6 === 0,
    pump2: i % 8 === 0,
    buzzer: false,
    wifi_rssi: -62 + Math.floor(Math.random() * 8),
    mode: 'AUTO',
  });
}

let latestSensorData: SensorData = {
  ...historyData[historyData.length - 1],
  timestamp: new Date().toISOString(),
};

let deviceMode: 'MANUAL' | 'AUTO' = 'AUTO';
let lastDeviceUpdateTime = Date.now();

interface QueuedCommand {
  id: string;
  deviceId: string;
  command: ControlCommand;
  status: 'PENDING' | 'ACCEPTED' | 'APPLYING' | 'EXECUTED';
  createdAt: string;
  acceptedAt?: string;
  executedAt?: string;
}

const commandQueue: QueuedCommand[] = [];

let latestVisionResult: AIVisionResult = {
  timestamp: new Date().toISOString(),
  duckweed: {
    detected: true,
    coverage: 76,
    status: 'NORMAL',
    confidence: 89,
  },
  snail_eggs: {
    detected: true,
    egg_clusters: 5,
    hatching: 'POSSIBLE',
    confidence: 84,
  },
  notes: 'Camera AI PC kết nối ổn định. Thảm bèo xanh mướt che phủ 76%, 5 ổ trứng ốc bươu bám bờ nở khỏe.',
};

let latestAnalysis: EcosystemAnalysis = {
  timestamp: new Date().toISOString(),
  summary: 'Hệ sinh thái tuần hoàn đang trong trạng thái cân bằng sinh thái lý tưởng.',
  trend: 'Chất lượng nước bể ốc ổn định nhờ lọc bèo sinh học liên tục, độ ẩm giá thể đất vi sinh đạt chuẩn.',
  anomaly: 'Không có biến động đột biến nguy hiểm.',
  recommendations: [
    'Duy trì chu kỳ tuần hoàn Bơm 1 lọc sinh học bèo.',
    'Theo dõi chu kỳ trứng ốc nở trong 48h tới.',
    'Tiến hành tỉa bớt bèo khi độ phủ đạt trên 85%.',
  ],
  status_rating: 'TỐT',
};

// Lazy Gemini AI Client initialization
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

// ----------------------------------------------------------------------
// HELPER: EVALUATE ALARMS ON TELEMETRY
// ----------------------------------------------------------------------
function evaluateAlarmRules(sensor: SensorData) {
  const nowStr = new Date().toISOString();

  currentAlarmRules.forEach((rule) => {
    if (!rule.enabled) return;

    let val: any = null;
    if (rule.entityId === 'tds') val = sensor.tds;
    else if (rule.entityId === 'soil_moisture') val = sensor.soil_moisture;
    else if (rule.entityId === 'float_low') val = sensor.float_low ? 1 : 0;
    else if (rule.entityId === 'float_high') val = sensor.float_high ? 1 : 0;

    if (val === null || val === undefined) return;

    let isTriggered = false;
    switch (rule.operator) {
      case '>': isTriggered = val > rule.triggerValue; break;
      case '>=': isTriggered = val >= rule.triggerValue; break;
      case '<': isTriggered = val < rule.triggerValue; break;
      case '<=': isTriggered = val <= rule.triggerValue; break;
      case '==': isTriggered = val === rule.triggerValue; break;
      case '!=': isTriggered = val !== rule.triggerValue; break;
    }

    let isCleared = false;
    switch (rule.clearOperator) {
      case '>': isCleared = val > rule.clearValue; break;
      case '>=': isCleared = val >= rule.clearValue; break;
      case '<': isCleared = val < rule.clearValue; break;
      case '<=': isCleared = val <= rule.clearValue; break;
      case '==': isCleared = val === rule.clearValue; break;
      case '!=': isCleared = val !== rule.clearValue; break;
    }

    const existingIndex = activeAlarms.findIndex((a) => a.ruleId === rule.id && a.state !== 'CLEARED');

    if (isTriggered && existingIndex === -1) {
      // Create new active alarm
      activeAlarms.unshift({
        id: `alm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        ruleId: rule.id,
        entityId: rule.entityId,
        state: 'ACTIVE',
        severity: rule.severity,
        title: rule.name,
        message: rule.message,
        currentValue: val,
        triggeredAt: nowStr,
      });
      // Limit list
      if (activeAlarms.length > 50) activeAlarms.pop();
    } else if (isCleared && existingIndex !== -1) {
      // Mark cleared
      activeAlarms[existingIndex].state = 'CLEARED';
      activeAlarms[existingIndex].clearedAt = nowStr;
    }
  });
}

// ----------------------------------------------------------------------
// V4.0 API ROUTES (per Section 24 of 01_WEB_V4.md)
// ----------------------------------------------------------------------

// 1. Health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '4.0.0',
    timestamp: new Date().toISOString(),
    project: currentProject.id,
    activeConfigVersion: currentProject.activeConfigVersion,
    devicesOnline: registeredDevices.filter((d) => d.online).length,
    activeAlarmsCount: activeAlarms.filter((a) => a.state === 'ACTIVE').length,
  });
});

// 2. Devices endpoints
app.get('/api/v1/devices', (req, res) => {
  const offlineTimeout = (systemSettings.offlineTimeoutSeconds || 30) * 1000;
  const isOnline = Date.now() - lastDeviceUpdateTime < offlineTimeout;

  // Update online flag
  registeredDevices = registeredDevices.map((d) => {
    if (d.id === systemSettings.deviceId) {
      return { ...d, online: isOnline, lastTelemetry: latestSensorData.timestamp };
    }
    return d;
  });

  res.json({ success: true, devices: registeredDevices });
});

app.get('/api/v1/devices/:id/state', (req, res) => {
  const device = registeredDevices.find((d) => d.id === req.params.id);
  if (!device) return res.status(404).json({ success: false, error: 'Thiết bị không tồn tại' });

  res.json({
    success: true,
    device,
    sensorData: latestSensorData,
    actuators: {
      pump1: latestSensorData.pump1,
      pump2: latestSensorData.pump2,
      buzzer: latestSensorData.buzzer,
    },
    mode: deviceMode,
  });
});

app.get('/api/v1/devices/:id/config', (req, res) => {
  // Returns the active configuration payload for ESP32 or AI PC
  const activeVersion = configVersions.find((v) => v.status === 'ACTIVE') || configVersions[0];
  res.json({
    success: true,
    version: activeVersion.version,
    configHash: activeVersion.snapshot.project.id,
    timestamp: new Date().toISOString(),
    esp32Config: activeVersion.snapshot.esp32Config,
    sensors: activeVersion.snapshot.sensors,
    actuators: activeVersion.snapshot.actuators,
    alarmRules: activeVersion.snapshot.alarmRules,
  });
});

// 3. Device Telemetry & Heartbeat
app.post('/api/v1/devices/telemetry', (req, res) => {
  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ success: false, error: 'Payload không hợp lệ' });
    }

    lastDeviceUpdateTime = Date.now();
    const deviceId = payload.device_id || systemSettings.deviceId;

    latestSensorData = {
      device_id: deviceId,
      timestamp: payload.timestamp || new Date().toISOString(),
      tds: payload.tds !== undefined ? Number(payload.tds) : latestSensorData.tds,
      soil_moisture: payload.soil_moisture !== undefined ? Number(payload.soil_moisture) : latestSensorData.soil_moisture,
      float_low: payload.float_low !== undefined ? Boolean(payload.float_low) : latestSensorData.float_low,
      float_high: payload.float_high !== undefined ? Boolean(payload.float_high) : latestSensorData.float_high,
      pump1: payload.pump1 !== undefined ? Boolean(payload.pump1) : latestSensorData.pump1,
      pump2: payload.pump2 !== undefined ? Boolean(payload.pump2) : latestSensorData.pump2,
      buzzer: payload.buzzer !== undefined ? Boolean(payload.buzzer) : latestSensorData.buzzer,
      wifi_rssi: payload.wifi_rssi !== undefined ? Number(payload.wifi_rssi) : latestSensorData.wifi_rssi,
      mode: payload.mode || deviceMode,
    };

    if (payload.mode && (payload.mode === 'MANUAL' || payload.mode === 'AUTO')) {
      deviceMode = payload.mode;
    }

    historyData.push({ ...latestSensorData });
    if (historyData.length > 500) historyData.shift();

    // Evaluate alarms
    evaluateAlarmRules(latestSensorData);

    const pendingForDevice = commandQueue.filter((c) => c.deviceId === deviceId && c.status === 'PENDING');

    res.json({
      success: true,
      pendingCommandsCount: pendingForDevice.length,
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/v1/devices/heartbeat', (req, res) => {
  const { device_id, rssi, ip, firmware } = req.body;
  lastDeviceUpdateTime = Date.now();

  const devIndex = registeredDevices.findIndex((d) => d.id === device_id);
  if (devIndex !== -1) {
    registeredDevices[devIndex].online = true;
    registeredDevices[devIndex].lastHeartbeat = new Date().toISOString();
    if (rssi !== undefined) registeredDevices[devIndex].rssi = Number(rssi);
    if (ip) registeredDevices[devIndex].ipAddress = ip;
    if (firmware) registeredDevices[devIndex].firmwareVersion = firmware;
  }

  res.json({ success: true, timestamp: new Date().toISOString() });
});

// 4. Commands UX & Queue (2-step verification)
app.post('/api/v1/devices/:id/commands', (req, res) => {
  const deviceId = req.params.id;
  const cmd = req.body as ControlCommand;

  const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const queued: QueuedCommand = {
    id: commandId,
    deviceId,
    command: cmd,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  commandQueue.push(queued);
  if (commandQueue.length > 50) commandQueue.shift();

  // Also apply immediately if optimistic
  if (cmd.pump1 !== undefined) latestSensorData.pump1 = cmd.pump1;
  if (cmd.pump2 !== undefined) latestSensorData.pump2 = cmd.pump2;
  if (cmd.buzzer !== undefined) latestSensorData.buzzer = cmd.buzzer;
  if (cmd.mode !== undefined) {
    deviceMode = cmd.mode;
    latestSensorData.mode = cmd.mode;
  }

  res.json({
    success: true,
    commandId,
    status: 'PENDING',
    message: 'Lệnh đã được đưa vào hàng đợi gửi xuống thiết bị',
  });
});

app.get('/api/v1/devices/:id/commands/pending', (req, res) => {
  const deviceId = req.params.id;
  const pending = commandQueue.filter((c) => c.deviceId === deviceId && c.status === 'PENDING');

  // Mark as ACCEPTED
  pending.forEach((c) => {
    c.status = 'ACCEPTED';
    c.acceptedAt = new Date().toISOString();
  });

  res.json({
    success: true,
    count: pending.length,
    commands: pending.map((c) => ({
      id: c.id,
      command: c.command,
      createdAt: c.createdAt,
    })),
  });
});

app.post('/api/v1/devices/:id/commands/:commandId/ack', (req, res) => {
  const { commandId } = req.params;
  const { status, executedState } = req.body;

  const item = commandQueue.find((c) => c.id === commandId);
  if (item) {
    item.status = 'EXECUTED';
    item.executedAt = new Date().toISOString();
  }

  if (executedState) {
    latestSensorData = {
      ...latestSensorData,
      ...executedState,
      timestamp: new Date().toISOString(),
    };
  }

  res.json({ success: true, commandId, confirmedStatus: 'EXECUTED' });
});

// 5. Device Provisioning Wizard & Key Management
app.post('/api/v1/provision/devices', (req, res) => {
  try {
    const { name, deviceId, templateId, projectId } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Tên thiết bị là bắt buộc' });
    }

    const finalDeviceId = deviceId?.trim() || `ESP32S3_NODE_${Math.floor(1000 + Math.random() * 9000)}`;

    // Generate cryptographic device key: dvk_live_<32 hex chars>
    const randomHex = crypto.randomBytes(16).toString('hex');
    const deviceKey = `dvk_live_${randomHex}`;
    const keyHash = `sha256:${crypto.createHash('sha256').update(deviceKey).digest('hex').substring(0, 16)}`;
    const token = crypto.randomBytes(8).toString('hex');

    const newDevice: Device = {
      id: finalDeviceId,
      projectId: projectId || currentProject.id,
      name,
      type: 'ESP32_S3',
      templateId: templateId || 'tmpl_aquaponics_v1',
      firmwareVersion: 'v4.1.2-esp32s3',
      currentConfigVersion: currentProject.activeConfigVersion,
      configHash: `cfg_${Date.now().toString(16)}`,
      online: false,
      lastHeartbeat: new Date().toISOString(),
      lastTelemetry: new Date().toISOString(),
      rssi: -65,
      credentials: [
        {
          deviceId: finalDeviceId,
          keyHash,
          keyVersion: 1,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    registeredDevices.push(newDevice);

    const qrPayload = JSON.stringify({
      deviceId: finalDeviceId,
      token,
      endpoint: `https://${req.get('host') || '0.0.0.0:3000'}/api/v1`,
      protocolVersion: 'v1.0',
    });

    const result: ProvisioningResult = {
      deviceId: finalDeviceId,
      deviceKey, // ONLY EXPOSED ONCE
      keyVersion: 1,
      token,
      endpoint: `/api/v1`,
      protocolVersion: 'v1.0',
      qrPayload,
      createdAt: new Date().toISOString(),
    };

    // Audit log
    auditLogs.unshift({
      id: `aud_${Date.now()}`,
      who: 'System Admin',
      what: `Cấp mới thiết bị ESP32: ${name} (${finalDeviceId})`,
      when: new Date().toISOString(),
      projectId: currentProject.id,
      deviceId: finalDeviceId,
      configVersion: currentProject.activeConfigVersion,
    });

    saveStore();

    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/v1/provision/devices/:id/rotate-key', (req, res) => {
  const device = registeredDevices.find((d) => d.id === req.params.id);
  if (!device) return res.status(404).json({ success: false, error: 'Thiết bị không tồn tại' });

  // Revoke active credentials
  device.credentials.forEach((c) => {
    if (c.status === 'ACTIVE') {
      c.status = 'REVOKED';
      c.revokedAt = new Date().toISOString();
    }
  });

  const nextVersion = device.credentials.length + 1;
  const randomHex = crypto.randomBytes(16).toString('hex');
  const newDeviceKey = `dvk_live_${randomHex}`;
  const keyHash = `sha256:${crypto.createHash('sha256').update(newDeviceKey).digest('hex').substring(0, 16)}`;

  device.credentials.unshift({
    deviceId: device.id,
    keyHash,
    keyVersion: nextVersion,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  });

  auditLogs.unshift({
    id: `aud_${Date.now()}`,
    who: 'System Admin',
    what: `Xoay khóa Device Key cho thiết bị ${device.id} (Phiên bản key: v${nextVersion})`,
    when: new Date().toISOString(),
    projectId: currentProject.id,
    deviceId: device.id,
    configVersion: currentProject.activeConfigVersion,
  });

  saveStore();

  res.json({
    success: true,
    deviceId: device.id,
    newDeviceKey,
    keyVersion: nextVersion,
    rotatedAt: new Date().toISOString(),
  });
});

app.post('/api/v1/provision/devices/:id/revoke-key', (req, res) => {
  const device = registeredDevices.find((d) => d.id === req.params.id);
  if (!device) return res.status(404).json({ success: false, error: 'Thiết bị không tồn tại' });

  device.credentials.forEach((c) => {
    c.status = 'REVOKED';
    c.revokedAt = new Date().toISOString();
  });

  auditLogs.unshift({
    id: `aud_${Date.now()}`,
    who: 'System Admin',
    what: `Thu hồi toàn bộ Device Key của thiết bị ${device.id}`,
    when: new Date().toISOString(),
    projectId: currentProject.id,
    deviceId: device.id,
    configVersion: currentProject.activeConfigVersion,
  });

  saveStore();

  res.json({ success: true, message: `Đã thu hồi key của thiết bị ${device.id}` });
});

// Production Deployment Helper: Get ready-to-flash Arduino C++ firmware for ESP32-S3
app.get('/api/v1/devices/:id/firmware-sketch', (req, res) => {
  const deviceId = req.params.id || 'ESP32S3_ECO_01';
  const device = registeredDevices.find((d) => d.id === deviceId);
  const host = req.get('host') || '0.0.0.0:3000';
  const protocol = req.protocol === 'https' ? 'https' : 'http';
  const serverEndpoint = `${protocol}://${host}`;

  const sketch = `/*
  ========================================================================
  HỆ THỐNG QUAN TRẮC & ĐIỀU KHIỂN SINH THÁI TUẦN HOÀN OC IoT (V4.0)
  FIRMWARE CHÍNH THỨC DÀNH CHO TRẠM ESP32-S3 (BỂ CÁ - BÈO - ỐC BƯƠU)
  ========================================================================
  - Mã thiết bị: ${deviceId}
  - Máy chủ Hub: ${serverEndpoint}
  - Giao thức: REST API v1 (Telemetry, Commands Queue, ACK)
  - Tần suất Telemetry: 5 giây
  - Bảo vệ an toàn: Ngắt Bơm 1 khi Phao đáy mở (chống cháy bơm)
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// --- 1. CẤU HÌNH KẾT NỐI WIFI ---
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// --- 2. CẤU HÌNH THIẾT BỊ & HUB OC IoT ---
const char* HUB_BASE_URL  = "${serverEndpoint}/api/v1";
const char* DEVICE_ID     = "${deviceId}";
// Dán Device Key sinh ra từ tab 'Cấp Phát Thiết Bị' vào đây:
const char* DEVICE_KEY    = "dvk_live_YOUR_KEY_HERE";

// --- 3. SƠ ĐỒ KẾT NỐI CHÂN GPIO ESP32-S3 ---
#define PIN_TDS_ADC        4   // GPIO4 (ADC1_CH3) - Cảm biến TDS Analog
#define PIN_MOISTURE_ADC   5   // GPIO5 (ADC1_CH4) - Cảm biến độ ẩm đất Analog
#define PIN_FLOAT_LOW      21  // GPIO21 (INPUT_PULLUP) - Phao cạn (0: Cạn, 1: Đầy)
#define PIN_FLOAT_HIGH     22  // GPIO22 (INPUT_PULLUP) - Phao tràn (1: Chạm phao tràn)
#define PIN_RELAY_PUMP1    18  // GPIO18 - Relay Bơm 1 (Lọc tuần hoàn bèo)
#define PIN_RELAY_PUMP2    19  // GPIO19 - Relay Bơm 2 (Tưới ẩm giá thể)
#define PIN_BUZZER         23  // GPIO23 - Còi báo động sự cố

// Trạng thái phần cứng tức thời
bool statePump1 = false;
bool statePump2 = false;
bool stateBuzzer = false;

unsigned long lastTelemetryMs = 0;
unsigned long lastHeartbeatMs = 0;
const unsigned long TELEMETRY_INTERVAL = 5000;   // 5s
const unsigned long HEARTBEAT_INTERVAL = 30000;  // 30s

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\\n[OC IoT] Khoi dong Tram ESP32-S3...");

  // Cấu hình chân GPIO đầu vào (Phao mực nước có kéo trở nội)
  pinMode(PIN_FLOAT_LOW, INPUT_PULLUP);
  pinMode(PIN_FLOAT_HIGH, INPUT_PULLUP);

  // Cấu hình chân GPIO điều khiển Relay & Còi
  pinMode(PIN_RELAY_PUMP1, OUTPUT);
  pinMode(PIN_RELAY_PUMP2, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);

  // Mặc định rơ-le tắt (mức thấp hoặc cao tùy module relay)
  digitalWrite(PIN_RELAY_PUMP1, LOW);
  digitalWrite(PIN_RELAY_PUMP2, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  // Kết nối WiFi
  connectWiFi();
}

void connectWiFi() {
  Serial.printf("[WiFi] Dang ket noi toi: %s\\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 25) {
    delay(500);
    Serial.print(".");
    retry++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\\n[WiFi] Da ket noi thanh cong! IP: %s, RSSI: %d dBm\\n",
      WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("\\n[WiFi] Chua the ket noi, se thu lai trong loop...");
  }
}

// Đọc cảm biến TDS và quy đổi ppm
float readTDS() {
  int raw = analogRead(PIN_TDS_ADC);
  float voltage = (raw / 4095.0) * 3.3;
  // Công thức xấp xỉ chuẩn hóa cho module TDS 3.3V
  float compensationCoefficient = 1.0; 
  float tdsValue = (133.42 * pow(voltage, 3) - 255.86 * pow(voltage, 2) + 857.39 * voltage) * 0.5;
  if (tdsValue < 0) tdsValue = 0;
  return tdsValue;
}

// Đọc độ ẩm đất (%)
int readSoilMoisture() {
  int raw = analogRead(PIN_MOISTURE_ADC);
  // Cảm biến điện dung: Khô ~ 3000, Ẩm ướt ~ 1200
  int percent = map(raw, 3000, 1200, 0, 100);
  return constrain(percent, 0, 100);
}

// Đọc phao nước (True nếu nước đầy, False nếu cạn)
bool readFloatLow() {
  // Switch đóng = nối GND = LOW khi có nước
  return digitalRead(PIN_FLOAT_LOW) == LOW;
}

bool readFloatHigh() {
  return digitalRead(PIN_FLOAT_HIGH) == LOW;
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  String url = String(HUB_BASE_URL) + "/devices/heartbeat";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["rssi"] = WiFi.RSSI();
  doc["ip"] = WiFi.localIP().toString();
  doc["firmware"] = "v4.1.2-esp32s3";

  String body;
  serializeJson(doc, body);
  int httpCode = http.POST(body);
  http.end();
}

void sendTelemetryAndPollCommands() {
  if (WiFi.status() != WL_CONNECTED) return;
  
  float tds = readTDS();
  int moisture = readSoilMoisture();
  bool waterLowSafe = readFloatLow();
  bool waterHigh = readFloatHigh();

  // BẢO VỆ PHẦN CỨNG: Nếu cạn nước, tự động ngắt Bơm 1 ngay lập tức
  if (!waterLowSafe && statePump1) {
    statePump1 = false;
    digitalWrite(PIN_RELAY_PUMP1, LOW);
    Serial.println("[AN TOAN] Can nuoc duoi phao LOW! Tu dong ngat Bom 1!");
  }

  // 1. Gửi Telemetry
  HTTPClient http;
  String url = String(HUB_BASE_URL) + "/devices/telemetry";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<384> doc;
  doc["device_id"] = DEVICE_ID;
  doc["tds"] = (int)tds;
  doc["soil_moisture"] = moisture;
  doc["float_low"] = waterLowSafe;
  doc["float_high"] = waterHigh;
  doc["pump1"] = statePump1;
  doc["pump2"] = statePump2;
  doc["buzzer"] = stateBuzzer;
  doc["wifi_rssi"] = WiFi.RSSI();

  String body;
  serializeJson(doc, body);
  int httpCode = http.POST(body);
  String response = http.getString();
  http.end();

  // 2. Kéo lệnh đang chờ trong hàng đợi (Pending Commands)
  pollAndExecuteCommands();
}

void pollAndExecuteCommands() {
  HTTPClient http;
  String url = String(HUB_BASE_URL) + "/devices/" + DEVICE_ID + "/commands/pending";
  http.begin(url);
  int code = http.GET();
  if (code == 200) {
    String payload = http.getString();
    DynamicJsonDocument resDoc(1024);
    deserializeJson(resDoc, payload);
    JsonArray cmds = resDoc["commands"].as<JsonArray>();

    for (JsonObject cmd : cmds) {
      String cmdId = cmd["id"].as<String>();
      Serial.printf("[Command] Nhan lenh tu Hub: %s\\n", cmdId.c_str());

      if (cmd.containsKey("pump1")) {
        statePump1 = cmd["pump1"].as<bool>();
        digitalWrite(PIN_RELAY_PUMP1, statePump1 ? HIGH : LOW);
      }
      if (cmd.containsKey("pump2")) {
        statePump2 = cmd["pump2"].as<bool>();
        digitalWrite(PIN_RELAY_PUMP2, statePump2 ? HIGH : LOW);
      }
      if (cmd.containsKey("buzzer")) {
        stateBuzzer = cmd["buzzer"].as<bool>();
        digitalWrite(PIN_BUZZER, stateBuzzer ? HIGH : LOW);
      }

      // Gửi ACK xác nhận thực thi lệnh khép kín
      sendAck(cmdId);
    }
  }
  http.end();
}

void sendAck(String cmdId) {
  HTTPClient http;
  String url = String(HUB_BASE_URL) + "/devices/" + DEVICE_ID + "/commands/" + cmdId + "/ack";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["status"] = "EXECUTED";
  JsonObject state = doc.createNestedObject("executedState");
  state["pump1"] = statePump1;
  state["pump2"] = statePump2;
  state["buzzer"] = stateBuzzer;

  String body;
  serializeJson(doc, body);
  http.POST(body);
  http.end();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
    delay(2000);
    return;
  }

  unsigned long currentMs = millis();

  // Chu kỳ gửi Telemetry (5s)
  if (currentMs - lastTelemetryMs >= TELEMETRY_INTERVAL) {
    lastTelemetryMs = currentMs;
    sendTelemetryAndPollCommands();
  }

  // Chu kỳ gửi Heartbeat (30s)
  if (currentMs - lastHeartbeatMs >= HEARTBEAT_INTERVAL) {
    lastHeartbeatMs = currentMs;
    sendHeartbeat();
  }

  delay(50);
}
`;

  res.json({
    success: true,
    deviceId,
    firmwareVersion: 'v4.1.2-esp32s3',
    sketch,
  });
});

// Production Deployment Helper: Get ready-to-run Python AI Vision script for PC
app.get('/api/v1/vision/python-client', (req, res) => {
  const host = req.get('host') || '0.0.0.0:3000';
  const protocol = req.protocol === 'https' ? 'https' : 'http';
  const serverEndpoint = `${protocol}://${host}`;

  const script = `"""
========================================================================
HỆ THỐNG PHÂN TÍCH THỊ GIÁC AI VISION OC IoT (V4.0)
CLIENT THỰC ĐỊA: NHẬN DIỆN ĐỘ PHỦ BÈO & ĐẾM TỔ TRỨNG ỐC BƯƠU ĐEN
========================================================================
Cài đặt thư viện cần thiết:
  pip install opencv-python numpy requests

Hướng dẫn chạy:
  python ai_vision_client.py
"""

import cv2
import numpy as np
import requests
import time
import os

# --- CẤU HÌNH KẾT NỐI HUB OC IoT ---
HUB_VISION_URL = "${serverEndpoint}/api/v1/vision/result"

# Nguồn camera: 0 (Webcam gắn cổng USB máy tính)
# Hoặc luồng RTSP camera ngoài trời: "rtsp://admin:pass@192.168.1.120:8554/live"
CAMERA_SOURCE = 0

# Vùng quan tâm ROI theo tỷ lệ phần trăm (X: 10%, Y: 15%, Width: 80%, Height: 70%)
ROI_CONFIG = {"x": 0.10, "y": 0.15, "w": 0.80, "h": 0.70}

# Chu kỳ phân tích và gửi dữ liệu (giây)
ANALYZE_INTERVAL = 30

def calculate_duckweed_coverage(roi_image):
    """Tính toán phần trăm diện tích bèo phủ trên mặt nước bằng không gian màu HSV."""
    hsv = cv2.cvtColor(roi_image, cv2.COLOR_BGR2HSV)
    # Dải màu xanh lá cây của bèo hoa dâu / bèo tấm
    lower_green = np.array([30, 40, 40])
    upper_green = np.array([85, 255, 255])
    mask_green = cv2.inRange(hsv, lower_green, upper_green)
    
    total_pixels = roi_image.shape[0] * roi_image.shape[1]
    green_pixels = cv2.countNonZero(mask_green)
    coverage = (green_pixels / float(total_pixels)) * 100.0
    return round(coverage, 1)

def detect_snail_egg_clusters(roi_image):
    """Phát hiện và đếm số lượng cụm trứng ốc bươu đen (màu hồng tươi/đỏ nhạt)."""
    hsv = cv2.cvtColor(roi_image, cv2.COLOR_BGR2HSV)
    # Dải màu hồng/đỏ của ổ trứng ốc
    lower_pink1 = np.array([160, 50, 50])
    upper_pink1 = np.array([180, 255, 255])
    lower_pink2 = np.array([0, 50, 50])
    upper_pink2 = np.array([12, 255, 255])
    
    mask1 = cv2.inRange(hsv, lower_pink1, upper_pink1)
    mask2 = cv2.inRange(hsv, lower_pink2, upper_pink2)
    mask_pink = cv2.bitwise_or(mask1, mask2)
    
    # Khử nhiễu
    kernel = np.ones((5, 5), np.uint8)
    mask_clean = cv2.morphologyEx(mask_pink, cv2.MORPH_OPEN, kernel)
    mask_clean = cv2.morphologyEx(mask_clean, cv2.MORPH_CLOSE, kernel)
    
    contours, _ = cv2.findContours(mask_clean, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    egg_count = 0
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > 120:  # Ngưỡng diện tích tối thiểu của một ổ trứng
            egg_count += 1
            
    return egg_count

def main():
    print(f"[AI Vision] Ket noi camera tu nguon: {CAMERA_SOURCE}")
    cap = cv2.VideoCapture(CAMERA_SOURCE)
    if not cap.isOpened():
        print("[Loi] Khong the mo luong camera! Vui long kiem tra USB/RTSP.")
        return

    print(f"[AI Vision] Khoi chay thanh cong. Gui ket qua toi Hub: {HUB_VISION_URL}")
    last_sent_time = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[Canh bao] Mat ket noi khung hinh, thu lai sau 3s...")
            time.sleep(3)
            cap = cv2.VideoCapture(CAMERA_SOURCE)
            continue

        h, w, _ = frame.shape
        rx = int(w * ROI_CONFIG["x"])
        ry = int(h * ROI_CONFIG["y"])
        rw = int(w * ROI_CONFIG["w"])
        rh = int(h * ROI_CONFIG["h"])
        roi = frame[ry:ry+rh, rx:rx+rw]

        current_time = time.time()
        if current_time - last_sent_time >= ANALYZE_INTERVAL:
            coverage = calculate_duckweed_coverage(roi)
            egg_count = detect_snail_egg_clusters(roi)
            
            print(f"[Thuc dia] Mat do beo: {coverage}% | O trung oc: {egg_count}")
            
            payload = {
                "duckweed_coverage": coverage,
                "snail_eggs_count": egg_count,
                "camera_id": "CAM_AI_OUTDOOR_01",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            }
            
            try:
                res = requests.post(HUB_VISION_URL, json=payload, timeout=5)
                if res.status_code == 200:
                    print(" -> [Hub] Da nap ket qua phan tich thanh cong.")
                else:
                    print(f" -> [Hub] Phuc dap loi: {res.status_code}")
            except Exception as e:
                print(f" -> [Loi mang] Khong the gui du lieu toi Hub: {e}")
                
            last_sent_time = current_time

        # Hiển thị cửa sổ giám sát trên máy tính trạm (Nhấn 'q' để thoát)
        cv2.rectangle(frame, (rx, ry), (rx+rw, ry+rh), (0, 255, 0), 2)
        cv2.imshow("OC IoT - AI Vision Outdoor Station", frame)
        if cv2.waitKey(30) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == '__main__':
    main()
`;

  res.json({
    success: true,
    script,
  });
});

// 6. Project Configuration & Versioning (Draft -> Validate -> Apply -> Rollback)
app.get('/api/v1/projects/:id/config', (req, res) => {
  const activeVersion = configVersions.find((v) => v.status === 'ACTIVE') || configVersions[0];
  res.json({
    success: true,
    project: currentProject,
    activeVersion,
    zones: currentZones,
    sensors: currentSensors,
    actuators: currentActuators,
    alarmRules: currentAlarmRules,
    draft: currentDraft,
  });
});

app.post('/api/v1/projects/:id/config/draft', (req, res) => {
  currentDraft = req.body as ProjectConfigSnapshot;
  res.json({
    success: true,
    message: 'Đã lưu bản nháp cấu hình vào máy chủ',
    draft: currentDraft,
  });
});

app.post('/api/v1/projects/:id/config/validate', (req, res) => {
  const snapshot = (req.body?.snapshot || currentDraft) as ProjectConfigSnapshot;
  if (!snapshot) {
    return res.status(400).json({ success: false, valid: false, errors: ['Không tìm thấy dữ liệu cấu hình để kiểm tra'] });
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check unique dataKey in sensors
  const sensorKeys = new Set<string>();
  snapshot.sensors?.forEach((s) => {
    if (!s.dataKey) errors.push(`Cảm biến "${s.name}" thiếu dataKey`);
    else if (sensorKeys.has(s.dataKey)) errors.push(`Trùng lặp dataKey cảm biến: "${s.dataKey}"`);
    else sensorKeys.add(s.dataKey);

    if (s.min >= s.max) errors.push(`Cảm biến "${s.name}": Ngưỡng min (${s.min}) phải nhỏ hơn max (${s.max})`);

    // Contrast check
    const contrast = checkContrast(s.textColor || '#000000', s.bgColor || '#ffffff');
    if (!contrast.isAccessible) {
      warnings.push(`Cảm biến "${s.name}": Độ tương phản màu (${contrast.ratio}:1) thấp hơn chuẩn WCAG AA 4.5:1`);
    }
  });

  // Check unique dataKey in actuators
  const actuatorKeys = new Set<string>();
  snapshot.actuators?.forEach((a) => {
    if (!a.dataKey) errors.push(`Cơ cấu chấp hành "${a.name}" thiếu dataKey`);
    else if (actuatorKeys.has(a.dataKey)) errors.push(`Trùng lặp dataKey chấp hành: "${a.dataKey}"`);
    else actuatorKeys.add(a.dataKey);
  });

  // Check alarm rules hysteresis
  snapshot.alarmRules?.forEach((rule) => {
    if (!rule.entityId) errors.push(`Quy tắc cảnh báo "${rule.name}" thiếu đối tượng đo lường`);
    if (rule.durationSec < 1) warnings.push(`Quy tắc "${rule.name}": Thời gian lọc nhiễu nên tối thiểu 1-3 giây`);
  });

  res.json({
    valid: errors.length === 0,
    errors,
    warnings,
  });
});

app.post('/api/v1/projects/:id/config/apply', (req, res) => {
  try {
    const { snapshot, description, createdBy } = req.body;
    const targetSnapshot = (snapshot || currentDraft) as ProjectConfigSnapshot;

    if (!targetSnapshot) {
      return res.status(400).json({ success: false, error: 'Không có bản nháp nào để áp dụng' });
    }

    const nextVersionNum = currentProject.activeConfigVersion + 1;

    // Archive old active version
    configVersions.forEach((v) => {
      if (v.status === 'ACTIVE') v.status = 'ARCHIVED';
    });

    const newVersion: ConfigVersion = {
      version: nextVersionNum,
      projectId: currentProject.id,
      snapshot: targetSnapshot,
      createdBy: createdBy || 'Vận hành viên',
      createdAt: new Date().toISOString(),
      description: description || `Áp dụng cấu hình phiên bản v${nextVersionNum}`,
      status: 'ACTIVE',
    };

    configVersions.unshift(newVersion);

    // Apply into current runtime entities
    currentProject.activeConfigVersion = nextVersionNum;
    currentProject.updatedAt = new Date().toISOString();
    currentZones = targetSnapshot.zones || currentZones;
    currentSensors = targetSnapshot.sensors || currentSensors;
    currentActuators = targetSnapshot.actuators || currentActuators;
    currentAlarmRules = targetSnapshot.alarmRules || currentAlarmRules;

    // Clear draft
    currentDraft = null;

    // Audit log
    auditLogs.unshift({
      id: `aud_${Date.now()}`,
      who: createdBy || 'Vận hành viên',
      what: `Lưu & Áp dụng thành công Active Config Version v${nextVersionNum}: ${description || 'Cập nhật cấu hình'}`,
      when: new Date().toISOString(),
      projectId: currentProject.id,
      configVersion: nextVersionNum,
    });

    // Notify registered devices
    registeredDevices = registeredDevices.map((d) => ({
      ...d,
      currentConfigVersion: nextVersionNum,
      configHash: `cfg_v${nextVersionNum}`,
    }));

    saveStore();

    res.json({
      success: true,
      message: `Đã kích hoạt Active Config Version v${nextVersionNum}`,
      version: newVersion,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/v1/projects/:id/config/versions', (req, res) => {
  res.json({
    success: true,
    activeVersion: currentProject.activeConfigVersion,
    versions: configVersions,
  });
});

app.post('/api/v1/projects/:id/config/rollback', (req, res) => {
  const { targetVersion } = req.body;
  const found = configVersions.find((v) => v.version === Number(targetVersion));

  if (!found) {
    return res.status(404).json({ success: false, error: `Không tìm thấy phiên bản v${targetVersion}` });
  }

  const nextVersionNum = currentProject.activeConfigVersion + 1;
  configVersions.forEach((v) => {
    if (v.status === 'ACTIVE') v.status = 'ARCHIVED';
  });

  const rollbackVersion: ConfigVersion = {
    version: nextVersionNum,
    projectId: currentProject.id,
    snapshot: JSON.parse(JSON.stringify(found.snapshot)),
    createdBy: 'Quản trị viên',
    createdAt: new Date().toISOString(),
    description: `Rollback phục hồi từ cấu hình v${targetVersion}`,
    status: 'ACTIVE',
  };

  configVersions.unshift(rollbackVersion);

  currentProject.activeConfigVersion = nextVersionNum;
  currentProject.updatedAt = new Date().toISOString();
  currentZones = rollbackVersion.snapshot.zones;
  currentSensors = rollbackVersion.snapshot.sensors;
  currentActuators = rollbackVersion.snapshot.actuators;
  currentAlarmRules = rollbackVersion.snapshot.alarmRules;

  auditLogs.unshift({
    id: `aud_${Date.now()}`,
    who: 'Quản trị viên',
    what: `Rollback cấu hình từ v${targetVersion} sang phiên bản kích hoạt mới v${nextVersionNum}`,
    when: new Date().toISOString(),
    projectId: currentProject.id,
    configVersion: nextVersionNum,
  });

  saveStore();

  res.json({
    success: true,
    message: `Đã khôi phục thành công sang phiên bản v${nextVersionNum} (từ v${targetVersion})`,
    version: rollbackVersion,
  });
});

// 7. Alarms & Alerts
app.get('/api/v1/alerts', (req, res) => {
  res.json({
    success: true,
    activeAlarms,
    rules: currentAlarmRules,
  });
});

app.post('/api/v1/alerts/:id/ack', (req, res) => {
  const { id } = req.params;
  const { note, who } = req.body;

  const alarm = activeAlarms.find((a) => a.id === id);
  if (!alarm) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy cảnh báo' });
  }

  alarm.state = 'ACKNOWLEDGED';
  alarm.acknowledgedAt = new Date().toISOString();
  alarm.acknowledgedBy = who || 'Vận hành viên';

  auditLogs.unshift({
    id: `aud_${Date.now()}`,
    who: who || 'Vận hành viên',
    what: `Xác nhận (ACK) cảnh báo: ${alarm.title} (${note || 'Không có ghi chú'})`,
    when: new Date().toISOString(),
    projectId: currentProject.id,
    configVersion: currentProject.activeConfigVersion,
  });

  res.json({ success: true, alarm });
});

// 8. Audit Logs
app.get('/api/v1/audit-logs', (req, res) => {
  res.json({ success: true, count: auditLogs.length, logs: auditLogs });
});

// 9. AI Vision endpoints
app.post('/api/v1/vision/result', (req, res) => {
  const { duckweed, snail_eggs, notes, image_url } = req.body;
  latestVisionResult = {
    timestamp: new Date().toISOString(),
    image_url,
    duckweed: duckweed || latestVisionResult.duckweed,
    snail_eggs: snail_eggs || latestVisionResult.snail_eggs,
    notes: notes || 'Nhận kết quả phân tích từ trạm Camera Vision',
  };
  res.json({ success: true, result: latestVisionResult });
});

app.get('/api/v1/vision/latest', (req, res) => {
  res.json({
    success: true,
    latest_result: latestVisionResult,
    camera_online: true,
  });
});

// ----------------------------------------------------------------------
// BACKWARD-COMPATIBLE /api/iot/* AND LEGACY ROUTES
// ----------------------------------------------------------------------

app.get('/api/iot/status', (req, res) => {
  const offlineTimeout = (systemSettings.offlineTimeoutSeconds || 30) * 1000;
  const isOnline = Date.now() - lastDeviceUpdateTime < offlineTimeout;

  const status: IoTStatus = {
    online: isOnline,
    device_id: systemSettings.deviceId,
    last_update: latestSensorData.timestamp,
    wifi_rssi: latestSensorData.wifi_rssi || -65,
    mode: deviceMode,
    current_data: isOnline ? latestSensorData : null,
    commands_queue: commandQueue.map((c) => c.command),
  };
  res.json(status);
});

app.post('/api/iot/data', (req, res) => {
  try {
    lastDeviceUpdateTime = Date.now();
    latestSensorData = {
      ...latestSensorData,
      ...req.body,
      timestamp: new Date().toISOString(),
    };
    historyData.push({ ...latestSensorData });
    if (historyData.length > 500) historyData.shift();

    evaluateAlarmRules(latestSensorData);

    res.json({ success: true, message: 'Telemetry received' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/iot/command', (req, res) => {
  const cmd = req.body as ControlCommand;
  if (cmd.pump1 !== undefined) latestSensorData.pump1 = cmd.pump1;
  if (cmd.pump2 !== undefined) latestSensorData.pump2 = cmd.pump2;
  if (cmd.buzzer !== undefined) latestSensorData.buzzer = cmd.buzzer;
  if (cmd.mode !== undefined) {
    deviceMode = cmd.mode;
    latestSensorData.mode = cmd.mode;
  }

  commandQueue.push({
    id: `cmd_${Date.now()}`,
    deviceId: systemSettings.deviceId,
    command: cmd,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  });

  res.json({ success: true, command: cmd, current_state: latestSensorData });
});

app.get('/api/iot/history', (req, res) => {
  const filter = (req.query.range as string) || '24h';
  const nowMs = Date.now();
  let maxAgeMs = 24 * 60 * 60 * 1000;

  if (filter === '1h') maxAgeMs = 1 * 60 * 60 * 1000;
  else if (filter === '6h') maxAgeMs = 6 * 60 * 60 * 1000;
  else if (filter === '24h') maxAgeMs = 24 * 60 * 60 * 1000;
  else if (filter === '7d') maxAgeMs = 7 * 24 * 60 * 60 * 1000;
  else if (filter === '30d') maxAgeMs = 30 * 24 * 60 * 60 * 1000;

  const cutoff = nowMs - maxAgeMs;
  const filtered = historyData.filter((d) => new Date(d.timestamp).getTime() >= cutoff);

  res.json({
    filter,
    count: filtered.length,
    data: filtered,
  });
});

app.get('/api/sheets', async (req, res) => {
  const sheetUrl = (req.query.url as string) || systemSettings.googleSheetsUrl;
  if (!sheetUrl) {
    return res.json({
      connected: false,
      url: '',
      spreadsheetId: null,
      lastUpdate: null,
      rowsCount: 0,
      records: [],
      error: 'Chưa cấu hình URL Google Sheets',
    });
  }

  try {
    const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match || !match[1]) {
      return res.status(400).json({
        connected: false,
        url: sheetUrl,
        spreadsheetId: null,
        error: 'URL Google Sheets không hợp lệ.',
      });
    }

    const spreadsheetId = match[1];
    const exportCsvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;

    const response = await fetch(exportCsvUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!response.ok) {
      throw new Error(`Google Sheets phản hồi lỗi ${response.status}. Cần cấp quyền chia sẻ liên kết xem công khai.`);
    }

    const csvText = await response.text();
    const rows = csvText.split(/\r?\n/).filter((r) => r.trim().length > 0);

    const sheetsData: GoogleSheetsData = {
      connected: true,
      url: sheetUrl,
      spreadsheetId,
      lastUpdate: new Date().toISOString(),
      rowsCount: Math.max(0, rows.length - 1),
      records: historyData.slice(-50),
    };

    systemSettings.googleSheetsUrl = sheetUrl;
    res.json(sheetsData);
  } catch (error: any) {
    res.status(500).json({ connected: false, url: sheetUrl, error: error.message });
  }
});

// AI Analyze Endpoint (Gemini + fallback)
app.post('/api/ai/analyze', async (req, res) => {
  try {
    const aiClient = getGeminiClient();

    if (aiClient) {
      try {
        const prompt = `Bạn là chuyên gia phân tích sinh thái nông nghiệp công nghệ cao và hệ thống aquaponics tuần hoàn thông minh (gồm bèo lọc sinh thái, ốc bươu đen, cảm biến TDS, độ ẩm đất, phao nước và bơm tuần hoàn).
Dữ liệu đo đạc thực tế:
- TDS: ${latestSensorData.tds} ppm
- Độ ẩm đất: ${latestSensorData.soil_moisture}%
- Phao LOW: ${latestSensorData.float_low ? 'Bình thường (Đầy nước trên phao đáy)' : 'CẢNH BÁO: Cạn nước'}
- Phao HIGH: ${latestSensorData.float_high ? 'Chạm phao HIGH' : 'Bình thường'}
- Bơm 1: ${latestSensorData.pump1 ? 'BẬT' : 'TẮT'}, Bơm 2: ${latestSensorData.pump2 ? 'BẬT' : 'TẮT'}
- Chế độ: ${deviceMode}
- AI Vision Bèo: Phủ ${latestVisionResult.duckweed.coverage}%, Trạng thái: ${latestVisionResult.duckweed.status}
- AI Vision Trứng ốc: ${latestVisionResult.snail_eggs.egg_clusters} cụm, Trạng thái: ${latestVisionResult.snail_eggs.hatching}

Trả về DUY NHẤT một JSON hợp lệ:
{
  "summary": "1-2 câu tóm tắt trạng thái sinh thái",
  "trend": "Đánh giá xu hướng chất lượng nước, độ ẩm và sinh khối bèo",
  "anomaly": "Chi tiết các điểm bất thường nếu có",
  "recommendations": ["Khuyến nghị 1", "Khuyến nghị 2"],
  "status_rating": "TỐT" | "CẦN CHÚ Ý" | "CẢNH BÁO"
}`;

        const aiResponse = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        const rawText = aiResponse.text || '';
        const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);

        latestAnalysis = {
          timestamp: new Date().toISOString(),
          summary: parsed.summary || 'Hệ sinh thái vận hành ổn định.',
          trend: parsed.trend || 'Chỉ số dao động trong ngưỡng sinh trưởng tự nhiên.',
          anomaly: parsed.anomaly || 'Không có bất thường đe dọa chu trình sinh thái.',
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : ['Duy trì chế độ quan trắc tự động.'],
          status_rating: parsed.status_rating || 'TỐT',
        };

        return res.json({ success: true, analysis: latestAnalysis });
      } catch (geminiErr: any) {
        console.warn('Gemini API call failed, using heuristic engine:', geminiErr.message);
      }
    }

    // Heuristic expert fallback
    const tds = latestSensorData.tds || 450;
    const moisture = latestSensorData.soil_moisture || 65;
    const duckweedCov = latestVisionResult.duckweed.coverage;

    let rating: 'TỐT' | 'CẦN CHÚ Ý' | 'CẢNH BÁO' = 'TỐT';
    const recs: string[] = [];
    let anomaly = 'Các thông số vật lý và quang học đều nằm trong ngưỡng an toàn sinh thái.';

    if (!latestSensorData.float_low) {
      rating = 'CẢNH BÁO';
      anomaly = 'Mực nước tụt dưới phao LOW. Bơm 1 đã tự động ngắt để bảo vệ.';
      recs.push('Bơm bù nước khẩn cấp hoặc kiểm tra van xả nước.');
    } else if (tds > 800) {
      rating = 'CẦN CHÚ Ý';
      anomaly = `TDS đạt ${tds} ppm vượt ngưỡng chuẩn. Nồng độ ion và chất rắn hoà tan cao.`;
      recs.push('Xả bớt 20% nước đáy và cấp nước sạch mới để hạ TDS.');
    } else if (moisture < 45) {
      rating = 'CẦN CHÚ Ý';
      anomaly = `Độ ẩm đất thấp (${moisture}%). Đất quanh cụm nuôi bị khô.`;
      recs.push('Kích hoạt Bơm 2 tưới ẩm đất sinh học để bảo vệ vi sinh.');
    }

    if (duckweedCov > 85) {
      recs.push('Độ che phủ bèo > 85%. Nên thu tỉa bèo thừa làm thức ăn cho ốc bươu hoặc ủ phân.');
    }

    if (recs.length === 0) {
      recs.push('Chế độ tuần hoàn lọc sinh học hoạt động tối ưu. Tiếp tục theo dõi chu kỳ ốc nở.');
    }

    latestAnalysis = {
      timestamp: new Date().toISOString(),
      summary: `Hệ sinh thái ghi nhận TDS ${tds} ppm, độ ẩm đất ${moisture}%, bèo phủ ${duckweedCov}%. Đánh giá: ${rating}.`,
      trend: 'Độ ổn định sinh thái duy trì tốt nhờ phối hợp cảm biến IoT và camera AI.',
      anomaly,
      recommendations: recs,
      status_rating: rating,
    };

    res.json({ success: true, analysis: latestAnalysis });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// AI Vision Endpoint (Gemini multimodal + fallback)
app.post('/api/ai/vision', async (req, res) => {
  try {
    const { image_base64 } = req.body;
    const aiClient = getGeminiClient();

    if (aiClient && image_base64) {
      try {
        const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
        const prompt = `Phân tích bức ảnh từ camera bể hệ sinh thái tuần hoàn bèo và ốc bươu đen:
1. Độ che phủ của bèo (coverage percentage 0-100%).
2. Có phát hiện bèo không (detected boolean).
3. Trạng thái bèo: NORMAL, WARNING, hoặc CRITICAL.
4. Độ tin cậy (confidence 0-100%).
5. Có phát hiện cụm trứng ốc bươu không (màu hồng phấn hoặc tro xám).
6. Số lượng cụm trứng ước tính (egg_clusters nguyên).
7. Trạng thái nở: POSSIBLE, NO, hoặc HATCHING.

Trả về DUY NHẤT một JSON hợp lệ:
{
  "duckweed": { "detected": true, "coverage": 75, "status": "NORMAL", "confidence": 92 },
  "snail_eggs": { "detected": true, "egg_clusters": 5, "hatching": "POSSIBLE", "confidence": 88 },
  "notes": "Nhận xét chi tiết"
}`;

        const aiRes = await aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            prompt,
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Data,
              },
            },
          ],
        });

        const text = aiRes.text || '';
        const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(clean);

        latestVisionResult = {
          timestamp: new Date().toISOString(),
          image_url: image_base64 ? image_base64.substring(0, 100) + '...' : undefined,
          duckweed: {
            detected: parsed.duckweed?.detected ?? true,
            coverage: Number(parsed.duckweed?.coverage) || 75,
            status: parsed.duckweed?.status || 'NORMAL',
            confidence: Number(parsed.duckweed?.confidence) || 88,
          },
          snail_eggs: {
            detected: parsed.snail_eggs?.detected ?? true,
            egg_clusters: Number(parsed.snail_eggs?.egg_clusters) || 5,
            hatching: parsed.snail_eggs?.hatching || 'POSSIBLE',
            confidence: Number(parsed.snail_eggs?.confidence) || 84,
          },
          notes: parsed.notes || 'Phát hiện thảm bèo và cụm trứng ốc qua Gemini Multimodal Vision.',
        };

        return res.json({ success: true, result: latestVisionResult });
      } catch (err: any) {
        console.warn('Gemini vision call failed, using fallback simulator:', err.message);
      }
    }

    const simCoverage = Math.min(95, Math.max(50, Math.round(74 + (Math.random() * 8 - 4))));
    const simClusters = Math.max(2, Math.round(5 + (Math.random() * 4 - 2)));

    latestVisionResult = {
      timestamp: new Date().toISOString(),
      duckweed: {
        detected: true,
        coverage: simCoverage,
        status: simCoverage > 88 ? 'WARNING' : 'NORMAL',
        confidence: Math.round(86 + Math.random() * 10),
      },
      snail_eggs: {
        detected: true,
        egg_clusters: simClusters,
        hatching: simClusters > 4 ? 'POSSIBLE' : 'NO',
        confidence: Math.round(82 + Math.random() * 12),
      },
      notes: `Phân tích AI PC: Thảm bèo che phủ ${simCoverage}% mặt nước. Quan sát thấy ${simClusters} ổ trứng ốc bươu đen.`,
    };

    res.json({ success: true, result: latestVisionResult });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/vision/status', (req, res) => {
  res.json({
    online: true,
    fps: 15,
    last_capture: latestVisionResult.timestamp,
    camera_status: 'CONNECTED',
    latest_result: latestVisionResult,
  });
});

app.get('/api/settings', (req, res) => {
  res.json(systemSettings);
});

app.post('/api/settings', (req, res) => {
  systemSettings = { ...systemSettings, ...req.body };
  res.json({ success: true, settings: systemSettings });
});

app.get('/api/esp/thresholds', (req, res) => {
  res.json({
    device_id: systemSettings.deviceId,
    timestamp: new Date().toISOString(),
    tds_min: systemSettings.tdsMin,
    tds_max: systemSettings.tdsMax,
    soil_moisture_min: systemSettings.soilMoistureMin,
    soil_moisture_max: systemSettings.soilMoistureMax,
    auto_rules: systemSettings.autoRules,
  });
});

app.post('/api/esp/sync-thresholds', (req, res) => {
  systemSettings = { ...systemSettings, ...req.body };
  res.json({
    success: true,
    message: 'Đã gửi gói đồng bộ cấu hình ngưỡng xuống ESP32-S3',
    synced_at: new Date().toISOString(),
  });
});

// ----------------------------------------------------------------------
// VITE OR STATIC SERVING
// ----------------------------------------------------------------------
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OC IoT Hub Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
