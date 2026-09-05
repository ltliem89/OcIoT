import type {
  Project,
  Template,
  Zone,
  SensorConfig,
  ActuatorConfig,
  AlarmRule,
  ProjectConfigSnapshot,
  ConfigVersion,
  AuditLogItem,
  Device,
} from '../types.ts';

export const DEFAULT_PROJECT: Project = {
  id: 'proj_eco_01',
  name: 'Hệ Sinh Thái Tuần Hoàn OC IoT',
  description: 'Mô hình tuần hoàn lọc sinh học bèo tấm và ốc bươu đen kiểm soát tự động ESP32-S3',
  status: 'ACTIVE',
  activeConfigVersion: 1,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: new Date().toISOString(),
};

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: 'tmpl_aquaponics_v1',
    name: 'Aquaponics Bèo & Ốc Bươu (Chuẩn)',
    description: 'Bao gồm 5 cảm biến, 3 chấp hành, 5 vùng sinh thái và các quy tắc tự động',
    category: 'Aquaponics',
    sensorCount: 6,
    actuatorCount: 3,
    defaultAlarmCount: 4,
  },
  {
    id: 'tmpl_hydro_compact',
    name: 'Thủy Canh Rau Thủy Sinh Mini',
    description: 'Tối ưu cho bồn nhỏ, đo TDS và bơm tuần hoàn đơn kỳ',
    category: 'Hydroponics',
    sensorCount: 4,
    actuatorCount: 2,
    defaultAlarmCount: 3,
  },
];

export const DEFAULT_ZONES: Zone[] = [
  {
    id: 'zone_water',
    name: 'Vùng Nước',
    emoji: '💧',
    description: 'Bể thủy sinh, chất lượng khoáng TDS và cảm biến phao an toàn',
    order: 1,
  },
  {
    id: 'zone_plant',
    name: 'Vùng Thực Vật',
    emoji: '🌱',
    description: 'Thảm bèo hoa dâu / bèo tấm hấp thụ chất hữu cơ tự nhiên',
    order: 2,
  },
  {
    id: 'zone_bio',
    name: 'Vùng Sinh Vật',
    emoji: '🐌',
    description: 'Bể nuôi ốc bươu đen và khu vực bám nở cụm trứng',
    order: 3,
  },
  {
    id: 'zone_organic',
    name: 'Vùng Xử Lý Hữu Cơ',
    emoji: '🪱',
    description: 'Thảm đất giá thể vi sinh và hệ thống tưới phun sương',
    order: 4,
  },
  {
    id: 'zone_control',
    name: 'Vùng Điều Khiển',
    emoji: '⚙️',
    description: 'Relay chấp hành, còi báo động và quy tắc an toàn bảo vệ',
    order: 5,
  },
];

export const DEFAULT_SENSORS: SensorConfig[] = [
  {
    id: 'sens_tds',
    projectId: 'proj_eco_01',
    name: 'Chỉ Số TDS Nước',
    dataKey: 'tds',
    dataType: 'number',
    unit: 'ppm',
    displayType: 'VALUE',
    icon: 'Droplets',
    textColor: '#1e3a8a', // blue-900
    bgColor: '#eff6ff', // blue-50
    fontSize: 28,
    fontWeight: 'black',
    decimalPlaces: 0,
    min: 0,
    max: 1500,
    zoneId: 'zone_water',
    visible: true,
    showOnOverview: true,
    showOnMobile: true,
    order: 1,
  },
  {
    id: 'sens_moisture',
    projectId: 'proj_eco_01',
    name: 'Độ Ẩm Đất Vi Sinh',
    dataKey: 'soil_moisture',
    dataType: 'number',
    unit: '%',
    displayType: 'PROGRESS',
    icon: 'Sprout',
    textColor: '#064e3b', // emerald-900
    bgColor: '#ecfdf5', // emerald-50
    fontSize: 28,
    fontWeight: 'black',
    decimalPlaces: 0,
    min: 0,
    max: 100,
    zoneId: 'zone_organic',
    visible: true,
    showOnOverview: true,
    showOnMobile: true,
    order: 2,
  },
  {
    id: 'sens_water_level',
    projectId: 'proj_eco_01',
    name: 'Mực Nước Bể Phao',
    dataKey: 'float_low',
    dataType: 'boolean',
    unit: '',
    displayType: 'STATUS',
    icon: 'Gauge',
    textColor: '#0f766e', // teal-700
    bgColor: '#f0fdfa', // teal-50
    fontSize: 20,
    fontWeight: 'bold',
    decimalPlaces: 0,
    min: 0,
    max: 1,
    zoneId: 'zone_water',
    visible: true,
    showOnOverview: true,
    showOnMobile: true,
    order: 3,
  },
  {
    id: 'sens_duckweed',
    projectId: 'proj_eco_01',
    name: 'Độ Che Phủ Bèo AI',
    dataKey: 'duckweed_coverage',
    dataType: 'number',
    unit: '%',
    displayType: 'VALUE',
    icon: 'Sparkles',
    textColor: '#4c1d95', // purple-900
    bgColor: '#faf5ff', // purple-50
    fontSize: 26,
    fontWeight: 'black',
    decimalPlaces: 0,
    min: 0,
    max: 100,
    zoneId: 'zone_plant',
    visible: true,
    showOnOverview: true,
    showOnMobile: true,
    order: 4,
  },
  {
    id: 'sens_snail_eggs',
    projectId: 'proj_eco_01',
    name: 'Cụm Trứng Ốc Bươu',
    dataKey: 'snail_eggs',
    dataType: 'integer',
    unit: 'cụm',
    displayType: 'ICON_VALUE',
    icon: 'Target',
    textColor: '#831843', // pink-900
    bgColor: '#fdf2f8', // pink-50
    fontSize: 26,
    fontWeight: 'black',
    decimalPlaces: 0,
    min: 0,
    max: 30,
    zoneId: 'zone_bio',
    visible: true,
    showOnOverview: true,
    showOnMobile: true,
    order: 5,
  },
];

