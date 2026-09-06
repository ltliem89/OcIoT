// V4.0 Schema Definitions: WEB / API HUB + MOBILE-FIRST IoT APP

export type TabId =
  | 'overview'
  | 'ecosystem'
  | 'vision'
  | 'alarms'
  | 'devices'
  // Secondary screens
  | 'settings'
  | 'history'
  | 'sheets'
  // Legacy aliases
  | 'dashboard'
  | 'control'
  | 'charts';

// ----------------------------------------------------------------------
// 1. Project, Template, Zones
// ----------------------------------------------------------------------
export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'MAINTENANCE';
  activeConfigVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  sensorCount: number;
  actuatorCount: number;
  defaultAlarmCount: number;
}

export interface Zone {
  id: string; // 'zone_water' | 'zone_plant' | 'zone_bio' | 'zone_organic' | 'zone_control'
  name: string;
  emoji: string;
  description: string;
  order: number;
}

// ----------------------------------------------------------------------
// 2. Sensor Builder & Display Builder
// ----------------------------------------------------------------------
export type DataType = 'number' | 'integer' | 'boolean' | 'string' | 'enum';

export type DisplayType =
  | 'VALUE'
  | 'STATUS'
  | 'GAUGE'
  | 'PROGRESS'
  | 'ICON_VALUE'
  | 'CHART'
  | 'TEXT'
  | 'SWITCH';

export interface SensorConfig {
  id: string;
  projectId: string;
  name: string; // Display name
  dataKey: string; // e.g. 'tds', 'soil_moisture', 'float_low', 'float_high', 'duckweed_coverage', 'snail_eggs'
  dataType: DataType;
  unit: string;
  displayType: DisplayType;
  icon: string;
  textColor: string;
  bgColor: string;
  fontSize: number; // 12 - 64 px
  fontWeight: 'normal' | 'medium' | 'semibold' | 'bold' | 'black';
  decimalPlaces: number;
  min: number;
  max: number;
  zoneId: string;
  visible: boolean;
  showOnOverview: boolean;
  showOnMobile: boolean;
  order: number;
}

// ----------------------------------------------------------------------
// 3. Actuator Builder
// ----------------------------------------------------------------------
export type ActuatorType = 'relay' | 'pump' | 'buzzer' | 'switch';

export interface ActuatorConfig {
  id: string;
  projectId: string;
  deviceId: string;
  zoneId: string;
  name: string;
  dataKey: string; // 'pump1', 'pump2', 'buzzer'
  type: ActuatorType;
  activeState: boolean; // active HIGH (true) or active LOW (false)
  safeState: boolean; // default off (false)
  maxRuntimeSec: number; // auto-cutoff max runtime
  visible: boolean;
  order: number;
}

// ----------------------------------------------------------------------
// 4. Alarm Builder & Active Alarms (Hysteresis & State lifecycle)
// ----------------------------------------------------------------------
export type AlarmOperator = '>' | '<' | '>=' | '<=' | '==' | '!=';
export type AlarmSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlarmAction = 'SHOW_IN_APP' | 'LOG_EVENT' | 'WEBHOOK';

export interface AlarmRule {
  id: string;
  projectId: string;
  entityId: string; // dataKey: 'tds', 'soil_moisture', 'float_low', etc.
  name: string;
  enabled: boolean;
  operator: AlarmOperator;
  triggerValue: number;
  clearOperator: AlarmOperator;
  clearValue: number; // Hysteresis clear value!
  durationSec: number; // Filter short transient spikes
  severity: AlarmSeverity;
  message: string;
  action: AlarmAction;
}

export type AlarmLifecycleState = 'NORMAL' | 'ACTIVE' | 'ACKNOWLEDGED' | 'CLEARED';

export interface ActiveAlarm {
  id: string;
  ruleId: string;
  entityId: string;
  state: AlarmLifecycleState;
  severity: AlarmSeverity;
  title: string;
  message: string;
  currentValue: number | boolean | string;
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  clearedAt?: string;
}

// ----------------------------------------------------------------------
// 5. Device & Key Provisioning (Cryptographic key, QR, Rotate, Revoke)
// ----------------------------------------------------------------------
export interface DeviceCredential {
  deviceId: string;
  keyHash: string; // SHA-256 fingerprint
  keyVersion: number;
  status: 'ACTIVE' | 'REVOKED';
  createdAt: string;
  revokedAt?: string;
  lastUsedAt?: string;
}

export interface Device {
  id: string;
  projectId: string;
  name: string;
  type: 'ESP32_S3' | 'ESP32_S2' | 'ESP32' | 'ESP32_C3' | 'AI_PC' | 'GENERIC_IOT';
  templateId: string;
  firmwareVersion: string;
  currentConfigVersion: number;
  configHash: string;
  online: boolean;
  lastHeartbeat: string;
  lastTelemetry: string;
  rssi: number;
  ipAddress?: string;
  activeKey?: string;
  credentials: DeviceCredential[];
}

export interface ProvisioningResult {
  deviceId: string;
  deviceKey: string; // shown ONLY ONCE on creation
  keyVersion: number;
  token: string;
  endpoint: string;
  protocolVersion: string;
  qrPayload: string;
  createdAt: string;
}

