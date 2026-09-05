import type { SystemSettings, SettingsHistoryEntry, SettingsDiffItem } from '../types.ts';

const SETTINGS_KEY_LABELS: Record<string, { label: string; unit?: string }> = {
  tdsMin: { label: 'TDS Tối Thiểu (Cảnh báo thiếu dinh dưỡng)', unit: 'ppm' },
  tdsMax: { label: 'TDS Tối Đa (Ngưỡng an toàn ốc & cá)', unit: 'ppm' },
  tdsCritical: { label: 'TDS Nguy Cấp (Báo động khẩn cấp)', unit: 'ppm' },
  tdsCalibrationOffset: { label: 'Hiệu chuẩn lệch cảm biến TDS', unit: 'ppm' },
  soilMoistureMin: { label: 'Độ ẩm đất tối thiểu (Bật bơm tưới)', unit: '%' },
  soilMoistureMax: { label: 'Độ ẩm đất tối đa (Ngắt bơm tưới)', unit: '%' },
  soilMoistureCritical: { label: 'Độ ẩm đất nguy cấp (Đất quá khô)', unit: '%' },
  soilMoistureCalibrationOffset: { label: 'Hiệu chuẩn độ ẩm đất', unit: '%' },
  waterFloatDebounceSeconds: { label: 'Lọc nhiễu dao động sóng phao nước', unit: 'giây' },
  floatLowSafetyCutoff: { label: 'Tự động ngắt Bơm 1 khi phao đáy báo cạn' },
  floatHighAlert: { label: 'Cảnh báo phao đỉnh báo tràn bể' },
  pump1MaxContinuousMinutes: { label: 'Bơm 1 tuần hoàn chạy liên tục tối đa', unit: 'phút' },
  pump2IrrigationDurationSeconds: { label: 'Thời gian Bơm 2 tưới rau mỗi chu kỳ', unit: 'giây' },
  pump2RestIntervalMinutes: { label: 'Khoảng nghỉ giữa các lần tưới rau', unit: 'phút' },
  buzzerAlertDurationSeconds: { label: 'Thời lượng còi buzzer kêu khi có sự cố', unit: 'giây' },
  buzzerMode: { label: 'Chế độ âm thanh còi buzzer' },
  espReportIntervalSeconds: { label: 'Chu kỳ ESP32 gửi tin telemetry', unit: 'giây' },
  espSheetsSyncIntervalSeconds: { label: 'Chu kỳ tự động ghi lên Google Sheets', unit: 'giây' },
  offlineTimeoutSeconds: { label: 'Thời gian trễ xác định thiết bị Offline', unit: 'giây' },
  cameraStreamUrl: { label: 'URL Luồng Camera AI Vision' },
  aiSensitivity: { label: 'Độ nhạy phân tích Gemini Vision' },
  'autoRules.lowWaterCutPump1': { label: 'Tự động ngắt Bơm 1 khi cạn nước' },
  'autoRules.lowMoistureStartPump2': { label: 'Tự động bật Bơm 2 khi đất khô' },
  'autoRules.buzzerOnCriticalAlert': { label: 'Phát còi bíp khi gặp sự cố nguy cấp' },
};

const STORAGE_KEY = 'ecofarm_settings_audit_history';

export function computeSettingsDiff(
  oldSettings: Partial<SystemSettings>,
  newSettings: Partial<SystemSettings>
): SettingsDiffItem[] {
  const diffs: SettingsDiffItem[] = [];

  const checkKey = (key: string, oldVal: any, newVal: any) => {
    if (oldVal === undefined && newVal === undefined) return;
    if (oldVal !== newVal && JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      const meta = SETTINGS_KEY_LABELS[key] || { label: key };
      diffs.push({
        key,
        label: meta.label,
        oldValue: oldVal ?? 'Chưa đặt',
        newValue: newVal ?? 'Mặc định',
        unit: meta.unit,
      });
    }
  };

  const allKeys = new Set([...Object.keys(oldSettings || {}), ...Object.keys(newSettings || {})]);

  for (const k of allKeys) {
    if (k === 'lastSheetsSyncTime' || k === 'lastSheetsSyncStatus' || k === 'lastSheetsSyncMessage') continue;
    if (k === 'autoRules') {
      const oldRules = (oldSettings as any)?.autoRules || {};
      const newRules = (newSettings as any)?.autoRules || {};
      checkKey('autoRules.lowWaterCutPump1', oldRules.lowWaterCutPump1, newRules.lowWaterCutPump1);
      checkKey('autoRules.lowMoistureStartPump2', oldRules.lowMoistureStartPump2, newRules.lowMoistureStartPump2);
      checkKey('autoRules.buzzerOnCriticalAlert', oldRules.buzzerOnCriticalAlert, newRules.buzzerOnCriticalAlert);
    } else {
      checkKey(k, (oldSettings as any)?.[k], (newSettings as any)?.[k]);
    }
  }

  return diffs;
}

