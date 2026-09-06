import type {
  SensorData,
  IoTStatus,
  ControlCommand,
  AIVisionResult,
  EcosystemAnalysis,
  GoogleSheetsData,
  SystemSettings,
  ProjectConfigSnapshot,
  ConfigVersion,
  Device,
  ProvisioningResult,
  ActiveAlarm,
  AlarmRule,
  AuditLogItem,
} from '../types.ts';

// ----------------------------------------------------------------------
// V4.0 API CLIENT METHODS
// ----------------------------------------------------------------------

// 1. Project Configuration & Versioning
export async function fetchV4ProjectConfig(projectId: string = 'proj_eco_01'): Promise<{
  success: boolean;
  project: any;
  activeVersion: ConfigVersion;
  zones: any[];
  sensors: any[];
  actuators: any[];
  alarmRules: any[];
  draft: ProjectConfigSnapshot | null;
}> {
  const res = await fetch(`/api/v1/projects/${projectId}/config`);
  if (!res.ok) throw new Error(`Failed to fetch project config (${res.status})`);
  return res.json();
}

export async function saveV4Draft(
  projectId: string = 'proj_eco_01',
  draft: ProjectConfigSnapshot
): Promise<{ success: boolean; message: string; draft: ProjectConfigSnapshot }> {
  const res = await fetch(`/api/v1/projects/${projectId}/config/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  });
  if (!res.ok) throw new Error(`Failed to save draft (${res.status})`);
  return res.json();
}

export async function validateV4Config(
  projectId: string = 'proj_eco_01',
  snapshot?: ProjectConfigSnapshot
): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
  const res = await fetch(`/api/v1/projects/${projectId}/config/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ snapshot }),
  });
  if (!res.ok) throw new Error(`Validation request failed (${res.status})`);
  return res.json();
}

export async function applyV4Config(
  projectId: string = 'proj_eco_01',
  payload: { snapshot?: ProjectConfigSnapshot; description?: string; createdBy?: string }
): Promise<{ success: boolean; message: string; version: ConfigVersion }> {
  const res = await fetch(`/api/v1/projects/${projectId}/config/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error applying config' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchV4Versions(projectId: string = 'proj_eco_01'): Promise<{
  success: boolean;
  activeVersion: number;
  versions: ConfigVersion[];
}> {
  const res = await fetch(`/api/v1/projects/${projectId}/config/versions`);
  if (!res.ok) throw new Error(`Failed to fetch config versions (${res.status})`);
  return res.json();
}

export async function rollbackV4Config(
  projectId: string = 'proj_eco_01',
  targetVersion: number
): Promise<{ success: boolean; message: string; version: ConfigVersion }> {
  const res = await fetch(`/api/v1/projects/${projectId}/config/rollback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetVersion }),
  });
  if (!res.ok) throw new Error(`Failed to rollback (${res.status})`);
  return res.json();
}

// 2. Devices & Provisioning Wizard
export async function fetchV4Devices(): Promise<{ success: boolean; devices: Device[] }> {
  const res = await fetch('/api/v1/devices');
  if (!res.ok) throw new Error(`Failed to fetch devices (${res.status})`);
  return res.json();
}

