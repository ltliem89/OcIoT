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
  const params = new URLSearchParams();
  if (url) params.append('url', url);
  if (webhookUrl) params.append('webhookUrl', webhookUrl);
  const query = params.toString() ? `?${params.toString()}` : '';

  try {
    const res = await fetch(`/api/sheets${query}`);
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      connected: false,
      url: url || '',
      webhookUrl: webhookUrl || '',
      spreadsheetId: null,
      lastUpdate: null,
      rowsCount: 0,
      records: [],
      error: err.message || 'Không thể kết nối đến máy chủ',
    };
  }
}

export async function syncToGoogleSheets(target: 'telemetry' | 'settings' | 'all', webhookUrl?: string): Promise<{ success: boolean; message: string; syncedAt?: string; needWebhook?: boolean }> {
  try {
    const res = await fetch('/api/sheets/sync-now', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, webhookUrl }),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Lỗi gửi yêu cầu đồng bộ',
    };
  }
}

export async function saveGoogleSheetsConfig(url: string, webhookUrl?: string): Promise<{ success: boolean; message: string; sheetsData?: GoogleSheetsData }> {
  try {
    const res = await fetch('/api/sheets/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, webhookUrl }),
    });
    return await res.json();
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Lỗi lưu cấu hình Google Sheets',
    };
  }
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