export function getLocalSettingsHistory(): SettingsHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  // Default seed history baseline so user has context immediately
  const seed: SettingsHistoryEntry[] = [
    {
      id: 'cfg_init_v4',
      timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      source: 'IMPORT',
      description: 'Khởi tạo cấu hình trang trại sinh thái chuẩn (Baseline v4.2)',
      changes: [
        { key: 'tdsMin', label: 'TDS Tối Thiểu (Cảnh báo thiếu dinh dưỡng)', oldValue: 'Chưa đặt', newValue: 200, unit: 'ppm' },
        { key: 'tdsMax', label: 'TDS Tối Đa (Ngưỡng an toàn ốc & cá)', oldValue: 'Chưa đặt', newValue: 750, unit: 'ppm' },
        { key: 'soilMoistureMin', label: 'Độ ẩm đất tối thiểu (Bật bơm tưới)', oldValue: 'Chưa đặt', newValue: 50, unit: '%' },
        { key: 'pump2IrrigationDurationSeconds', label: 'Thời gian Bơm 2 tưới rau mỗi chu kỳ', oldValue: 'Chưa đặt', newValue: 45, unit: 'giây' },
      ],
      snapshot: {
        deviceId: 'ESP32S3_ECO_01',
        offlineTimeoutSeconds: 45,
        googleSheetsUrl: '',
        tdsMin: 200,
        tdsMax: 750,
        tdsCritical: 950,
        tdsCalibrationOffset: 0,
        soilMoistureMin: 50,
        soilMoistureMax: 80,
        soilMoistureCritical: 30,
        soilMoistureCalibrationOffset: 0,
        waterFloatDebounceSeconds: 3,
        floatLowSafetyCutoff: true,
        floatHighAlert: true,
        pump1MaxContinuousMinutes: 45,
        pump2IrrigationDurationSeconds: 45,
        pump2RestIntervalMinutes: 30,
        buzzerAlertDurationSeconds: 15,
        buzzerMode: 'CRITICAL_ONLY',
        espReportIntervalSeconds: 5,
        espSheetsSyncIntervalSeconds: 60,
        autoRules: {
          lowWaterCutPump1: true,
          lowMoistureStartPump2: true,
          buzzerOnCriticalAlert: true,
        },
        cameraStreamUrl: 'http://192.168.1.100:8080/video',
        aiSensitivity: 'medium',
      },
    },
  ];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  } catch {}

  return seed;
}

export function saveLocalSettingsHistory(entries: SettingsHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 50))); // Keep last 50 revisions
  } catch {}
}

export function addSettingsHistoryEntry(
  oldSettings: SystemSettings,
  newSettings: SystemSettings,
  source: 'WEB_DASHBOARD' | 'ESP_SYNC' | 'ROLLBACK' | 'IMPORT' | 'GOOGLE_SHEETS' = 'WEB_DASHBOARD',
  customDescription?: string
): SettingsHistoryEntry | null {
  const diffs = computeSettingsDiff(oldSettings, newSettings);
  if (diffs.length === 0 && source !== 'ROLLBACK') {
    return null; // No change
  }

  const defaultDesc =
    source === 'ROLLBACK'
      ? 'Khôi phục cài đặt về phiên bản trước'
      : source === 'ESP_SYNC'
      ? 'Đồng bộ ngưỡng xuống phần cứng ESP32-S3'
      : source === 'GOOGLE_SHEETS'
      ? 'Đồng bộ cấu hình từ Google Sheets'
      : `Cập nhật ${diffs.length} thông số từ Dashboard`;

  const newEntry: SettingsHistoryEntry = {
    id: `cfg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    source,
    description: customDescription || defaultDesc,
    changes: diffs,
    snapshot: JSON.parse(JSON.stringify(newSettings)),
  };

  const existing = getLocalSettingsHistory();
  const updated = [newEntry, ...existing];
  saveLocalSettingsHistory(updated);

  // Also notify server endpoint in background if online
  fetch('/api/settings/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newEntry),
  }).catch(() => {});

  return newEntry;
}

export function exportSettingsHistoryCsv(history: SettingsHistoryEntry[]): string {
  const headers = ['Mã Phiên Bản', 'Thời Gian Cập Nhật', 'Nguồn Thay Đổi', 'Mô Tả Thao Tác', 'Chi Tiết Thông Số Thay Đổi'];
  const rows = history.map((entry) => {
    const timeStr = new Date(entry.timestamp).toLocaleString('vi-VN');
    const changeSummary = entry.changes
      .map((c) => `${c.label}: [${c.oldValue} -> ${c.newValue}${c.unit ? ' ' + c.unit : ''}]`)
      .join('; ');

    const sourceMap: Record<string, string> = {
      WEB_DASHBOARD: 'Giao diện Web Dashboard',
      ESP_SYNC: 'Đồng bộ vi điều khiển ESP32',
      ROLLBACK: 'Khôi phục phiên bản cũ',
      IMPORT: 'Khởi tạo hệ thống',
      GOOGLE_SHEETS: 'Từ Google Sheets',
    };

    return [
      `"${entry.id}"`,
      `"${timeStr}"`,
      `"${sourceMap[entry.source] || entry.source}"`,
      `"${entry.description.replace(/"/g, '""')}"`,
      `"${(changeSummary || 'Không đổi').replace(/"/g, '""')}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}