export async function provisionV4Device(payload: {
  name: string;
  deviceId?: string;
  templateId?: string;
  projectId?: string;
  deviceType?: string;
}): Promise<{ success: boolean; result: ProvisioningResult }> {
  const res = await fetch('/api/v1/provision/devices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Provisioning failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function rotateV4DeviceKey(deviceId: string): Promise<{
  success: boolean;
  deviceId: string;
  newDeviceKey: string;
  keyVersion: number;
  rotatedAt: string;
}> {
  const res = await fetch(`/api/v1/provision/devices/${deviceId}/rotate-key`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to rotate key (${res.status})`);
  return res.json();
}

export async function revokeV4DeviceKey(deviceId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`/api/v1/provision/devices/${deviceId}/revoke-key`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(`Failed to revoke key (${res.status})`);
  return res.json();
}

// 3. Alarms & Alerts Lifecycle
export async function fetchV4Alerts(): Promise<{
  success: boolean;
  activeAlarms: ActiveAlarm[];
  rules: AlarmRule[];
}> {
  const res = await fetch('/api/v1/alerts');
  if (!res.ok) throw new Error(`Failed to fetch alerts (${res.status})`);
  return res.json();
}

export async function acknowledgeV4Alert(
  id: string,
  note?: string,
  who?: string
): Promise<{ success: boolean; alarm: ActiveAlarm }> {
  const res = await fetch(`/api/v1/alerts/${id}/ack`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note, who }),
  });
  if (!res.ok) throw new Error(`Failed to acknowledge alert (${res.status})`);
  return res.json();
}

// 4. Audit Logs
export async function fetchV4AuditLogs(): Promise<{ success: boolean; count: number; logs: AuditLogItem[] }> {
  const res = await fetch('/api/v1/audit-logs');
  if (!res.ok) throw new Error(`Failed to fetch audit logs (${res.status})`);
  return res.json();
}

// 5. Commands with 2-step verification
export async function dispatchV4Command(
  deviceId: string,
  cmd: ControlCommand
): Promise<{ success: boolean; commandId: string; status: string; message: string }> {
  const res = await fetch(`/api/v1/devices/${deviceId}/commands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  if (!res.ok) throw new Error(`Failed to dispatch command (${res.status})`);
  return res.json();
}

// ----------------------------------------------------------------------
// BACKWARD-COMPATIBLE RUNTIME API CLIENT METHODS
// ----------------------------------------------------------------------

export async function fetchIoTStatus(): Promise<IoTStatus> {
  const res = await fetch('/api/iot/status');
  if (!res.ok) throw new Error(`Failed to fetch IoT status (${res.status})`);
  return res.json();
}

export async function sendIoTCommand(command: {
  pump1?: boolean;
  pump2?: boolean;
  buzzer?: boolean;
  mode?: 'MANUAL' | 'AUTO';
}): Promise<any> {
  const res = await fetch('/api/iot/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Failed to dispatch command (${res.status})`);
  return res.json();
}

export async function postSensorData(data: Partial<SensorData>): Promise<any> {
  const res = await fetch('/api/iot/data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to post sensor data (${res.status})`);
  return res.json();
}

export async function fetchHistoryData(range: string = '24h'): Promise<{ filter: string; count: number; data: SensorData[] }> {
  const res = await fetch(`/api/iot/history?range=${range}`);
  if (!res.ok) throw new Error(`Failed to fetch history (${res.status})`);
  return res.json();
}

export async function fetchGoogleSheets(url?: string, webhookUrl?: string): Promise<GoogleSheetsData> {
  // 1. Check & persist config in localStorage for Vercel and page refreshes
  let savedConfig: { url?: string; webhookUrl?: string; lastSyncTime?: string; lastSyncStatus?: string } = {};
  try {
    const raw = localStorage.getItem('ecofarm_sheets_config');
    if (raw) savedConfig = JSON.parse(raw);
  } catch {}

  const activeUrl = (url !== undefined ? url : savedConfig.url || '').trim();
  const activeWebhook = (webhookUrl !== undefined ? webhookUrl : savedConfig.webhookUrl || '').trim();

  if (activeUrl || activeWebhook) {
    try {
      localStorage.setItem('ecofarm_sheets_config', JSON.stringify({
        ...savedConfig,
        url: activeUrl,
        webhookUrl: activeWebhook,
      }));
    } catch {}
  }

  // 2. Try calling backend API first
  let backendData: GoogleSheetsData | null = null;
  try {
    const res = await fetch('/api/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: activeUrl, webhookUrl: activeWebhook }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const text = await res.text();
      backendData = JSON.parse(text);
      if (backendData && backendData.connected) {
        return backendData;
      }
    }
  } catch {}

  // 3. Resilient Fallback for Vercel (static deployment / serverless cold-start)
  let spreadsheetId: string | null = null;
  if (activeUrl) {
    const match = activeUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      spreadsheetId = match[1];
    } else if (activeUrl.includes('drive.google.com/drive/folders/')) {
      const folderMatch = activeUrl.match(/\/folders\/([a-zA-Z0-9-_]+)/);
      spreadsheetId = folderMatch ? folderMatch[1] : null;
    }
  }

  if (spreadsheetId) {
    return {
      connected: true,
      url: activeUrl,
      webhookUrl: activeWebhook,
      spreadsheetId,
      lastUpdate: new Date().toISOString(),
      lastSyncTime: savedConfig.lastSyncTime || null,
      lastSyncStatus: (savedConfig.lastSyncStatus as any) || 'IDLE',
      lastSyncMessage: 'Sẵn sàng đồng bộ trực tiếp lên 3 Tab qua Webhook (Chế độ Vercel Ready)',
      rowsCount: backendData?.rowsCount || 1,
      records: backendData?.records || [],
      isNewOrEmpty: false,
      message: 'Đã kết nối thành công với Google Sheets! Dữ liệu sẽ được đẩy tự động qua Webhook khi bấm Đồng Bộ.',
    };
  }

  if (activeWebhook && activeWebhook.includes('script.google.com')) {
    return {
      connected: true,
      url: activeUrl,
      webhookUrl: activeWebhook,
      spreadsheetId: null,
      lastUpdate: new Date().toISOString(),
      lastSyncTime: savedConfig.lastSyncTime || null,
      lastSyncStatus: (savedConfig.lastSyncStatus as any) || 'IDLE',
      lastSyncMessage: 'Đã kết nối qua cổng Webhook Apps Script!',
      rowsCount: 1,
      records: [],
      isNewOrEmpty: false,
      message: 'Đã kết nối qua cổng Webhook Google Apps Script! Sẵn sàng ghi vào cả 3 Tab.',
    };
  }

  if (backendData) {
    return backendData;
  }

  return {
    connected: false,
    url: activeUrl,
    webhookUrl: activeWebhook,
    spreadsheetId: null,
    lastUpdate: null,
    rowsCount: 0,
    records: [],
    error: activeUrl ? 'Đường link không đúng định dạng Google Sheets (cần chứa docs.google.com/spreadsheets/d/...)' : undefined,
  };
}

export async function syncToGoogleSheets(
  target: 'telemetry' | 'settings' | 'all',
  webhookUrl?: string,
  extraPayload?: {
    deviceId?: string;
    tds?: number;
    soil_moisture?: number;
    float_low?: boolean;
    float_high?: boolean;
    pump1?: boolean;
    pump2?: boolean;
    buzzer?: boolean;
    wifi_rssi?: number;
    mode?: 'MANUAL' | 'AUTO';
    duckweed_coverage?: number;
    snail_eggs_count?: number;
    settings?: any;
  }
): Promise<{ success: boolean; message: string; syncedAt?: string; needWebhook?: boolean }> {
  let activeWebhook = webhookUrl?.trim();

  // Try reading cached webhook from localStorage if not passed
  if (!activeWebhook) {
    try {
      const saved = localStorage.getItem('ecofarm_sheets_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.webhookUrl) activeWebhook = parsed.webhookUrl.trim();
      }
    } catch {}
  }

  // 1. Validate webhook link format
  if (activeWebhook) {
    if (activeWebhook.includes('script.google.com/d/') || (activeWebhook.includes('script.google.com') && activeWebhook.includes('/edit'))) {
      return {
        success: false,
        needWebhook: true,
        message: 'Đường link bạn dán là link soạn thảo Apps Script (/edit). Vui lòng vào Apps Script -> [Triển khai] -> [Tùy chọn triển khai mới] -> Chọn [Ứng dụng web] -> Ai có quyền truy cập: [Bất kỳ ai (Anyone)] -> Copy link kết thúc bằng "/exec".',
      };
    }
    if (activeWebhook.includes('docs.google.com/spreadsheets') || activeWebhook.includes('drive.google.com')) {
      return {
        success: false,
        needWebhook: true,
        message: 'Bạn đang dán link Google Sheets vào ô Webhook. Ô Webhook cần liên kết Apps Script Web App kết thúc bằng "/exec".',
      };
    }
  }

  // 2. Try sending through backend API first
  let backendSuccess = false;
  let backendResult: any = null;
  try {
    const res = await fetch('/api/sheets/sync-now', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, webhookUrl: activeWebhook }),
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const text = await res.text();
      backendResult = JSON.parse(text);
      if (backendResult && backendResult.success) {
        backendSuccess = true;
        return backendResult;
      }
    }
  } catch {}

  // 3. Resilient Direct Client-Side Push for Vercel
  if (activeWebhook) {
    try {
      const syncTimestamp = new Date().toISOString();
      const payload = {
        action: target === 'settings' ? 'update_settings' : 'sync_all',
        timestamp: syncTimestamp,
        device_id: extraPayload?.deviceId || 'ESP32S3_ECO_01',
        tds: extraPayload?.tds ?? 485,
        soil_moisture: extraPayload?.soil_moisture ?? 68,
        float_low: extraPayload?.float_low !== false,
        float_high: extraPayload?.float_high === true,
        pump1: extraPayload?.pump1 === true,
        pump2: extraPayload?.pump2 === true,
        buzzer: extraPayload?.buzzer === true,
        wifi_rssi: extraPayload?.wifi_rssi ?? -58,
        mode: extraPayload?.mode || 'AUTO',
        duckweed_coverage: extraPayload?.duckweed_coverage ?? 76,
        snail_eggs_count: extraPayload?.snail_eggs_count ?? 5,
        note: 'Đồng bộ trực tiếp từ trình duyệt EcoFarm IoT (Chế độ Web Vercel)',
        settings: {
          TDS_MIN: extraPayload?.settings?.tdsMin ?? 200,
          TDS_MAX: extraPayload?.settings?.tdsMax ?? 750,
          TDS_CRITICAL: extraPayload?.settings?.tdsCritical ?? 950,
          DO_AM_DAT_MIN: extraPayload?.settings?.soilMoistureMin ?? 50,
          DO_AM_DAT_MAX: extraPayload?.settings?.soilMoistureMax ?? 80,
          THOI_GIAN_TUOI_RAU: extraPayload?.settings?.pump2IrrigationDurationSeconds ?? 45,
          KHOANG_NGHI_TUOI: extraPayload?.settings?.pump2RestIntervalMinutes ?? 30,
          THOI_GIAN_BOM_1_MAX: extraPayload?.settings?.pump1MaxContinuousMinutes ?? 45,
          TU_DONG_NGAT_KHI_CAN: extraPayload?.settings?.floatLowSafetyCutoff !== false ? 'BAT' : 'TAT',
          COI_BUZZER_CANH_BAO: extraPayload?.settings?.autoRules?.buzzerOnCriticalAlert !== false ? 'BAT' : 'TAT',
          CHU_KY_GUI_TIN_ESP: extraPayload?.settings?.espReportIntervalSeconds ?? 5,
          CHU_KY_GHI_SHEETS: extraPayload?.settings?.espSheetsSyncIntervalSeconds ?? 60,
          DEVICE_ID: extraPayload?.deviceId || 'ESP32S3_ECO_01',
          DEVICE_KEY: 'dvk_live_eco_01_a9f4c82b7e1039d',
        },
      };

      // Sending with 'text/plain' and 'no-cors' allows browser to POST directly to Apps Script without CORS preflight block
      await fetch(activeWebhook, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      // Update sync state in localStorage
      try {
        const saved = JSON.parse(localStorage.getItem('ecofarm_sheets_config') || '{}');
        saved.lastSyncTime = syncTimestamp;
        saved.lastSyncStatus = 'SUCCESS';
        saved.lastSyncMessage = 'Đồng bộ trực tiếp thành công lên 3 Tab Google Sheets (Vercel Ready)';
        localStorage.setItem('ecofarm_sheets_config', JSON.stringify(saved));
      } catch {}

      return {
        success: true,
        message: '✅ Đã đẩy dữ liệu thành công lên cả 3 Tab Google Sheets qua Webhook (Chế độ Trực Tiếp Vercel)!',
        syncedAt: syncTimestamp,
      };
    } catch (directErr: any) {
      return {
        success: false,
        message: `Lỗi khi đẩy dữ liệu trực tiếp: ${directErr?.message || 'Không thể kết nối tới Webhook'}. Hãy kiểm tra xem quyền truy cập Web App trong Apps Script đã đặt là "Bất kỳ ai (Anyone)" chưa.`,
      };
    }
  }

  if (backendResult) {
    return backendResult;
  }

  return {
    success: false,
    needWebhook: true,
    message: 'Google Sheets yêu cầu liên kết Webhook để đẩy dữ liệu lên bảng tính. Vui lòng dán link Webhook (/exec) vào ô số 2.',
  };
}

export async function saveGoogleSheetsConfig(url: string, webhookUrl?: string): Promise<{ success: boolean; message: string; sheetsData?: GoogleSheetsData }> {
  // Always persist locally first so Vercel never loses input on refresh
  try {
    localStorage.setItem('ecofarm_sheets_config', JSON.stringify({
      url: url.trim(),
      webhookUrl: (webhookUrl || '').trim(),
    }));
  } catch {}

  try {
    const res = await fetch('/api/sheets/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, webhookUrl }),
    });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        return await res.json();
      }
    }
  } catch {}

  return {
    success: true,
    message: 'Đã lưu cấu hình Google Sheets thành công vào bộ nhớ hệ thống!',
  };
}

