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

// Plaintext Active Device Keys for direct Firmware Injection (Server Authoritative)
let devicePlainKeys: Record<string, string> = {
  'ESP32S3_ECO_01': 'dvk_live_eco_01_a9f4c82b7e1039d',
  'AIPC_VISION_01': 'dvk_live_aipc_vision_4f8b2c1e7a',
};

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
      devicePlainKeys,
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
      if (data.devicePlainKeys && typeof data.devicePlainKeys === 'object') {
        devicePlainKeys = { ...devicePlainKeys, ...data.devicePlainKeys };
      }
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

  // Update online flag and attach active plain key for firmware provisioning
  registeredDevices = registeredDevices.map((d) => {
    const updated = {
      ...d,
      activeKey: devicePlainKeys[d.id] || (d.credentials.find((c) => c.status === 'ACTIVE') ? `dvk_live_${d.id.toLowerCase()}_${d.credentials[0].keyHash.substring(7, 15)}` : ''),
    };
    if (d.id === systemSettings.deviceId) {
      return { ...updated, online: isOnline, lastTelemetry: latestSensorData.timestamp };
    }
    return updated;
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

// Offline Resilience: Sync buffered telemetry after network recovery
app.post('/api/v1/devices/telemetry/batch', (req, res) => {
  try {
    const { device_id, samples } = req.body;
    if (!samples || !Array.isArray(samples) || samples.length === 0) {
      return res.status(400).json({ success: false, error: 'Mảng samples rỗng hoặc không hợp lệ' });
    }
    const devId = device_id || systemSettings.deviceId;
    lastDeviceUpdateTime = Date.now();

    for (const s of samples) {
      const ts = s.timestamp || new Date().toISOString();
      const point: SensorData = {
        device_id: devId,
        timestamp: ts,
        tds: s.tds !== undefined ? Number(s.tds) : null,
        soil_moisture: s.soil_moisture !== undefined ? Number(s.soil_moisture) : null,
        float_low: s.float_low !== undefined ? Boolean(s.float_low) : true,
        float_high: s.float_high !== undefined ? Boolean(s.float_high) : false,
        pump1: Boolean(s.pump1),
        pump2: Boolean(s.pump2),
        buzzer: Boolean(s.buzzer),
        wifi_rssi: s.wifi_rssi !== undefined ? Number(s.wifi_rssi) : -65,
      };
      historyData.push(point);
    }

    while (historyData.length > 500) historyData.shift();

    // Evaluate alarm rules on the latest synchronized sample
    if (samples.length > 0) {
      const lastSample = samples[samples.length - 1];
      latestSensorData = {
        ...latestSensorData,
        device_id: devId,
        timestamp: lastSample.timestamp || new Date().toISOString(),
        tds: lastSample.tds !== undefined ? Number(lastSample.tds) : latestSensorData.tds,
        soil_moisture: lastSample.soil_moisture !== undefined ? Number(lastSample.soil_moisture) : latestSensorData.soil_moisture,
        float_low: lastSample.float_low !== undefined ? Boolean(lastSample.float_low) : latestSensorData.float_low,
        float_high: lastSample.float_high !== undefined ? Boolean(lastSample.float_high) : latestSensorData.float_high,
        pump1: lastSample.pump1 !== undefined ? Boolean(lastSample.pump1) : latestSensorData.pump1,
        pump2: lastSample.pump2 !== undefined ? Boolean(lastSample.pump2) : latestSensorData.pump2,
        buzzer: lastSample.buzzer !== undefined ? Boolean(lastSample.buzzer) : latestSensorData.buzzer,
      };
      evaluateAlarmRules(latestSensorData);
    }

    auditLogs.unshift({
      id: `aud_${Date.now()}`,
      who: devId,
      what: `ESP32 hồi phục mạng: Đồng bộ bù ${samples.length} mẫu đo ngoại tuyến (Offline Buffer Sync)`,
      when: new Date().toISOString(),
      projectId: currentProject.id,
      deviceId: devId,
      configVersion: currentProject.activeConfigVersion,
    });

    res.json({
      success: true,
      message: `Đã tiếp nhận ${samples.length} mẫu đo ngoại tuyến`,
      processedCount: samples.length,
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

// Production Deployment Helper: Get ready-to-flash Arduino C++ firmware for ESP32 family
app.get('/api/v1/devices/:id/firmware-sketch', (req, res) => {
  const deviceId = req.params.id || 'ESP32S3_ECO_01';
  const device = registeredDevices.find((d) => d.id === deviceId);
  const host = req.get('host') || '0.0.0.0:3000';
  const protocol = req.protocol === 'https' ? 'https' : 'http';
  const serverEndpoint = (req.query.serverEndpoint as string) || `${protocol}://${host}`;

  // Read configuration options
  const board = ((req.query.board as string) || 'esp32s3').toLowerCase(); // 'esp32s3' | 'esp32' | 'esp32c3' | 'esp32_xiao'
  const powerProfile = ((req.query.powerProfile as string) || 'continuous').toLowerCase(); // 'continuous' | 'modem_sleep' | 'solar_sleep'
  const wifiSsid = (req.query.wifiSsid as string) || 'YOUR_WIFI_NAME';
  const wifiPassword = (req.query.wifiPassword as string) || 'YOUR_WIFI_PASSWORD';
  const relayTrigger = ((req.query.relayTrigger as string) || 'LOW').toUpperCase(); // 'LOW' | 'HIGH'
  const telemetryIntervalSec = Math.max(2, Math.min(300, Number(req.query.telemetryInterval) || 5));
  const heartbeatIntervalSec = Math.max(10, Math.min(600, Number(req.query.heartbeatInterval) || 30));

  // Retrieve actual active Device Key
  const activeKey =
    devicePlainKeys[deviceId] ||
    (device?.credentials.find((c) => c.status === 'ACTIVE')
      ? `dvk_live_${deviceId.toLowerCase()}_${crypto.createHash('md5').update(deviceId).digest('hex').substring(0, 16)}`
      : 'dvk_live_PLEASE_GENERATE_KEY');

  // Board pinout configuration
  let pinoutConfig = {
    boardName: 'ESP32-S3 DevKit (WROOM-1 / N16R8)',
    pinTds: 4,
    pinMoisture: 5,
    pinFloatLow: 21,
    pinFloatHigh: 22,
    pinPump1: 18,
    pinPump2: 19,
    pinBuzzer: 23,
    supportsDualCore: true,
  };

  if (board === 'esp32') {
    pinoutConfig = {
      boardName: 'ESP32 NodeMCU WROOM-32 (Standard 30/38 pin)',
      pinTds: 34,
      pinMoisture: 35,
      pinFloatLow: 25,
      pinFloatHigh: 26,
      pinPump1: 16,
      pinPump2: 17,
      pinBuzzer: 18,
      supportsDualCore: true,
    };
  } else if (board === 'esp32c3') {
    pinoutConfig = {
      boardName: 'ESP32-C3 SuperMini (RISC-V Single Core)',
      pinTds: 0,
      pinMoisture: 1,
      pinFloatLow: 3,
      pinFloatHigh: 4,
      pinPump1: 5,
      pinPump2: 6,
      pinBuzzer: 7,
      supportsDualCore: false,
    };
  } else if (board === 'esp32_xiao') {
    pinoutConfig = {
      boardName: 'Seeed Studio XIAO ESP32-S3',
      pinTds: 1,
      pinMoisture: 2,
      pinFloatLow: 3,
      pinFloatHigh: 4,
      pinPump1: 5,
      pinPump2: 6,
      pinBuzzer: 7,
      supportsDualCore: true,
    };
  }

  const sketch = `/*
  ====================================================================================================
  HỆ THỐNG QUAN TRẮC & ĐIỀU KHIỂN SINH THÁI TUẦN HOÀN OC IoT (V4.2)
  MÃ NGUỒN C++ TOÀN DIỆN CHO BO MẠCH VI ĐIỀU KHIỂN ESP32
  ====================================================================================================
  Bo Mạch:            ${pinoutConfig.boardName}
  Mã Trạm (Device ID): ${deviceId}
  Khóa Bảo Mật:       ${activeKey}
  Chế Độ Năng Lượng:  ${powerProfile === 'continuous' ? 'ĐIỆN LƯỚI LIÊN TỤC (Độ trễ thấp, xử lý tức thì)' : powerProfile === 'modem_sleep' ? 'TIẾT KIỆM NĂNG LƯỢNG (WiFi Modem Sleep - Giảm 60% điện, chip mát 38°C)' : 'PIN / NĂNG LƯỢNG MẶT TRỜI (Light Sleep đánh thức theo chu kỳ và phao khẩn)'}
  Máy Chủ Hub Web:    ${serverEndpoint}
  ====================================================================================================
  
  ====================================================================================================
  📖 BẢNG TRA CỨU: CHỖ NÀO CHỈNH ĐƯỢC & CHỈNH RA SAO (HƯỚNG DẪN NGƯỜI DÙNG)
  ====================================================================================================
  [CHỖ CHỈNH 1/6]: TÊN WIFI VÀ MẬT KHẨU (WIFI_SSID, WIFI_PASSWORD)
    - Chỉnh ra sao: Thay "Tên_WiFi" và "Mật_Khẩu" bằng mạng WiFi thực tế tại nơi đặt trạm.
    - Lưu ý quan trọng: ESP32 chỉ kết nối sóng 2.4GHz. Không được dùng sóng 5GHz!
    - Nếu đi thực địa: Bạn có thể bật "Phát điểm truy cập di động" (Hotspot) trên điện thoại 2.4GHz.

  [CHỖ CHỈNH 2/6]: ĐỊA CHỈ MÁY CHỦ HUB WEB (HUB_BASE_URL)
    - Chỉnh ra sao:
      + Nếu dùng máy tính cá nhân mở Web Dashboard (cùng mạng WiFi):
        Sửa thành: const char* HUB_BASE_URL = "http://192.168.1.xxx:3000/api/v1";
        (Thay 192.168.1.xxx bằng IP thật máy tính của bạn: Mở Terminal/CMD gõ 'ipconfig' trên Windows).
      + Nếu dùng Cloud / Web online: Giữ nguyên URL "https://...".
      * CẢNH BÁO NGUY HIỂM: Tuyệt đối KHÔNG ĐỂ "http://localhost:3000" vì ESP32 không thể kết nối 
        vào localhost của máy tính qua WiFi!

  [CHỖ CHỈNH 3/6]: SƠ ĐỒ CHÂN NỐI DÂY GPIO (PIN_...)
    - Chỉnh ra sao: Đổi số chân GPIO nếu bạn cắm dây sang chân khác trên bo mạch.
    - Lưu ý: Chân cảm biến TDS & Độ ẩm đất phải là chân ADC1 để không bị nghẽn sóng WiFi.

  [CHỖ CHỈNH 4/6]: MỨC KÍCH HOẠT RƠ-LE (RELAY_ON_LEVEL)
    - Chỉnh ra sao:
      + Đa số Module Relay 5V thông dụng là kích mức THẤP (Active LOW): Để là LOW.
      + Nếu vừa cắm điện vào rơ-le đã tự bật máy bơm ngay -> Hãy đổi RELAY_ON_LEVEL thành HIGH!

  [CHỖ CHỈNH 5/6]: CÂN CHỈNH CẢM BIẾN TDS VÀ ĐỘ ẨM ĐẤT
    - Chỉnh ra sao: Sửa hệ số kFactor ở hàm readTDS() hoặc dải DRY/WET ở hàm readSoilMoisture().

  [CHỖ CHỈNH 6/6]: CHU KỲ GỬI TIN & TIẾT KIỆM NĂNG LƯỢNG
    - Chỉnh ra sao: Thay đổi TELEMETRY_INTERVAL_MS (mặc định 5000ms = 5 giây/lần).
  ====================================================================================================
*/

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <esp_wifi.h>
#include <esp_sleep.h>

// ====================================================================================================
// >>> [CHỖ CHỈNH 1/6]: ĐIỀN TÊN WIFI VÀ MẬT KHẨU (BẮT BUỘC SỬA NẾU KHÁC MẠNG MẶC ĐỊNH) <<<
// ====================================================================================================
const char* WIFI_SSID         = "${wifiSsid}";      // <-- Thay bằng tên WiFi 2.4GHz của bạn
const char* WIFI_PASSWORD     = "${wifiPassword}";  // <-- Thay bằng mật khẩu WiFi của bạn

// ====================================================================================================
// >>> [CHỖ CHỈNH 2/6]: ĐỊA CHỈ MÁY CHỦ HUB WEB (KHÔNG DÙNG LOCALHOST) <<<
// ====================================================================================================
// Ví dụ chạy cục bộ: "http://192.168.1.15:3000/api/v1"
// Ví dụ chạy đám mây: "${serverEndpoint}/api/v1"
const char* HUB_BASE_URL      = "${serverEndpoint}/api/v1";

// Mã nhận diện trạm và khóa bí mật đã được cấp phát tự động
const char* DEVICE_ID         = "${deviceId}";
const char* DEVICE_KEY        = "${activeKey}";

// ====================================================================================================
// >>> [CHỖ CHỈNH 3/6]: SƠ ĐỒ CHÂN NỐI DÂY GPIO TRÊN BO (${pinoutConfig.boardName}) <<<
// ====================================================================================================
#define PIN_TDS_ADC        ${pinoutConfig.pinTds}   // Chân Analog đọc cảm biến TDS nước
#define PIN_MOISTURE_ADC   ${pinoutConfig.pinMoisture}   // Chân Analog đọc độ ẩm đất thảm thực vật
#define PIN_FLOAT_LOW      ${pinoutConfig.pinFloatLow}  // Chân Phao đáy bể (chống cạn - INPUT_PULLUP nối GND)
#define PIN_FLOAT_HIGH     ${pinoutConfig.pinFloatHigh}  // Chân Phao đỉnh bể (chống tràn - INPUT_PULLUP nối GND)
#define PIN_RELAY_PUMP1    ${pinoutConfig.pinPump1}  // Chân kích Relay Bơm 1: Lọc tuần hoàn sinh học
#define PIN_RELAY_PUMP2    ${pinoutConfig.pinPump2}  // Chân kích Relay Bơm 2: Tưới vi sinh/phun sương
#define PIN_BUZZER         ${pinoutConfig.pinBuzzer}  // Chân còi báo động sự cố

// ====================================================================================================
// >>> [CHỖ CHỈNH 4/6]: MỨC KÍCH HOẠT RƠ-LE (ACTIVE LOW HOẶC ACTIVE HIGH) <<<
// ====================================================================================================
// Hầu hết mạch Relay 5V Arduino là Active LOW (Ghi LOW là BẬT, Ghi HIGH là TẮT)
// Nếu module của bạn bật ở mức HIGH, hãy đổi: RELAY_ON_LEVEL = HIGH, RELAY_OFF_LEVEL = LOW
#define RELAY_ON_LEVEL     ${relayTrigger}
#define RELAY_OFF_LEVEL    (${relayTrigger} == LOW ? HIGH : LOW)

// ====================================================================================================
// >>> [CHỖ CHỈNH 6/6]: CHU KỲ GỬI TIN BÁO CÁO <<<
// ====================================================================================================
const unsigned long TELEMETRY_INTERVAL_MS = ${telemetryIntervalSec * 1000}; // Mặc định: ${telemetryIntervalSec} giây
const unsigned long HEARTBEAT_INTERVAL_MS = ${heartbeatIntervalSec * 1000}; // Mặc định: ${heartbeatIntervalSec} giây

// ====================================================================================================
// [KHÔNG NÊN SỬA]: CÁC BIẾN HỆ THỐNG & BỘ NHỚ ĐỆM NGOẠI TUYẾN
// ====================================================================================================
#define OFFLINE_BUFFER_CAPACITY 30

struct OfflineTelemetrySample {
  int tds;
  int moisture;
  bool floatLow;
  bool floatHigh;
  bool pump1;
  bool pump2;
  bool buzzer;
  unsigned long timestampSec;
};

OfflineTelemetrySample offlineBuffer[OFFLINE_BUFFER_CAPACITY];
int offlineBufferCount = 0;

volatile bool statePump1 = false;
volatile bool statePump2 = false;
volatile bool stateBuzzer = false;

unsigned long lastTelemetryMs = 0;
unsigned long lastHeartbeatMs = 0;
unsigned long lastWifiCheckMs = 0;
bool wasOffline = false;

// ====================================================================================================
// HÀM GỬI HTTP/HTTPS ĐA NĂNG (TỰ ĐỘNG XỬ LÝ SSL KHÔNG BỊ TREO HOẶC LỖI -1)
// ====================================================================================================
int sendJsonRequest(const String &url, const String &method, const String &payload, String &responseBody) {
  HTTPClient http;
  bool isHttps = url.startsWith("https://");
  WiFiClient clientHttp;
  WiFiClientSecure clientHttps;

  if (isHttps) {
    clientHttps.setInsecure(); // Bỏ qua xác thực SSL để tương thích máy chủ Cloud Run / HTTPS
    http.begin(clientHttps, url);
  } else {
    http.begin(clientHttp, url);
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  http.addHeader("Authorization", String("Bearer ") + DEVICE_KEY);
  http.setTimeout(4500); // Timeout 4.5 giây

  int code = -1;
  if (method == "POST") {
    code = http.POST(payload);
  } else {
    code = http.GET();
  }

  if (code > 0) {
    responseBody = http.getString();
  } else {
    Serial.printf("[HTTP] Loi ket noi toi Hub (Code: %d, Chi tiet: %s)\\n", code, http.errorToString(code).c_str());
  }

  http.end();
  return code;
}

// ====================================================================================================
// >>> [CHỖ CHỈNH 5/6]: CÂN CHỈNH CẢM BIẾN TDS VÀ ĐỘ ẨM ĐẤT <<<
// ====================================================================================================
float readTDS() {
  long sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(PIN_TDS_ADC);
    delayMicroseconds(200);
  }
  float raw = sum / 10.0;
  float voltage = (raw / 4095.0) * 3.3; // ADC 12-bit ESP32
  
  // Công thức chuyển đổi Điện áp (V) sang TDS (ppm):
  // Có thể nhân thêm hệ số cân chỉnh kFactor nếu so với bút đo TDS thực tế
  float kFactor = 1.0; 
  float tdsValue = (133.42 * pow(voltage, 3) - 255.86 * pow(voltage, 2) + 857.39 * voltage) * 0.5 * kFactor;
  if (tdsValue < 0) tdsValue = 0;
  return tdsValue;
}

int readSoilMoisture() {
  long sum = 0;
  for (int i = 0; i < 8; i++) {
    sum += analogRead(PIN_MOISTURE_ADC);
    delayMicroseconds(200);
  }
  int raw = sum / 8;
  
  // Hiệu chuẩn cảm biến điện dung:
  // Giá trị khi ở không khí khô ráo (Air): ~3000
  // Giá trị khi ngâm vào cốc nước (Water): ~1200
  const int RAW_AIR = 3000;
  const int RAW_WATER = 1200;
  int percent = map(raw, RAW_AIR, RAW_WATER, 0, 100);
  return constrain(percent, 0, 100);
}

bool readFloatLow() {
  // Phao đóng tiếp điểm nối chân GPIO xuống GND khi có nước (LOW = Đủ nước an toàn, HIGH = Cạn nước)
  return digitalRead(PIN_FLOAT_LOW) == LOW;
}

bool readFloatHigh() {
  return digitalRead(PIN_FLOAT_HIGH) == LOW;
}

// ====================================================================================================
// BẢO VỆ PHẦN CỨNG TỰ TRỊ (CHỐNG CHÁY MÁY BƠM KHI HẾT NƯỚC)
// ====================================================================================================
void evaluateLocalSafety(bool waterLowSafe) {
  // BẢO VỆ TỐI CAO: Dù có mạng hay mất mạng hoàn toàn, nếu hụt nước đáy bể,
  // lập tức ngắt Bơm 1 để bảo vệ chống cháy máy bơm!
  if (!waterLowSafe && statePump1) {
    statePump1 = false;
    digitalWrite(PIN_RELAY_PUMP1, RELAY_OFF_LEVEL);
    Serial.println("[AN TOAN CUC BO] Can nuoc duoi muc an toan! Tu dong ngat Bom 1!");
  }
}

// ====================================================================================================
// QUẢN LÝ KẾT NỐI WIFI TỰ PHỤC HỒI (KHÔNG LÀM TREO CHƯƠNG TRÌNH)
// ====================================================================================================
void flushOfflineBuffer();

void maintainWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    if (wasOffline) {
      wasOffline = false;
      Serial.println("\\n[WiFi] Da ket noi lai mang! Tien hanh day bu du lieu luu dem...");
      flushOfflineBuffer();
    }
    return;
  }

  wasOffline = true;
  unsigned long now = millis();
  if (now - lastWifiCheckMs >= 10000) {
    lastWifiCheckMs = now;
    Serial.println("[WiFi] Mat ket noi mang. Dang thu ket noi lai...");
    WiFi.reconnect();
  }
}

void initWiFi() {
  Serial.printf("\\n[WiFi] Dang ket noi vao mang: %s\\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);

  ${
    powerProfile === 'modem_sleep'
      ? `  // Bật chế độ tiết kiệm điện Modem Sleep (Giảm 60% điện năng, chip mát 38°C)
  WiFi.setSleep(true);
  esp_wifi_set_ps(WIFI_PS_MIN_MODEM);
  Serial.println("[Power] Da kich hoat WiFi Modem Sleep.");`
      : ''
  }

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // Chỉ chờ tối đa 14 lần (7 giây) khi khởi động
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 14) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\\n[WiFi] KET NOI THANH CONG! IP: %s, Tin hieu RSSI: %d dBm\\n",
      WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println("\\n-------------------------------------------------------------");
    Serial.println("[CANH BAO] Khong the ket noi WiFi!");
    Serial.println("  1. Kiem tra xem ten WIFI_SSID va WIFI_PASSWORD co dung khong?");
    Serial.println("  2. Kiem tra xem WiFi co phai bang tan 2.4GHz khong (5GHz khong chay)?");
    Serial.println("  -> Tram se hoat dong o che do NGOAI TUYEN TU TRI va luu dem du lieu.");
    Serial.println("-------------------------------------------------------------");
  }
}

// ====================================================================================================
// BỘ NHỚ ĐỆM & GỬI BÙ DỮ LIỆU KHI CÓ MẠNG TRỞ LẠI
// ====================================================================================================
void bufferOfflineSample(int tds, int moisture, bool floatLow, bool floatHigh) {
  if (offlineBufferCount < OFFLINE_BUFFER_CAPACITY) {
    offlineBuffer[offlineBufferCount] = {
      tds, moisture, floatLow, floatHigh, statePump1, statePump2, stateBuzzer, millis() / 1000
    };
    offlineBufferCount++;
    Serial.printf("[Luu Dem] Da luu mau %d/%d vao bo nho dem\\n", offlineBufferCount, OFFLINE_BUFFER_CAPACITY);
  } else {
    for (int i = 0; i < OFFLINE_BUFFER_CAPACITY - 1; i++) {
      offlineBuffer[i] = offlineBuffer[i + 1];
    }
    offlineBuffer[OFFLINE_BUFFER_CAPACITY - 1] = {
      tds, moisture, floatLow, floatHigh, statePump1, statePump2, stateBuzzer, millis() / 1000
    };
  }
}

void flushOfflineBuffer() {
  if (offlineBufferCount == 0 || WiFi.status() != WL_CONNECTED) return;

  String url = String(HUB_BASE_URL) + "/devices/telemetry/batch";
  DynamicJsonDocument doc(4096);
  doc["device_id"] = DEVICE_ID;
  JsonArray samples = doc.createNestedArray("samples");

  for (int i = 0; i < offlineBufferCount; i++) {
    JsonObject s = samples.createNestedObject();
    s["tds"] = offlineBuffer[i].tds;
    s["soil_moisture"] = offlineBuffer[i].moisture;
    s["float_low"] = offlineBuffer[i].floatLow;
    s["float_high"] = offlineBuffer[i].floatHigh;
    s["pump1"] = offlineBuffer[i].pump1;
    s["pump2"] = offlineBuffer[i].pump2;
    s["buzzer"] = offlineBuffer[i].buzzer;
  }

  String body;
  serializeJson(doc, body);
  String response;
  int httpCode = sendJsonRequest(url, "POST", body, response);

  if (httpCode == 200) {
    Serial.printf("[Dong Bo] Da day bu thanh cong %d mau do len Hub!\\n", offlineBufferCount);
    offlineBufferCount = 0;
  }
}

// ====================================================================================================
// GỬI TELEMETRY & KÉO LỆNH ĐIỀU KHIỂN TỪ HUB
// ====================================================================================================
void pollAndExecuteCommands();

void sendTelemetryAndPoll() {
  float tds = readTDS();
  int moisture = readSoilMoisture();
  bool waterLowSafe = readFloatLow();
  bool waterHigh = readFloatHigh();

  evaluateLocalSafety(waterLowSafe);

  if (WiFi.status() != WL_CONNECTED) {
    bufferOfflineSample((int)tds, moisture, waterLowSafe, waterHigh);
    return;
  }

  String url = String(HUB_BASE_URL) + "/devices/telemetry";
  StaticJsonDocument<512> doc;
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
  String response;
  int code = sendJsonRequest(url, "POST", body, response);

  if (code == 200) {
    Serial.printf("[Telemetry] TDS: %d ppm | Do am: %d%% | Phao Day: %s | Bom1: %s\\n",
      (int)tds, moisture, waterLowSafe ? "DU" : "CAN!", statePump1 ? "ON" : "OFF");
  }

  pollAndExecuteCommands();
}

void sendAck(String cmdId);

void pollAndExecuteCommands() {
  if (WiFi.status() != WL_CONNECTED) return;

  String url = String(HUB_BASE_URL) + "/devices/" + DEVICE_ID + "/commands/pending";
  String response;
  int code = sendJsonRequest(url, "GET", "", response);

  if (code == 200) {
    DynamicJsonDocument resDoc(1024);
    deserializeJson(resDoc, response);
    JsonArray cmds = resDoc["commands"].as<JsonArray>();

    for (JsonObject cmd : cmds) {
      String cmdId = cmd["id"].as<String>();
      Serial.printf("[Lenh] Nhan lenh tu Hub: %s\\n", cmdId.c_str());

      if (cmd.containsKey("pump1")) {
        bool targetPump1 = cmd["pump1"].as<bool>();
        if (targetPump1 && !readFloatLow()) {
          Serial.println("[TU CHOI] Be can nuoc! Khong duoc phep bat Bom 1!");
          statePump1 = false;
        } else {
          statePump1 = targetPump1;
        }
        digitalWrite(PIN_RELAY_PUMP1, statePump1 ? RELAY_ON_LEVEL : RELAY_OFF_LEVEL);
      }

      if (cmd.containsKey("pump2")) {
        statePump2 = cmd["pump2"].as<bool>();
        digitalWrite(PIN_RELAY_PUMP2, statePump2 ? RELAY_ON_LEVEL : RELAY_OFF_LEVEL);
      }

      if (cmd.containsKey("buzzer")) {
        stateBuzzer = cmd["buzzer"].as<bool>();
        digitalWrite(PIN_BUZZER, stateBuzzer ? HIGH : LOW);
      }

      sendAck(cmdId);
    }
  }
}

void sendAck(String cmdId) {
  String url = String(HUB_BASE_URL) + "/devices/" + DEVICE_ID + "/commands/" + cmdId + "/ack";
  StaticJsonDocument<256> doc;
  doc["status"] = "EXECUTED";
  JsonObject state = doc.createNestedObject("executedState");
  state["pump1"] = statePump1;
  state["pump2"] = statePump2;
  state["buzzer"] = stateBuzzer;

  String body;
  serializeJson(doc, body);
  String response;
  sendJsonRequest(url, "POST", body, response);
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  String url = String(HUB_BASE_URL) + "/devices/heartbeat";
  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["rssi"] = WiFi.RSSI();
  doc["ip"] = WiFi.localIP().toString();
  doc["firmware"] = "v4.2.2-${board}";

  String body;
  serializeJson(doc, body);
  String response;
  sendJsonRequest(url, "POST", body, response);
}

// ====================================================================================================
// KHỞI ĐỘNG HỆ THỐNG (SETUP)
// ====================================================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\\n========================================================");
  Serial.printf(" [OC IoT] Khoi dong Tram: %s\\n", DEVICE_ID);
  Serial.printf(" Bo mach: %s\\n", "${pinoutConfig.boardName}");
  Serial.println("========================================================");

  pinMode(PIN_FLOAT_LOW, INPUT_PULLUP);
  pinMode(PIN_FLOAT_HIGH, INPUT_PULLUP);

  pinMode(PIN_RELAY_PUMP1, OUTPUT);
  pinMode(PIN_RELAY_PUMP2, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);

  // Mặc định ban đầu ở trạng thái AN TOÀN (TẮT RƠ-LE VÀ CÒI)
  digitalWrite(PIN_RELAY_PUMP1, RELAY_OFF_LEVEL);
  digitalWrite(PIN_RELAY_PUMP2, RELAY_OFF_LEVEL);
  digitalWrite(PIN_BUZZER, LOW);

  initWiFi();
}

// ====================================================================================================
// VÒNG LẶP CHÍNH (LOOP)
// ====================================================================================================
void loop() {
  maintainWiFi();
  evaluateLocalSafety(readFloatLow());

  unsigned long currentMs = millis();

  if (currentMs - lastTelemetryMs >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryMs = currentMs;
    sendTelemetryAndPoll();
  }

  if (currentMs - lastHeartbeatMs >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatMs = currentMs;
    sendHeartbeat();
  }

  ${
    powerProfile === 'solar_sleep'
      ? `  // Chế độ Solar/Battery: Đưa vào Light Sleep giữa các chu kỳ đo
  esp_sleep_enable_timer_wakeup((uint64_t)TELEMETRY_INTERVAL_MS * 1000ULL);
  esp_sleep_enable_ext0_wakeup((gpio_num_t)PIN_FLOAT_LOW, 1);
  Serial.println("[Solar Power] Bat dau Light Sleep tiet kiem pin...");
  Serial.flush();
  esp_light_sleep_start();
  Serial.println("[Solar Power] Thuc giac do tiep!");`
      : '  delay(50);'
  }
}
`;

  res.json({
    success: true,
    deviceId,
    board,
    powerProfile,
    activeKey,
    firmwareVersion: `v4.2.0-${board}`,
    pinout: pinoutConfig,
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

// Helper to parse any Google Sheets or Google Drive or Apps Script URL
function parseGoogleSpreadsheetInput(rawInput: string): {
  type: 'SHEET' | 'DRIVE_FILE' | 'DRIVE_FOLDER' | 'APPS_SCRIPT_WEBAPP' | 'APPS_SCRIPT_EDITOR' | 'RAW_ID' | 'INVALID';
  id: string | null;
  normalizedUrl: string;
  error?: string;
} {
  const input = String(rawInput || '').trim();
  if (!input) {
    return { type: 'INVALID', id: null, normalizedUrl: '', error: 'Chưa nhập đường link Google Sheets' };
  }

  // 1. Check if user passed an Apps Script Web App URL
  if (input.includes('script.google.com/macros/s/') && input.includes('/exec')) {
    return { type: 'APPS_SCRIPT_WEBAPP', id: null, normalizedUrl: input };
  }

  // 2. Check if user passed an Apps Script Editor link
  if (input.includes('script.google.com/d/') || (input.includes('script.google.com') && input.includes('/edit'))) {
    return {
      type: 'APPS_SCRIPT_EDITOR',
      id: null,
      normalizedUrl: input,
      error: 'Đây là đường link chỉnh sửa mã Apps Script (/edit), không phải bảng tính. Nếu bạn muốn dùng làm Webhook, hãy bấm nút [Triển khai] (Deploy) -> [Triển khai mới] -> Chọn [Ứng dụng web] để lấy link kết thúc bằng /exec.',
    };
  }

  // 3. Check Google Drive folder link
  if (input.includes('drive.google.com/drive/folders/')) {
    const folderMatch = input.match(/folders\/([a-zA-Z0-9-_]+)/);
    return {
      type: 'DRIVE_FOLDER',
      id: folderMatch ? folderMatch[1] : null,
      normalizedUrl: input,
      error: 'Đây là đường link Thư mục Google Drive (Folder), không phải tệp bảng tính Google Sheets. Bạn hãy mở bảng tính bên trong thư mục đó và copy đường link trên thanh địa chỉ của bảng tính.',
    };
  }

  // 4. Check standard Google Sheets URL: https://docs.google.com/spreadsheets/d/{ID}/...
  const sheetMatch = input.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9-_]+)/);
  if (sheetMatch && sheetMatch[1]) {
    const id = sheetMatch[1];
    return {
      type: 'SHEET',
      id,
      normalizedUrl: `https://docs.google.com/spreadsheets/d/${id}/edit`,
    };
  }

  // 5. Check Google Drive file URL: https://drive.google.com/file/d/{ID}/...
  const driveFileMatch = input.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  if (driveFileMatch && driveFileMatch[1]) {
    const id = driveFileMatch[1];
    return {
      type: 'DRIVE_FILE',
      id,
      normalizedUrl: `https://docs.google.com/spreadsheets/d/${id}/edit`,
    };
  }

  // 6. Check Google Drive open URL: https://drive.google.com/open?id={ID}
  const driveOpenMatch = input.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (driveOpenMatch && driveOpenMatch[1]) {
    const id = driveOpenMatch[1];
    return {
      type: 'DRIVE_FILE',
      id,
      normalizedUrl: `https://docs.google.com/spreadsheets/d/${id}/edit`,
    };
  }

  // 7. Check raw Spreadsheet ID (typically 30-65 chars)
  if (/^[a-zA-Z0-9-_]{25,65}$/.test(input)) {
    return {
      type: 'RAW_ID',
      id: input,
      normalizedUrl: `https://docs.google.com/spreadsheets/d/${input}/edit`,
    };
  }

  return {
    type: 'INVALID',
    id: null,
    normalizedUrl: input,
    error: 'Đường link không đúng định dạng. Vui lòng dán link Google Sheets dạng: https://docs.google.com/spreadsheets/d/.../edit hoặc link chia sẻ Drive dạng: https://drive.google.com/file/d/.../view',
  };
}

// Handler logic for Google Sheets check and read
async function handleGoogleSheetsRequest(reqUrl: string, reqWebhook: string, res: express.Response) {
  try {
    let sheetUrl = String(reqUrl || '').trim();
    let webhookUrl = String(reqWebhook || '').trim();

    // If both empty, check stored settings
    if (!sheetUrl && !webhookUrl) {
      sheetUrl = systemSettings.googleSheetsUrl || '';
      webhookUrl = systemSettings.googleSheetsWebhookUrl || '';
    }

    // Auto-detect swapped URLs: user pasted Apps Script into Sheet URL box
    if (sheetUrl.includes('script.google.com/macros/s/')) {
      if (!webhookUrl) webhookUrl = sheetUrl;
      sheetUrl = systemSettings.googleSheetsUrl && !systemSettings.googleSheetsUrl.includes('script.google.com')
        ? systemSettings.googleSheetsUrl
        : '';
    }

    // If user pasted Google Sheets link into Webhook box
    if (webhookUrl.includes('docs.google.com/spreadsheets') || webhookUrl.includes('drive.google.com/file/d')) {
      if (!sheetUrl) sheetUrl = webhookUrl;
      webhookUrl = '';
    }

    // Save valid URLs
    if (webhookUrl && webhookUrl.includes('script.google.com/macros/s/')) {
      systemSettings.googleSheetsWebhookUrl = webhookUrl;
    }
    if (sheetUrl && !sheetUrl.includes('script.google.com')) {
      systemSettings.googleSheetsUrl = sheetUrl;
    }
    saveStore();

    // Case 1: Both are empty
    if (!sheetUrl && !webhookUrl) {
      return res.json({
        connected: false,
        url: '',
        webhookUrl: '',
        spreadsheetId: null,
        lastUpdate: null,
        lastSyncTime: systemSettings.lastSheetsSyncTime || null,
        lastSyncStatus: systemSettings.lastSheetsSyncStatus || 'IDLE',
        lastSyncMessage: systemSettings.lastSheetsSyncMessage || '',
        rowsCount: 0,
        records: [],
        error: 'Chưa cấu hình URL Google Sheets',
      });
    }

    // Parse the Sheet URL
    const parseResult = parseGoogleSpreadsheetInput(sheetUrl);

    // Case 2: User gave an Apps Script Webhook but no Sheet URL
    if (webhookUrl && (!sheetUrl || parseResult.type === 'APPS_SCRIPT_WEBAPP')) {
      return res.json({
        connected: true,
        url: sheetUrl || webhookUrl,
        webhookUrl,
        spreadsheetId: 'APPS_SCRIPT_WEBHOOK',
        lastUpdate: new Date().toISOString(),
        lastSyncTime: systemSettings.lastSheetsSyncTime || null,
        lastSyncStatus: systemSettings.lastSheetsSyncStatus || 'IDLE',
        lastSyncMessage: systemSettings.lastSheetsSyncMessage || '',
        rowsCount: historyData.length,
        records: historyData.slice(-50),
        message: 'Đã kết nối thành công với Google Apps Script Web App (Hỗ trợ đẩy và nhận dữ liệu 2 chiều)!',
      });
    }

    // If parsing produced a specific error
    if (parseResult.error && !parseResult.id) {
      return res.json({
        connected: false,
        url: sheetUrl,
        webhookUrl,
        spreadsheetId: null,
        lastUpdate: null,
        lastSyncTime: systemSettings.lastSheetsSyncTime || null,
        lastSyncStatus: systemSettings.lastSheetsSyncStatus || 'IDLE',
        lastSyncMessage: systemSettings.lastSheetsSyncMessage || '',
        rowsCount: 0,
        records: [],
        error: parseResult.error,
      });
    }

    const spreadsheetId = parseResult.id;
    if (!spreadsheetId) {
      return res.json({
        connected: false,
        url: sheetUrl,
        webhookUrl,
        spreadsheetId: null,
        lastUpdate: null,
        lastSyncTime: systemSettings.lastSheetsSyncTime || null,
        lastSyncStatus: systemSettings.lastSheetsSyncStatus || 'IDLE',
        lastSyncMessage: systemSettings.lastSheetsSyncMessage || '',
        rowsCount: 0,
        records: [],
        error: 'Không trích xuất được ID bảng tính. Vui lòng kiểm tra lại liên kết Google Sheets.',
      });
    }

    // Normalize to standard sheets edit URL
    sheetUrl = parseResult.normalizedUrl;
    systemSettings.googleSheetsUrl = sheetUrl;
    saveStore();

    // Query Google Sheets CSV export
    const exportCsvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
    let rows: string[] = [];
    let isNewOrEmpty = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(exportCsvUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/csv,text/plain,*/*',
        },
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeoutId);

      const textResult = await response.text();

      // Check if file not found (404 or Google Docs Page not found HTML)
      if (
        response.status === 404 ||
        textResult.includes('Sorry, the file you have requested does not exist') ||
        textResult.includes('<title>Page not found</title>')
      ) {
        return res.json({
          connected: false,
          url: sheetUrl,
          webhookUrl,
          spreadsheetId,
          lastUpdate: null,
          lastSyncTime: systemSettings.lastSheetsSyncTime || null,
          lastSyncStatus: systemSettings.lastSheetsSyncStatus || 'IDLE',
          lastSyncMessage: systemSettings.lastSheetsSyncMessage || '',
          rowsCount: 0,
          records: [],
          error: 'Google báo: Tệp không tồn tại hoặc ID không chính xác. Nếu bạn lấy link từ Google Drive, hãy bấm đúp mở tệp bảng tính đó trên trình duyệt rồi copy link từ thanh địa chỉ.',
        });
      }

      // Check if Google returned an HTML login page (Sheet is private / requires sign-in)
      if (
        textResult.includes('<!DOCTYPE html>') ||
        textResult.includes('<html') ||
        textResult.includes('accounts.google.com') ||
        response.status === 401 ||
        response.status === 403
      ) {
        return res.json({
          connected: false,
          url: sheetUrl,
          webhookUrl,
          spreadsheetId,
          lastUpdate: null,
          lastSyncTime: systemSettings.lastSheetsSyncTime || null,
          lastSyncStatus: systemSettings.lastSheetsSyncStatus || 'IDLE',
          lastSyncMessage: systemSettings.lastSheetsSyncMessage || '',
          rowsCount: 0,
          records: [],
          error: 'Bảng tính Google Sheets đang ở chế độ Riêng tư (Private). Bạn cần mở Google Sheet -> Bấm nút [Chia sẻ] (Share) màu xanh ở góc trên bên phải -> Tại mục "Quyền truy cập chung", đổi thành "Bất kỳ ai có đường liên kết" (Anyone with the link) -> Cấp quyền "Người xem" hoặc "Người chỉnh sửa", sau đó bấm Lưu & Kiểm Tra Lại.',
        });
      }

      if (!response.ok) {
        return res.json({
          connected: false,
          url: sheetUrl,
          webhookUrl,
          spreadsheetId,
          lastUpdate: null,
          lastSyncTime: systemSettings.lastSheetsSyncTime || null,
          lastSyncStatus: systemSettings.lastSheetsSyncStatus || 'IDLE',
          lastSyncMessage: systemSettings.lastSheetsSyncMessage || '',
          rowsCount: 0,
          records: [],
          error: `Google Sheets phản hồi mã trạng thái HTTP ${response.status}. Vui lòng kiểm tra lại liên kết.`,
        });
      }

      rows = textResult.split(/\r?\n/).filter((r) => r.trim().length > 0);
      if (rows.length <= 1) {
        isNewOrEmpty = true;
      }
    } catch (fetchErr: any) {
      return res.json({
        connected: false,
        url: sheetUrl,
        webhookUrl,
        spreadsheetId,
        lastUpdate: null,
        lastSyncTime: systemSettings.lastSheetsSyncTime || null,
        lastSyncStatus: systemSettings.lastSheetsSyncStatus || 'IDLE',
        lastSyncMessage: systemSettings.lastSheetsSyncMessage || '',
        rowsCount: 0,
        records: [],
        error: fetchErr.name === 'AbortError'
          ? 'Kết nối Google Sheets quá thời gian chờ (Timeout). Vui lòng kiểm tra kết nối mạng và thử lại.'
          : `Lỗi kết nối tới Google Sheets: ${fetchErr.message || 'Không thể tải bảng tính'}`,
      });
    }

    const sheetsData: GoogleSheetsData = {
      connected: true,
      url: sheetUrl,
      webhookUrl,
      spreadsheetId,
      lastUpdate: new Date().toISOString(),
      lastSyncTime: systemSettings.lastSheetsSyncTime || null,
      lastSyncStatus: systemSettings.lastSheetsSyncStatus || 'IDLE',
      lastSyncMessage: systemSettings.lastSheetsSyncMessage || '',
      rowsCount: Math.max(0, rows.length - 1),
      records: historyData.slice(-50),
      isNewOrEmpty,
      message: isNewOrEmpty
        ? 'Đã kết nối với Bảng tính mới! Bảng tính đang trống, hãy bấm Đẩy Dữ Liệu hoặc nạp CSV bên dưới để khởi tạo 2 Tab.'
        : `Đã kết nối thành công, đọc được ${Math.max(0, rows.length - 1)} dòng dữ liệu từ Google Sheets.`,
    };

    return res.json(sheetsData);
  } catch (outerErr: any) {
    console.error('Lỗi xử lý /api/sheets:', outerErr);
    return res.json({
      connected: false,
      url: reqUrl || '',
      webhookUrl: reqWebhook || '',
      spreadsheetId: null,
      lastUpdate: null,
      rowsCount: 0,
      records: [],
      error: `Lỗi xử lý yêu cầu: ${outerErr?.message || 'Không rõ nguyên nhân'}`,
    });
  }
}

// Google Sheets Status & Data Fetch Endpoint (GET)
app.get('/api/sheets', async (req, res) => {
  const reqUrl = Array.isArray(req.query.url) ? String(req.query.url[0]) : String(req.query.url || '');
  const reqWebhook = Array.isArray(req.query.webhookUrl) ? String(req.query.webhookUrl[0]) : String(req.query.webhookUrl || '');
  await handleGoogleSheetsRequest(reqUrl, reqWebhook, res);
});

// Google Sheets Status & Data Fetch Endpoint (POST)
app.post('/api/sheets', async (req, res) => {
  const reqUrl = String(req.body?.url || '');
  const reqWebhook = String(req.body?.webhookUrl || '');
  await handleGoogleSheetsRequest(reqUrl, reqWebhook, res);
});

// Save Google Sheets Configuration
app.post('/api/sheets/config', (req, res) => {
  const { url, webhookUrl } = req.body || {};
  if (url !== undefined) systemSettings.googleSheetsUrl = String(url).trim();
  if (webhookUrl !== undefined) systemSettings.googleSheetsWebhookUrl = String(webhookUrl).trim();
  saveStore();
  res.json({ success: true, message: 'Đã lưu cấu hình Google Sheets thành công!' });
});

// Real-time Push Data To Google Sheets (Sync Now)
app.post('/api/sheets/sync-now', async (req, res) => {
  const { target = 'all', webhookUrl } = req.body || {};
  let activeWebhook = String(webhookUrl || systemSettings.googleSheetsWebhookUrl || (systemSettings.googleSheetsUrl?.includes('script.google.com/macros/s/') ? systemSettings.googleSheetsUrl : '')).trim();

  if (activeWebhook) {
    // Check if user accidentally pasted Apps Script editor link (/edit)
    if (activeWebhook.includes('script.google.com/d/') || (activeWebhook.includes('script.google.com') && activeWebhook.includes('/edit'))) {
      return res.json({
        success: false,
        needWebhook: true,
        message: 'Đường link Webhook bạn dán là link chỉnh sửa mã Apps Script (/edit), không phải Web App đã triển khai. Bạn cần vào Apps Script -> bấm nút [Triển khai] (Deploy) ở góc trên bên phải -> chọn [Tùy chọn triển khai mới] (New deployment) -> chọn loại [Ứng dụng web] (Web app) -> Ai có quyền truy cập chọn [Bất kỳ ai] (Anyone) -> Bấm Triển khai và copy đường link kết thúc bằng "/exec".',
      });
    }

    // Check if user pasted a regular Google Sheet link into Webhook box
    if (activeWebhook.includes('docs.google.com/spreadsheets') || activeWebhook.includes('drive.google.com')) {
      return res.json({
        success: false,
        needWebhook: true,
        message: 'Đường link bạn dán vào ô Webhook là link Google Sheets/Drive, không phải link Google Apps Script Web App. Vui lòng làm theo hướng dẫn ở Tab "Mã Apps Script Tự Động" bên dưới để lấy link Webhook.',
      });
    }

    systemSettings.googleSheetsWebhookUrl = activeWebhook;
    saveStore();
  }

  if (!activeWebhook) {
    return res.json({
      success: false,
      needWebhook: true,
      message: 'Google Sheets yêu cầu liên kết Webhook (Google Apps Script Web App) để máy chủ tự động đẩy dữ liệu lên bảng tính. Bạn hãy sao chép mã Apps Script ở Tab bên dưới, bấm Triển khai Web App rồi dán link vào ô Webhook, hoặc bấm nút "Tải File CSV" để nạp ngay.',
    });
  }

  const syncTimestamp = new Date().toISOString();
  const activeKey = devicePlainKeys[systemSettings.deviceId] || 'dvk_live_eco_01_a9f4c82b7e1039d';

  try {
    const payload: Record<string, any> = {
      action: target === 'settings' ? 'update_settings' : 'sync_all',
      timestamp: syncTimestamp,
      tds: latestSensorData.tds,
      soil_moisture: latestSensorData.soil_moisture,
      float_low: latestSensorData.float_low,
      float_high: latestSensorData.float_high,
      pump1: latestSensorData.pump1,
      pump2: latestSensorData.pump2,
      buzzer: latestSensorData.buzzer,
      note: 'Đồng bộ từ Dashboard EcoFarm',
      settings: {
        TDS_MIN: systemSettings.tdsMin,
        TDS_MAX: systemSettings.tdsMax,
        TDS_CRITICAL: systemSettings.tdsCritical,
        DO_AM_DAT_MIN: systemSettings.soilMoistureMin,
        DO_AM_DAT_MAX: systemSettings.soilMoistureMax,
        THOI_GIAN_BOM_1_MAX: systemSettings.pump1MaxContinuousMinutes,
        THOI_GIAN_TUOI_RAU: systemSettings.pump2IrrigationDurationSeconds,
        KHOANG_NGHI_TUOI: systemSettings.pump2RestIntervalMinutes,
        TU_DONG_NGAT_KHI_CAN: systemSettings.floatLowSafetyCutoff ? 'BAT' : 'TAT',
        COI_BUZZER_CANH_BAO: systemSettings.autoRules.buzzerOnCriticalAlert ? 'BAT' : 'TAT',
        CHU_KY_GUI_TIN_ESP: systemSettings.espReportIntervalSeconds,
        DEVICE_ID: systemSettings.deviceId,
        DEVICE_KEY: activeKey,
      },
    };

    const response = await fetch(activeWebhook, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const textRes = await response.text();
    let jsonRes: any = {};
    try {
      jsonRes = JSON.parse(textRes);
    } catch {
      jsonRes = { message: textRes };
    }

    systemSettings.lastSheetsSyncTime = syncTimestamp;
    systemSettings.lastSheetsSyncStatus = 'SUCCESS';
    systemSettings.lastSheetsSyncMessage = 'Đã đồng bộ thành công lên Google Sheets lúc ' + new Date().toLocaleTimeString('vi-VN');
    saveStore();

    res.json({
      success: true,
      message: 'Đã đẩy dữ liệu thành công lên 2 Tab của Google Sheets!',
      syncedAt: syncTimestamp,
      details: jsonRes,
    });
  } catch (err: any) {
    systemSettings.lastSheetsSyncTime = syncTimestamp;
    systemSettings.lastSheetsSyncStatus = 'ERROR';
    systemSettings.lastSheetsSyncMessage = 'Lỗi đẩy dữ liệu: ' + (err.message || 'Không thể kết nối tới Webhook');
    saveStore();

    res.json({
      success: false,
      message: 'Không thể kết nối đến Webhook Apps Script: ' + err.message,
    });
  }
});

// Download/Export Telemetry History as CSV for Tab 1 "DuLieu_NhatKy"
app.get('/api/sheets/telemetry-csv', (req, res) => {
  const csvLines = [
    'Thời Gian,TDS (ppm),Độ Ẩm Đất (%),Phao Đáy (LOW),Phao Tràn (HIGH),Bơm 1 (Tuần Hoàn),Bơm 2 (Tưới Rau),Còi Buzzer,Ghi Chú Trạng Thái',
  ];

  historyData.slice(-200).forEach((r) => {
    const timeStr = new Date(r.timestamp).toLocaleString('vi-VN');
    const floatLowStr = r.float_low ? 'BÌNH THƯỜNG' : 'CẠN NƯỚC (ALARM)';
    const floatHighStr = r.float_high ? 'TRÀN BỂ' : 'BÌNH THƯỜNG';
    const pump1Str = r.pump1 ? 'BẬT' : 'TẮT';
    const pump2Str = r.pump2 ? 'BẬT' : 'TẮT';
    const buzzerStr = r.buzzer ? 'BẬT' : 'TẮT';
    const note = r.tds > systemSettings.tdsMax ? 'TDS Cao' : r.soil_moisture < systemSettings.soilMoistureMin ? 'Đất Khô' : 'Ổn định';
    csvLines.push(`"${timeStr}",${r.tds},${r.soil_moisture},"${floatLowStr}","${floatHighStr}","${pump1Str}","${pump2Str}","${buzzerStr}","${note}"`);
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="DuLieu_NhatKy_EcoFarm.csv"');
  res.send('\uFEFF' + csvLines.join('\r\n'));
});

// Download/Export Settings as CSV for Tab 2 "CaiDat_HeThong" (Smart 5-column Distribution)
app.get('/api/sheets/settings-csv', (req, res) => {
  const activeKey = devicePlainKeys[systemSettings.deviceId] || 'dvk_live_eco_01_a9f4c82b7e1039d';
  const updateTime = new Date().toLocaleString('vi-VN');

  const csvLines = [
    'MÃ THÔNG SỐ (KEY),GIÁ TRỊ (VALUE),ĐƠN VỊ & Ý NGHĨA HOẠT ĐỘNG,NHÓM CẤU HÌNH,THỜI GIAN CẬP NHẬT',
    `TDS_MIN,${systemSettings.tdsMin},ppm - Dưới ngưỡng này kích hoạt cảnh báo thiếu dưỡng chất,[1. DINH DƯỠNG & NƯỚC],"${updateTime}"`,
    `TDS_MAX,${systemSettings.tdsMax},ppm - Ngưỡng an toàn tối đa cho ốc và cá,[1. DINH DƯỠNG & NƯỚC],"${updateTime}"`,
    `TDS_CRITICAL,${systemSettings.tdsCritical},ppm - Ngưỡng nguy cấp, còi kêu liên tục,[1. DINH DƯỠNG & NƯỚC],"${updateTime}"`,
    `DO_AM_DAT_MIN,${systemSettings.soilMoistureMin},% - Dưới ngưỡng này tự động bật Bơm 2 tưới rau,[2. GIÀN RAU & ĐỘ ẨM],"${updateTime}"`,
    `DO_AM_DAT_MAX,${systemSettings.soilMoistureMax},% - Đạt ngưỡng này tự động ngắt Bơm 2,[2. GIÀN RAU & ĐỘ ẨM],"${updateTime}"`,
    `THOI_GIAN_TUOI_RAU,${systemSettings.pump2IrrigationDurationSeconds},giây - Thời gian chạy bơm cho mỗi đợt tưới,[2. GIÀN RAU & ĐỘ ẨM],"${updateTime}"`,
    `KHOANG_NGHI_TUOI,${systemSettings.pump2RestIntervalMinutes},phút - Khoảng nghỉ giữa 2 lần tưới rau liên tiếp,[2. GIÀN RAU & ĐỘ ẨM],"${updateTime}"`,
    `THOI_GIAN_BOM_1_MAX,${systemSettings.pump1MaxContinuousMinutes},phút - Thời gian Bơm 1 tuần hoàn chạy liên tục tối đa,[3. BƠM TUẦN HOÀN],"${updateTime}"`,
    `TU_DONG_NGAT_KHI_CAN,${systemSettings.floatLowSafetyCutoff ? 'BAT' : 'TAT'},Tự động ngắt Bơm 1 ngay khi phao đáy báo cạn để chống cháy,[4. AN TOÀN & BÁO ĐỘNG],"${updateTime}"`,
    `COI_BUZZER_CANH_BAO,${systemSettings.autoRules.buzzerOnCriticalAlert ? 'BAT' : 'TAT'},Phát còi bíp cảnh báo khi hệ thống gặp sự cố khẩn cấp,[4. AN TOÀN & BÁO ĐỘNG],"${updateTime}"`,
    `CHU_KY_GUI_TIN_ESP,${systemSettings.espReportIntervalSeconds},giây - Chu kỳ gửi tin telemetry từ ESP32,[5. THIẾT BỊ & PHẦN CỨNG],"${updateTime}"`,
    `CHU_KY_GHI_SHEETS,${systemSettings.espSheetsSyncIntervalSeconds},giây - Chu kỳ đồng bộ tự động lên Google Sheets,[5. THIẾT BỊ & PHẦN CỨNG],"${updateTime}"`,
    `DEVICE_ID,"${systemSettings.deviceId}",Mã định danh phần cứng của trạm điều khiển,[5. THIẾT BỊ & PHẦN CỨNG],"${updateTime}"`,
    `DEVICE_KEY,"${activeKey}",Khóa xác thực bảo mật nạp vào firmware ESP32,[5. THIẾT BỊ & PHẦN CỨNG],"${updateTime}"`,
  ];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="CaiDat_HeThong_EcoFarm.csv"');
  res.send('\uFEFF' + csvLines.join('\r\n'));
});

// Full Google Apps Script Code Generator (Automates 2-Tab creation, smart data layout, & Webhook)
app.get('/api/sheets/apps-script-code', (req, res) => {
  const activeKey = devicePlainKeys[systemSettings.deviceId] || 'dvk_live_eco_01_a9f4c82b7e1039d';
  const scriptCode = `/**
 * ==============================================================================
 * HỆ THỐNG GIÁM SÁT AQUAPONICS ECOFARM - GOOGLE APPS SCRIPT ĐỒNG BỘ 2 TAB
 * - Tab 1: DuLieu_NhatKy (Nhật ký cảm biến đo đạc thời gian thực)
 * - Tab 2: CaiDat_HeThong (Bảng thông số cài đặt phân nhóm thông minh)
 * ==============================================================================
 */

// BƯỚC 1: Bấm nút "Chạy" (Run) hàm này ĐẦU TIÊN để tự động tạo 2 Tab và định dạng màu sắc
function khoiTaoHaiTabEcoFarm() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. TẠO TAB 1: DuLieu_NhatKy
  var sheet1 = ss.getSheetByName("DuLieu_NhatKy");
  if (!sheet1) {
    sheet1 = ss.insertSheet("DuLieu_NhatKy", 0);
  }
  sheet1.clear();
  var headers1 = [
    "Thời Gian",
    "TDS (ppm)",
    "Độ Ẩm Đất (%)",
    "Phao Đáy (LOW)",
    "Phao Tràn (HIGH)",
    "Bơm 1 (Tuần Hoàn)",
    "Bơm 2 (Tưới Rau)",
    "Còi Buzzer",
    "Ghi Chú Trạng Thái"
  ];
  sheet1.appendRow(headers1);
  var headerRange1 = sheet1.getRange(1, 1, 1, headers1.length);
  headerRange1.setBackground("#0f172a");
  headerRange1.setFontColor("#38bdf8");
  headerRange1.setFontWeight("bold");
  headerRange1.setHorizontalAlignment("center");
  sheet1.setFrozenRows(1);
  sheet1.autoResizeColumns(1, headers1.length);

  // 2. TẠO TAB 2: CaiDat_HeThong (5 Cột phân nhóm thông minh)
  var sheet2 = ss.getSheetByName("CaiDat_HeThong");
  if (!sheet2) {
    sheet2 = ss.insertSheet("CaiDat_HeThong", 1);
  }
  sheet2.clear();
  var headers2 = [
    "MÃ THÔNG SỐ (KEY)",
    "GIÁ TRỊ HIỆN TẠI (VALUE)",
    "ĐƠN VỊ & Ý NGHĨA HOẠT ĐỘNG",
    "NHÓM CẤU HÌNH",
    "THỜI GIAN CẬP NHẬT"
  ];
  sheet2.appendRow(headers2);
  var headerRange2 = sheet2.getRange(1, 1, 1, headers2.length);
  headerRange2.setBackground("#1e293b");
  headerRange2.setFontColor("#4ade80");
  headerRange2.setFontWeight("bold");
  headerRange2.setHorizontalAlignment("center");
  sheet2.setFrozenRows(1);

  var nowStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

  // Nạp sẵn 14 thông số cài đặt chia thành 5 nhóm cấu hình
  var settingsRows = [
    ["TDS_MIN", ${systemSettings.tdsMin}, "ppm - Dưới ngưỡng này cảnh báo thiếu dinh dưỡng", "[1. DINH DƯỠNG & NƯỚC]", nowStr],
    ["TDS_MAX", ${systemSettings.tdsMax}, "ppm - Ngưỡng an toàn tối đa cho ốc và cá", "[1. DINH DƯỠNG & NƯỚC]", nowStr],
    ["TDS_CRITICAL", ${systemSettings.tdsCritical}, "ppm - Ngưỡng nguy cấp, kích hoạt cảnh báo đỏ", "[1. DINH DƯỠNG & NƯỚC]", nowStr],
    ["DO_AM_DAT_MIN", ${systemSettings.soilMoistureMin}, "% - Dưới ngưỡng này tự động bật Bơm 2 tưới rau", "[2. GIÀN RAU & ĐỘ ẨM]", nowStr],
    ["DO_AM_DAT_MAX", ${systemSettings.soilMoistureMax}, "% - Đạt ngưỡng này tự động ngắt Bơm 2", "[2. GIÀN RAU & ĐỘ ẨM]", nowStr],
    ["THOI_GIAN_TUOI_RAU", ${systemSettings.pump2IrrigationDurationSeconds}, "giây - Thời gian mỗi đợt bơm tưới giàn rau", "[2. GIÀN RAU & ĐỘ ẨM]", nowStr],
    ["KHOANG_NGHI_TUOI", ${systemSettings.pump2RestIntervalMinutes}, "phút - Khoảng nghỉ giữa các đợt tưới liên tiếp", "[2. GIÀN RAU & ĐỘ ẨM]", nowStr],
    ["THOI_GIAN_BOM_1_MAX", ${systemSettings.pump1MaxContinuousMinutes}, "phút - Thời gian Bơm 1 tuần hoàn chạy liên tục tối đa", "[3. BƠM TUẦN HOÀN]", nowStr],
    ["TU_DONG_NGAT_KHI_CAN", "${systemSettings.floatLowSafetyCutoff ? 'BAT' : 'TAT'}", "Tự động ngắt Bơm 1 ngay khi phao đáy báo cạn để chống cháy", "[4. AN TOÀN & BÁO ĐỘNG]", nowStr],
    ["COI_BUZZER_CANH_BAO", "${systemSettings.autoRules.buzzerOnCriticalAlert ? 'BAT' : 'TAT'}", "Phát còi bíp cảnh báo khi hệ thống gặp sự cố khẩn cấp", "[4. AN TOÀN & BÁO ĐỘNG]", nowStr],
    ["CHU_KY_GUI_TIN_ESP", ${systemSettings.espReportIntervalSeconds}, "giây - Chu kỳ gửi tin telemetry từ ESP32", "[5. THIẾT BỊ & PHẦN CỨNG]", nowStr],
    ["CHU_KY_GHI_SHEETS", ${systemSettings.espSheetsSyncIntervalSeconds}, "giây - Chu kỳ tự động đồng bộ lên Google Sheets", "[5. THIẾT BỊ & PHẦN CỨNG]", nowStr],
    ["DEVICE_ID", "${systemSettings.deviceId}", "Mã định danh trạm điều khiển phần cứng", "[5. THIẾT BỊ & PHẦN CỨNG]", nowStr],
    ["DEVICE_KEY", "${activeKey}", "Khóa xác thực bảo mật nạp vào firmware ESP32", "[5. THIẾT BỊ & PHẦN CỨNG]", nowStr]
  ];

  for (var i = 0; i < settingsRows.length; i++) {
    sheet2.appendRow(settingsRows[i]);
  }
  sheet2.autoResizeColumns(1, headers2.length);

  // Xóa sheet rác mặc định nếu có tên "Trang tính 1" hoặc "Sheet1"
  var defaultSheet = ss.getSheetByName("Trang tính 1") || ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 2) {
    ss.deleteSheet(defaultSheet);
  }

  SpreadsheetApp.getUi().alert("✅ Đã khởi tạo thành công 2 Tab: 'DuLieu_NhatKy' và 'CaiDat_HeThong'!");
}

// BƯỚC 2: Nhận dữ liệu gửi từ Webhook để ghi vào Nhật Ký hoặc cập nhật Cài Đặt
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      data = e.parameter;
    }

    var nowStr = Utilities.formatDate(new Date(), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss");

    // 1. Ghi nhận dữ liệu cảm biến vào Tab 1: DuLieu_NhatKy
    if (data.action === "log_telemetry" || data.action === "sync_all" || data.tds !== undefined) {
      var sheet1 = ss.getSheetByName("DuLieu_NhatKy");
      if (!sheet1) {
        khoiTaoHaiTabEcoFarm();
        sheet1 = ss.getSheetByName("DuLieu_NhatKy");
      }
      sheet1.appendRow([
        data.timestamp ? Utilities.formatDate(new Date(data.timestamp), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss") : nowStr,
        Number(data.tds || 0),
        Number(data.soil_moisture || 0),
        data.float_low ? "BÌNH THƯỜNG" : "CẠN NƯỚC (ALARM)",
        data.float_high ? "TRÀN BỂ" : "BÌNH THƯỜNG",
        data.pump1 ? "BẬT" : "TẮT",
        data.pump2 ? "BẬT" : "TẮT",
        data.buzzer ? "BẬT" : "TẮT",
        data.note || "Tự động ghi nhận"
      ]);
    }

    // 2. Cập nhật bảng cài đặt vào Tab 2: CaiDat_HeThong
    if (data.action === "update_settings" || (data.action === "sync_all" && data.settings)) {
      var sheet2 = ss.getSheetByName("CaiDat_HeThong");
      if (!sheet2) {
        khoiTaoHaiTabEcoFarm();
        sheet2 = ss.getSheetByName("CaiDat_HeThong");
      }
      var settingsMap = data.settings || {};
      var values = sheet2.getDataRange().getValues();

      for (var r = 1; r < values.length; r++) {
        var key = values[r][0];
        if (key && settingsMap[key] !== undefined) {
          sheet2.getRange(r + 1, 2).setValue(settingsMap[key]);
          sheet2.getRange(r + 1, 5).setValue(nowStr);
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Đã cập nhật dữ liệu thành công lên 2 Tab!",
      timestamp: nowStr
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Cho phép đọc dữ liệu cài đặt từ xa
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet2 = ss.getSheetByName("CaiDat_HeThong");
  var settings = {};
  if (sheet2) {
    var rows = sheet2.getDataRange().getValues();
    for (var r = 1; r < rows.length; r++) {
      if (rows[r][0]) {
        settings[rows[r][0]] = rows[r][1];
      }
    }
  }
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    name: "EcoFarm Aquaponics",
    settings: settings
  })).setMimeType(ContentService.MimeType.JSON);
}`;

  res.json({ success: true, script: scriptCode });
});

// Periodic Background Auto-Sync Loop to Google Sheets Webhook
setInterval(async () => {
  const webhook = systemSettings.googleSheetsWebhookUrl || (systemSettings.googleSheetsUrl?.includes('script.google.com') ? systemSettings.googleSheetsUrl : null);
  if (!webhook) return;

  try {
    const syncTimestamp = new Date().toISOString();
    await fetch(webhook, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'log_telemetry',
        timestamp: syncTimestamp,
        tds: latestSensorData.tds,
        soil_moisture: latestSensorData.soil_moisture,
        float_low: latestSensorData.float_low,
        float_high: latestSensorData.float_high,
        pump1: latestSensorData.pump1,
        pump2: latestSensorData.pump2,
        buzzer: latestSensorData.buzzer,
        note: 'Đồng bộ tự động từ ESP32',
      }),
    });
    systemSettings.lastSheetsSyncTime = syncTimestamp;
    systemSettings.lastSheetsSyncStatus = 'SUCCESS';
    systemSettings.lastSheetsSyncMessage = 'Tự động đồng bộ thành công lúc ' + new Date().toLocaleTimeString('vi-VN');
  } catch (err: any) {
    systemSettings.lastSheetsSyncStatus = 'ERROR';
    systemSettings.lastSheetsSyncMessage = 'Lỗi tự động đồng bộ: ' + (err.message || 'Mất kết nối');
  }
}, Math.max(30, systemSettings.espSheetsSyncIntervalSeconds || 60) * 1000);

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