export const DEFAULT_ACTUATORS: ActuatorConfig[] = [
  {
    id: 'act_pump1',
    projectId: 'proj_eco_01',
    deviceId: 'ESP32S3_ECO_01',
    zoneId: 'zone_water',
    name: 'BƠM 1 (Lọc Tuần Hoàn Bèo)',
    dataKey: 'pump1',
    type: 'pump',
    activeState: true,
    safeState: false,
    maxRuntimeSec: 1800, // 30 minutes cutoff
    visible: true,
    order: 1,
  },
  {
    id: 'act_pump2',
    projectId: 'proj_eco_01',
    deviceId: 'ESP32S3_ECO_01',
    zoneId: 'zone_organic',
    name: 'BƠM 2 (Tưới Phun Sương Đất)',
    dataKey: 'pump2',
    type: 'pump',
    activeState: true,
    safeState: false,
    maxRuntimeSec: 120, // 2 minutes cutoff
    visible: true,
    order: 2,
  },
  {
    id: 'act_buzzer',
    projectId: 'proj_eco_01',
    deviceId: 'ESP32S3_ECO_01',
    zoneId: 'zone_control',
    name: 'CÒI BÁO ĐỘNG BUZZER',
    dataKey: 'buzzer',
    type: 'buzzer',
    activeState: true,
    safeState: false,
    maxRuntimeSec: 60, // 1 minute cutoff
    visible: true,
    order: 3,
  },
];

export const DEFAULT_ALARM_RULES: AlarmRule[] = [
  {
    id: 'rule_water_low',
    projectId: 'proj_eco_01',
    entityId: 'float_low',
    name: 'Cạn Nước Dưới Phao LOW',
    enabled: true,
    operator: '==',
    triggerValue: 0, // false
    clearOperator: '==',
    clearValue: 1, // true (water back above low float)
    durationSec: 3, // 3s debounce
    severity: 'CRITICAL',
    message: 'Mực nước tụt xuống dưới phao LOW. Nguy cơ cháy bơm lọc!',
    action: 'SHOW_IN_APP',
  },
  {
    id: 'rule_tds_high',
    projectId: 'proj_eco_01',
    entityId: 'tds',
    name: 'TDS Vượt Ngưỡng Cao',
    enabled: true,
    operator: '>',
    triggerValue: 750,
    clearOperator: '<',
    clearValue: 700, // Hysteresis 50 ppm
    durationSec: 10,
    severity: 'WARNING',
    message: 'Nồng độ TDS trong hồ vượt 750 ppm. Cần xả 15-20% nước đáy và bổ sung nước sạch.',
    action: 'SHOW_IN_APP',
  },
  {
    id: 'rule_moisture_low',
    projectId: 'proj_eco_01',
    entityId: 'soil_moisture',
    name: 'Độ Ẩm Đất Khô Hạn',
    enabled: true,
    operator: '<',
    triggerValue: 50,
    clearOperator: '>',
    clearValue: 60, // Hysteresis 10%
    durationSec: 10,
    severity: 'WARNING',
    message: 'Độ ẩm giá thể vi sinh tụt dưới 50%. Kích hoạt Bơm 2 tưới phun sương bù ẩm.',
    action: 'SHOW_IN_APP',
  },
  {
    id: 'rule_water_abnormal',
    projectId: 'proj_eco_01',
    entityId: 'float_high',
    name: 'Phao Nước Bất Thường',
    enabled: true,
    operator: '==',
    triggerValue: 1,
    clearOperator: '==',
    clearValue: 0,
    durationSec: 5,
    severity: 'CRITICAL',
    message: 'Mực nước chạm ngưỡng phao HIGH. Nguy cơ tràn bể nuôi!',
    action: 'SHOW_IN_APP',
  },
];