// ----------------------------------------------------------------------
// 6. Config Versions & Draft / Validate / Apply / Rollback
// ----------------------------------------------------------------------
export interface ProjectConfigSnapshot {
  project: Project;
  zones: Zone[];
  sensors: SensorConfig[];
  actuators: ActuatorConfig[];
  alarmRules: AlarmRule[];
  aiConfig: {
    cameraStreamUrl: string;
    detectionScheduleSec: number;
    roi: { x: number; y: number; width: number; height: number };
    duckweedCoverageTarget: number;
    snailEggsMinWarning: number;
    sensitivity: 'low' | 'medium' | 'high';
  };
  esp32Config: {
    samplingRateSec: number;
    reportIntervalSec: number;
    waterFloatDebounceSec: number;
    floatLowCutoffPump1: boolean;
    pump1MaxMinutes: number;
    pump2DurationSec: number;
    pump2RestMinutes: number;
  };
}

export interface ConfigVersion {
  version: number;
  projectId: string;
  snapshot: ProjectConfigSnapshot;
  createdBy: string;
  createdAt: string;
  description: string;
  status: 'ACTIVE' | 'ARCHIVED';
}

export interface AuditLogItem {
  id: string;
  who: string;
  what: string;
  before?: string;
  after?: string;
  when: string;
  projectId: string;
  deviceId?: string;
  configVersion: number;
}

// Command execution UX state
export type CommandExecutionState =
  | 'IDLE'
  | 'SENDING'
  | 'ACCEPTED'
  | 'APPLYING'
  | 'CONFIRMED'
  | 'FAILED';

// ----------------------------------------------------------------------
// Telemetry & Runtime Data
// ----------------------------------------------------------------------
export interface SensorData {
  device_id: string;
  timestamp: string;
  tds: number | null;
  soil_moisture: number | null;
  float_low: boolean;
  float_high: boolean;
  pump1: boolean;
  pump2: boolean;
  buzzer: boolean;
  wifi_rssi?: number;
  mode?: 'MANUAL' | 'AUTO';
}

export interface IoTStatus {
  online: boolean;
  device_id: string;
  last_update: string | null;
  wifi_rssi: number;
  mode: 'MANUAL' | 'AUTO';
  current_data: SensorData | null;
  commands_queue: ControlCommand[];
}

export interface ControlCommand {
  id?: string;
  timestamp?: string;
  pump1?: boolean;
  pump2?: boolean;
  buzzer?: boolean;
  mode?: 'MANUAL' | 'AUTO';
  status?: 'PENDING' | 'ACCEPTED' | 'APPLYING' | 'EXECUTED';
}

export interface DuckweedVision {
  detected: boolean;
  coverage: number; // 0 - 100%
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  confidence: number; // 0 - 100%
}

export interface SnailEggsVision {
  detected: boolean;
  egg_clusters: number;
  hatching: 'POSSIBLE' | 'NO' | 'HATCHING';
  confidence: number;
}

export interface AIVisionResult {
  timestamp: string;
  image_url?: string;
  duckweed: DuckweedVision;
  snail_eggs: SnailEggsVision;
  notes?: string;
}

export interface EcosystemAnalysis {
  timestamp: string;
  summary: string;
  trend: string;
  anomaly: string;
  recommendations: string[];
  status_rating: 'TỐT' | 'CẦN CHÚ Ý' | 'CẢNH BÁO';
}

export interface AlertItem {
  id: string;
  level: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  source: 'ESP32' | 'WATER' | 'SOIL' | 'TDS' | 'CAMERA' | 'AI';
  timestamp: string;
}

export interface GoogleSheetsData {
  connected: boolean;
  url: string;
  webhookUrl?: string;
  spreadsheetId: string | null;
  lastUpdate: string | null;
  lastSyncTime?: string | null;
  lastSyncStatus?: 'SUCCESS' | 'ERROR' | 'IDLE';
  lastSyncMessage?: string;
  rowsCount: number;
  records: SensorData[];
  message?: string;
  isNewOrEmpty?: boolean;
  appsScriptUrl?: string;
  error?: string;
}

export interface SystemSettings {
  deviceId: string;
  offlineTimeoutSeconds: number;
  googleSheetsUrl: string;
  googleSheetsWebhookUrl?: string;
  lastSheetsSyncTime?: string | null;
  lastSheetsSyncStatus?: 'SUCCESS' | 'ERROR' | 'IDLE';
  lastSheetsSyncMessage?: string;

  tdsMin: number;
  tdsMax: number;
  tdsCritical: number;
  tdsCalibrationOffset: number;

  soilMoistureMin: number;
  soilMoistureMax: number;
  soilMoistureCritical: number;
  soilMoistureCalibrationOffset: number;

  waterFloatDebounceSeconds: number;
  floatLowSafetyCutoff: boolean;
  floatHighAlert: boolean;

  pump1MaxContinuousMinutes: number;
  pump2IrrigationDurationSeconds: number;
  pump2RestIntervalMinutes: number;
  buzzerAlertDurationSeconds: number;
  buzzerMode: 'CONTINUOUS' | 'BEEP_INTERVAL' | 'CRITICAL_ONLY';

  espReportIntervalSeconds: number;
  espSheetsSyncIntervalSeconds: number;

  autoRules: {
    lowWaterCutPump1: boolean;
    lowMoistureStartPump2: boolean;
    buzzerOnCriticalAlert: boolean;
  };
  cameraStreamUrl: string;
  aiSensitivity: 'low' | 'medium' | 'high';
}

export interface SettingsDiffItem {
  key: string;
  label: string;
  oldValue: any;
  newValue: any;
  unit?: string;
}

export interface SettingsHistoryEntry {
  id: string;
  timestamp: string;
  source: 'WEB_DASHBOARD' | 'ESP_SYNC' | 'ROLLBACK' | 'IMPORT' | 'GOOGLE_SHEETS';
  description: string;
  changes: SettingsDiffItem[];
  snapshot: SystemSettings;
}