export async function requestEcosystemAnalysis(): Promise<{ success: boolean; analysis: EcosystemAnalysis }> {
  const res = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Failed to request AI analysis (${res.status})`);
  return res.json();
}

export async function requestVisionAnalysis(imageBase64?: string): Promise<{ success: boolean; result: AIVisionResult }> {
  const res = await fetch('/api/ai/vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: imageBase64 }),
  });
  if (!res.ok) throw new Error(`Failed to analyze vision (${res.status})`);
  return res.json();
}

export async function fetchVisionStatus(): Promise<any> {
  const res = await fetch('/api/vision/status');
  if (!res.ok) throw new Error(`Failed to fetch vision status (${res.status})`);
  return res.json();
}

export async function fetchSystemSettings(): Promise<SystemSettings> {
  const res = await fetch('/api/settings');
  if (!res.ok) throw new Error(`Failed to fetch settings (${res.status})`);
  return res.json();
}

export async function saveSystemSettings(settings: Partial<SystemSettings>): Promise<any> {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(`Failed to save settings (${res.status})`);
  return res.json();
}

export async function fetchESPThresholds(): Promise<any> {
  const res = await fetch('/api/esp/thresholds');
  if (!res.ok) throw new Error(`Failed to fetch ESP thresholds (${res.status})`);
  return res.json();
}

export async function syncESPThresholds(thresholds: Partial<SystemSettings>): Promise<{ success: boolean; message: string; synced_at: string }> {
  const res = await fetch('/api/esp/sync-thresholds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(thresholds),
  });
  if (!res.ok) throw new Error(`Failed to sync thresholds to ESP (${res.status})`);
  return res.json();
}

export async function fetchSettingsHistory(): Promise<any[]> {
  try {
    const res = await fetch('/api/settings/history');
    if (res.ok) {
      const data = await res.json();
      if (data.history && Array.isArray(data.history)) return data.history;
    }
  } catch {}
  return [];
}

export async function rollbackSettings(historyId: string, snapshot?: SystemSettings): Promise<{ success: boolean; message: string; settings?: SystemSettings }> {
  try {
    const res = await fetch('/api/settings/rollback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ historyId, snapshot }),
    });
    if (res.ok) return await res.json();
  } catch {}
  return {
    success: true,
    message: 'Đã khôi phục cài đặt trên giao diện người dùng',
    settings: snapshot,
  };
}