export const DEFAULT_DEVICES: Device[] = [
  {
    id: 'ESP32S3_ECO_01',
    projectId: 'proj_eco_01',
    name: 'Trạm Điều Khiển ESP32-S3 (Bể Chính)',
    type: 'ESP32_S3',
    templateId: 'tmpl_aquaponics_v1',
    firmwareVersion: 'v4.1.2-esp32s3',
    currentConfigVersion: 1,
    configHash: 'hash_esp_7a8f1b2c',
    online: true,
    lastHeartbeat: new Date().toISOString(),
    lastTelemetry: new Date().toISOString(),
    rssi: -62,
    ipAddress: '192.168.1.108',
    credentials: [
      {
        deviceId: 'ESP32S3_ECO_01',
        keyHash: 'sha256:d8a2...3f9c',
        keyVersion: 1,
        status: 'ACTIVE',
        createdAt: '2026-09-01T08:00:00.000Z',
        lastUsedAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'AIPC_VISION_01',
    projectId: 'proj_eco_01',
    name: 'Trạm AI Vision PC (Camera Góc Bể)',
    type: 'AI_PC',
    templateId: 'tmpl_aquaponics_v1',
    firmwareVersion: 'v4.0.0-gemini-vision',
    currentConfigVersion: 1,
    configHash: 'hash_ai_9b4e5f6a',
    online: true,
    lastHeartbeat: new Date().toISOString(),
    lastTelemetry: new Date().toISOString(),
    rssi: -50,
    ipAddress: '192.168.1.120',
    credentials: [
      {
        deviceId: 'AIPC_VISION_01',
        keyHash: 'sha256:f4e1...2b8a',
        keyVersion: 1,
        status: 'ACTIVE',
        createdAt: '2026-09-01T08:00:00.000Z',
        lastUsedAt: new Date().toISOString(),
      },
    ],
  },
];

export const DEFAULT_SNAPSHOT: ProjectConfigSnapshot = {
  project: DEFAULT_PROJECT,
  zones: DEFAULT_ZONES,
  sensors: DEFAULT_SENSORS,
  actuators: DEFAULT_ACTUATORS,
  alarmRules: DEFAULT_ALARM_RULES,
  aiConfig: {
    cameraStreamUrl: 'rtsp://192.168.1.120:8554/live',
    detectionScheduleSec: 30,
    roi: { x: 10, y: 15, width: 80, height: 70 },
    duckweedCoverageTarget: 75,
    snailEggsMinWarning: 2,
    sensitivity: 'medium',
  },
  esp32Config: {
    samplingRateSec: 2,
    reportIntervalSec: 5,
    waterFloatDebounceSec: 3,
    floatLowCutoffPump1: true,
    pump1MaxMinutes: 30,
    pump2DurationSec: 45,
    pump2RestMinutes: 15,
  },
};

export const DEFAULT_VERSIONS: ConfigVersion[] = [
  {
    version: 1,
    projectId: 'proj_eco_01',
    snapshot: DEFAULT_SNAPSHOT,
    createdBy: 'System Architect',
    createdAt: '2026-09-01T08:00:00.000Z',
    description: 'Phiên bản khởi tạo hệ sinh thái tuần hoàn V4 (Active Config)',
    status: 'ACTIVE',
  },
];

export const DEFAULT_CONFIG_VERSION: ConfigVersion = DEFAULT_VERSIONS[0];

export const DEFAULT_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'aud_001',
    who: 'System Architect',
    what: 'Cấu hình và kích hoạt phiên bản Active Config Version v1',
    when: '2026-09-01T08:00:00.000Z',
    projectId: 'proj_eco_01',
    deviceId: 'ESP32S3_ECO_01',
    configVersion: 1,
  },
];

// ----------------------------------------------------------------------
// WCAG Contrast Checker & Auto-Fixer
// ----------------------------------------------------------------------
function getLuminance(hexColor: string): number {
  const cleanHex = hexColor.replace('#', '');
  if (cleanHex.length !== 6) return 0.5;
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const a = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });

  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function checkContrast(textColor: string, bgColor: string): {
  ratio: number;
  isAccessible: boolean;
  score: 'AAA' | 'AA' | 'FAIL';
} {
  try {
    const l1 = getLuminance(textColor);
    const l2 = getLuminance(bgColor);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    const ratio = (lighter + 0.05) / (darker + 0.05);

    return {
      ratio: Math.round(ratio * 10) / 10,
      isAccessible: ratio >= 4.5,
      score: ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'FAIL',
    };
  } catch {
    return { ratio: 5.0, isAccessible: true, score: 'AA' };
  }
}

export function autoFixContrast(bgColor: string): { textColor: string } {
  const bgLum = getLuminance(bgColor);
  // If background is light (high luminance), text should be dark slate
  if (bgLum > 0.4) {
    return { textColor: '#0f172a' }; // slate-900
  }
  // If background is dark (low luminance), text should be crisp off-white
  return { textColor: '#f8fafc' }; // slate-50
}
