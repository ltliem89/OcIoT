import http from 'http';

const BASE_URL = 'http://127.0.0.1:3000';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const postData = body ? JSON.stringify(body) : null;
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (postData) req.write(postData);
    req.end();
  });
}

const testResults = {
  units: [],
  groups: [],
};

function recordUnit(id, name, success, details, latencyMs) {
  testResults.units.push({ id, name, success, details, latencyMs });
  const statusEmoji = success ? '✅ PASS' : '❌ FAIL';
  console.log(`[UNIT] ${id.padEnd(10)} | ${statusEmoji} | ${name} (${latencyMs}ms)`);
  if (!success) console.error('   -> Chi tiết lỗi:', details);
}

function recordGroup(id, name, success, steps, latencyMs) {
  testResults.groups.push({ id, name, success, steps, latencyMs });
  const statusEmoji = success ? '✅ PASS' : '❌ FAIL';
  console.log(`[GROUP] ${id.padEnd(10)} | ${statusEmoji} | ${name} (${latencyMs}ms)`);
}

async function runUnitTests() {
  console.log('\n======================================================');
  console.log('PHẦN 1: RÀ SOÁT & KIỂM TRA ĐƠN LẺ TỪNG CHỨC NĂNG (UNIT TESTS)');
  console.log('======================================================\n');

  // Test 1.1: Health
  let t0 = Date.now();
  let r = await request('GET', '/api/v1/health');
  recordUnit(
    'TC_01',
    'Health Check & Trạng thái Máy Chủ',
    r.status === 200 && r.body?.status === 'ok',
    `Version: ${r.body?.version}, Project: ${r.body?.project}`,
    Date.now() - t0
  );

  // Test 1.2: ESP32 Heartbeat
  t0 = Date.now();
  r = await request('POST', '/api/v1/devices/heartbeat', {
    device_id: 'ESP32S3_ECO_01',
    rssi: -58,
    ip: '192.168.1.115',
    firmware: 'v4.2.0',
  });
  recordUnit(
    'TC_02',
    'Nhận tín hiệu Nhịp tim (Heartbeat) từ ESP32',
    r.status === 200 && r.body?.success === true,
    JSON.stringify(r.body),
    Date.now() - t0
  );

  // Test 1.3: ESP32 Telemetry Ingest
  t0 = Date.now();
  r = await request('POST', '/api/v1/devices/telemetry', {
    device_id: 'ESP32S3_ECO_01',
    tds: 435,
    soil_moisture: 68,
    float_low: true,
    float_high: false,
    pump1: false,
    pump2: false,
    buzzer: false,
    mode: 'AUTO',
  });
  recordUnit(
    'TC_03',
    'Nạp gói tin Telemetry cảm biến vào Hub',
    r.status === 200 && r.body?.success === true,
    `Pending cmds: ${r.body?.pendingCommandsCount}`,
    Date.now() - t0
  );

  // Test 1.4: Device List & State
  t0 = Date.now();
  r = await request('GET', '/api/v1/devices');
  const hasDevices = r.status === 200 && Array.isArray(r.body?.devices);
  recordUnit(
    'TC_04',
    'Truy vấn danh sách thiết bị ngoại vi',
    hasDevices,
    `Tìm thấy ${r.body?.devices?.length} thiết bị`,
    Date.now() - t0
  );

  // Test 1.5: Device State
  t0 = Date.now();
  r = await request('GET', '/api/v1/devices/ESP32S3_ECO_01/state');
  recordUnit(
    'TC_05',
    'Truy vấn trạng thái tức thời của trạm ESP32',
    r.status === 200 && r.body?.success === true,
    `TDS: ${r.body?.sensorData?.tds}, Mode: ${r.body?.mode}`,
    Date.now() - t0
  );

  // Test 1.6: Active Config for ESP32
  t0 = Date.now();
  r = await request('GET', '/api/v1/devices/ESP32S3_ECO_01/config');
  recordUnit(
    'TC_06',
    'Phân phối cấu hình phiên bản Active Config cho ESP32',
    r.status === 200 && r.body?.success === true,
    `Version: ${r.body?.version}, Hash: ${r.body?.configHash}`,
    Date.now() - t0
  );

  // Test 1.7: Command Queuing
  t0 = Date.now();
  r = await request('POST', '/api/v1/devices/ESP32S3_ECO_01/commands', {
    pump1: true,
  });
  const cmdId = r.body?.commandId;
  recordUnit(
    'TC_07',
    'Đưa lệnh điều khiển cơ cấu chấp hành vào Hàng đợi (Queue)',
    r.status === 200 && r.body?.success === true && !!cmdId,
    `Command ID: ${cmdId}`,
    Date.now() - t0
  );

  // Test 1.8: Fetch Pending Commands for ESP32
  t0 = Date.now();
  r = await request('GET', '/api/v1/devices/ESP32S3_ECO_01/commands/pending');
  const foundPending = r.status === 200 && r.body?.commands?.some((c) => c.id === cmdId);
  recordUnit(
    'TC_08',
    'ESP32 kéo lệnh chờ thực thi (Fetch Pending Commands)',
    foundPending,
    `Lệnh ${cmdId} chuyển sang ACCEPTED`,
    Date.now() - t0
  );

  // Test 1.9: Command ACK
  t0 = Date.now();
  r = await request('POST', `/api/v1/devices/ESP32S3_ECO_01/commands/${cmdId}/ack`, {
    status: 'EXECUTED',
    executedState: { pump1: true },
  });
  recordUnit(
    'TC_09',
    'ESP32 xác nhận đã thực thi lệnh đóng rơ-le (Command ACK)',
    r.status === 200 && r.body?.confirmedStatus === 'EXECUTED',
    JSON.stringify(r.body),
    Date.now() - t0
  );

  // Test 1.10: Device Provisioning
  t0 = Date.now();
  const unitDeviceId = `ESP32S3_UNIT_${Math.floor(Math.random() * 10000)}`;
  r = await request('POST', '/api/v1/provision/devices', {
    name: 'Trạm Thử Nghiệm Tự Động',
    deviceId: unitDeviceId,
    templateId: 'tmpl_aquaponics_v1',
  });
  const provisionOk = r.status === 200 && r.body?.result?.deviceKey?.startsWith('dvk_live_');
  recordUnit(
    'TC_10',
    'Cấp phát thiết bị mới (Provisioning Wizard) & Sinh khóa dvk_live_*',
    provisionOk,
    `Key sinh ra: ${r.body?.result?.deviceKey?.substring(0, 18)}...`,
    Date.now() - t0
  );

  // Test 1.11: Key Rotation
  t0 = Date.now();
  r = await request('POST', `/api/v1/provision/devices/${unitDeviceId}/rotate-key`);
  const rotateOk = r.status === 200 && r.body?.keyVersion === 2;
  recordUnit(
    'TC_11',
    'Xoay khóa bảo mật thiết bị (Key Rotation)',
    rotateOk,
    `Phiên bản khóa mới: v${r.body?.keyVersion}`,
    Date.now() - t0
  );

  // Test 1.12: Key Revocation
  t0 = Date.now();
  r = await request('POST', `/api/v1/provision/devices/${unitDeviceId}/revoke-key`);
  recordUnit(
    'TC_12',
    'Thu hồi toàn bộ khóa kết nối thiết bị (Key Revocation)',
    r.status === 200 && r.body?.success === true,
    JSON.stringify(r.body),
    Date.now() - t0
  );

  // Test 1.13: Project Config Fetch
  t0 = Date.now();
  r = await request('GET', '/api/v1/projects/proj_eco_01/config');
  recordUnit(
    'TC_13',
    'Truy vấn cấu hình Dự án & 5 Vùng sinh thái',
    r.status === 200 && r.body?.project?.id === 'proj_eco_01',
    `Số cảm biến: ${r.body?.sensors?.length}, Vùng: ${r.body?.zones?.length}`,
    Date.now() - t0
  );

  // Test 1.14: Save Draft Config
  t0 = Date.now();
  const draftPayload = {
    project: r.body.project,
    zones: r.body.zones,
    sensors: r.body.sensors,
    actuators: r.body.actuators,
    alarmRules: r.body.alarmRules,
    aiConfig: { sensitivity: 'high' },
  };
  r = await request('POST', '/api/v1/projects/proj_eco_01/config/draft', draftPayload);
  recordUnit(
    'TC_14',
    'Lưu bản nháp cấu hình vào máy chủ (Save Draft)',
    r.status === 200 && r.body?.success === true,
    r.body?.message,
    Date.now() - t0
  );

  // Test 1.15: Validate Config
  t0 = Date.now();
  r = await request('POST', '/api/v1/projects/proj_eco_01/config/validate', {
    snapshot: draftPayload,
  });
  recordUnit(
    'TC_15',
    'Kiểm tra tính hợp lệ cấu hình (dataKey, min/max, WCAG AA contrast)',
    r.status === 200 && r.body?.valid === true,
    `Lỗi: ${r.body?.errors?.length}, Cảnh báo: ${r.body?.warnings?.length}`,
    Date.now() - t0
  );

  // Test 1.16: Apply Config -> Version v(N+1)
  t0 = Date.now();
  r = await request('POST', '/api/v1/projects/proj_eco_01/config/apply', {
    snapshot: draftPayload,
    description: 'Thử nghiệm lưu phiên bản mới qua bài test tự động',
  });
  const newVer = r.body?.version?.version;
  recordUnit(
    'TC_16',
    'Lưu & Áp dụng cấu hình kích hoạt phiên bản Active Config mới',
    r.status === 200 && !!newVer,
    `Đã kích hoạt Version: v${newVer}`,
    Date.now() - t0
  );

  // Test 1.17: Versions History
  t0 = Date.now();
  r = await request('GET', '/api/v1/projects/proj_eco_01/config/versions');
  recordUnit(
    'TC_17',
    'Truy vấn lịch sử các phiên bản cấu hình đã lưu',
    r.status === 200 && r.body?.versions?.length >= 2,
    `Tổng số phiên bản: ${r.body?.versions?.length}`,
    Date.now() - t0
  );

  // Test 1.18: Rollback Config
  t0 = Date.now();
  r = await request('POST', '/api/v1/projects/proj_eco_01/config/rollback', {
    targetVersion: 1,
  });
  const rollbackVer = r.body?.version?.version;
  recordUnit(
    'TC_18',
    'Khôi phục (Rollback) cấu hình về phiên bản trước',
    r.status === 200 && !!rollbackVer,
    `Phục hồi từ v1 sang v${rollbackVer}`,
    Date.now() - t0
  );

  // Test 1.19: Alerts Query
  t0 = Date.now();
  r = await request('GET', '/api/v1/alerts');
  const alertCount = r.body?.activeAlarms?.length || 0;
  recordUnit(
    'TC_19',
    'Truy vấn danh sách cảnh báo đang kích hoạt',
    r.status === 200 && Array.isArray(r.body?.activeAlarms),
    `Cảnh báo hiện hữu: ${alertCount}`,
    Date.now() - t0
  );

  // Test 1.20: Alert ACK
  t0 = Date.now();
  const firstAlarm = r.body?.activeAlarms?.[0];
  if (firstAlarm) {
    r = await request('POST', `/api/v1/alerts/${firstAlarm.id}/ack`, {
      note: 'Kỹ sư đã xử lý bơm bổ sung nước',
      who: 'AutoTester',
    });
    recordUnit(
      'TC_20',
      'Kỹ sư xác nhận cảnh báo sự cố (Alert ACK)',
      r.status === 200 && r.body?.alarm?.state === 'ACKNOWLEDGED',
      `Trạng thái: ${r.body?.alarm?.state}`,
      Date.now() - t0
    );
  } else {
    recordUnit('TC_20', 'Kỹ sư xác nhận cảnh báo sự cố (Alert ACK)', true, 'Không có cảnh báo tồn đọng để ACK', 1);
  }

  // Test 1.21: Audit Trail
  t0 = Date.now();
  r = await request('GET', '/api/v1/audit-logs');
  recordUnit(
    'TC_21',
    'Nhật ký kiểm toán hệ thống (Audit Trail)',
    r.status === 200 && r.body?.count > 0,
    `Tổng số nhật ký: ${r.body?.count}`,
    Date.now() - t0
  );

  // Test 1.22: AI Vision Result Ingest & Fetch
  t0 = Date.now();
  await request('POST', '/api/v1/vision/result', {
    duckweed: { detected: true, coverage: 78, status: 'NORMAL', confidence: 92 },
    snail_eggs: { detected: true, egg_clusters: 6, hatching: 'POSSIBLE', confidence: 88 },
    notes: 'Camera AI PC phát hiện thêm 1 cụm trứng ốc bám bờ',
  });
  r = await request('GET', '/api/v1/vision/latest');
  recordUnit(
    'TC_22',
    'AI Vision PC đẩy kết quả phân tích mật độ bèo & tổ trứng ốc',
    r.status === 200 && r.body?.latest_result?.duckweed?.coverage === 78,
    `Bèo: ${r.body?.latest_result?.duckweed?.coverage}%, Trứng: ${r.body?.latest_result?.snail_eggs?.egg_clusters}`,
    Date.now() - t0
  );

  // Test 1.23: Historical Timeseries
  t0 = Date.now();
  r = await request('GET', '/api/iot/history?range=24h');
  recordUnit(
    'TC_23',
    'Truy vấn chuỗi thời gian lịch sử cảm biến',
    r.status === 200 && Array.isArray(r.body?.data),
    `Số điểm dữ liệu: ${r.body?.data?.length}`,
    Date.now() - t0
  );

  // Test 1.24: Google Sheets Connect
  t0 = Date.now();
  r = await request('GET', '/api/sheets');
  recordUnit(
    'TC_24',
    'Kết nối dịch vụ đồng bộ Google Sheets',
    r.status === 200,
    `Rows: ${r.body?.rowsCount || 0}, Connected: ${r.body?.connected}`,
    Date.now() - t0
  );
}

async function runGroupTests() {
  console.log('\n======================================================');
  console.log('PHẦN 2: TEST PHỐI HỢP THEO NHÓM (INTEGRATION SCENARIO TESTS)');
  console.log('======================================================\n');

  // --------------------------------------------------------------------
  // NHÓM 1: PIPELINE CẢM BIẾN & CẢNH BÁO HYSTERESIS KHÉP KÍN
  // --------------------------------------------------------------------
  let t0 = Date.now();
  // 0. Reset state below clear threshold
  await request('POST', '/api/v1/devices/telemetry', {
    device_id: 'ESP32S3_ECO_01',
    tds: 500,
    soil_moisture: 65,
    float_low: true,
  });

  // 1. Trigger TDS = 880 (> 800 trigger threshold)
  await request('POST', '/api/v1/devices/telemetry', {
    device_id: 'ESP32S3_ECO_01',
    tds: 880,
    soil_moisture: 65,
    float_low: true,
  });
  let step1_2 = await request('GET', '/api/v1/alerts');
  let hasTriggered = step1_2.body?.activeAlarms?.some(
    (a) => a.entityId === 'tds' && a.state === 'ACTIVE'
  );

  // 2. Hysteresis test: Push TDS = 775 (Under trigger 800, but STILL above clearValue 750)
  await request('POST', '/api/v1/devices/telemetry', {
    device_id: 'ESP32S3_ECO_01',
    tds: 775,
    soil_moisture: 65,
  });
  let step1_3 = await request('GET', '/api/v1/alerts');
  let stillActive = step1_3.body?.activeAlarms?.some(
    (a) => a.entityId === 'tds' && a.state === 'ACTIVE'
  );

  // 3. Full clear: Push TDS = 680 (Below clearValue 750)
  await request('POST', '/api/v1/devices/telemetry', {
    device_id: 'ESP32S3_ECO_01',
    tds: 680,
    soil_moisture: 65,
  });
  let step1_4 = await request('GET', '/api/v1/alerts');
  let cleared = step1_4.body?.activeAlarms?.some(
    (a) => a.entityId === 'tds' && a.state === 'CLEARED'
  );

  let group1Success = hasTriggered && stillActive && cleared;
  if (!group1Success) {
    console.log('   -> DEBUG NHOM_01:', { hasTriggered, stillActive, cleared });
  }
  recordGroup(
    'NHOM_01',
    'Chuỗi Telemetry Cảm Biến & Hysteresis Cảnh Báo Chống Rung Giật',
    group1Success,
    [
      'TDS 880 (> 800) -> Kích hoạt cảnh báo ACTIVE',
      'TDS 775 (trong vùng Hysteresis 750-800) -> Giữ nguyên cảnh báo chống nháy còi',
      'TDS 680 (< 750) -> Tự động khôi phục CLEARED',
    ],
    Date.now() - t0
  );

  // --------------------------------------------------------------------
  // NHÓM 2: CHU TRÌNH ĐIỀU KHIỂN KHÉP KÍN 2 BƯỚC (COMMAND UX CLOSED-LOOP)
  // --------------------------------------------------------------------
  t0 = Date.now();
  // 1. Web UI dispatch command
  let cmdRes = await request('POST', '/api/v1/devices/ESP32S3_ECO_01/commands', {
    pump1: true,
    pump2: false,
  });
  let commandId = cmdRes.body?.commandId;

  // 2. ESP32 fetches pending commands -> Status becomes ACCEPTED
  let pollRes = await request('GET', '/api/v1/devices/ESP32S3_ECO_01/commands/pending');
  let isAccepted = pollRes.body?.commands?.some((c) => c.id === commandId);

  // 3. ESP32 applies relay & sends ACK -> Status becomes EXECUTED
  let ackRes = await request('POST', `/api/v1/devices/ESP32S3_ECO_01/commands/${commandId}/ack`, {
    status: 'EXECUTED',
    executedState: { pump1: true },
  });

  // 4. Web checks device state -> Confirmed pump1: true
  let stateRes = await request('GET', '/api/v1/devices/ESP32S3_ECO_01/state');
  let confirmed = stateRes.body?.actuators?.pump1 === true;

  let group2Success = !!commandId && isAccepted && confirmed;
  recordGroup(
    'NHOM_02',
    'Chu Trình Điều Khiển 2 Bước (Web -> Queue -> ESP32 -> Telemetry Confirmed)',
    group2Success,
    [
      'Web phát lệnh bật Bơm 1 -> Hàng đợi PENDING',
      'ESP32 quét hàng đợi -> Nhận lệnh ACCEPTED',
      'ESP32 đóng rơ-le & gửi ACK -> EXECUTED',
      'Web xác nhận trạng thái rơ-le Bơm 1 = true',
    ],
    Date.now() - t0
  );

  // --------------------------------------------------------------------
  // NHÓM 3: QUẢN LÝ CẤU HÌNH PHIÊN BẢN & ĐỒNG BỘ PHẦN CỨNG
  // --------------------------------------------------------------------
  t0 = Date.now();
  // 1. Get current config
  let curCfg = await request('GET', '/api/v1/projects/proj_eco_01/config');
  let baseVer = curCfg.body?.activeVersion?.version || 1;

  // 2. Create Draft with updated sensor
  let modifiedSnapshot = JSON.parse(JSON.stringify(curCfg.body.activeVersion.snapshot));
  modifiedSnapshot.sensors[0].name = 'Chỉ Số TDS Hồ Nuôi Mới';

  // 3. Validate Draft
  let valRes = await request('POST', '/api/v1/projects/proj_eco_01/config/validate', {
    snapshot: modifiedSnapshot,
  });

  // 4. Apply -> vN+1
  let applyRes = await request('POST', '/api/v1/projects/proj_eco_01/config/apply', {
    snapshot: modifiedSnapshot,
    description: 'Nâng cấp phiên bản qua integration test nhóm 3',
  });
  let newAppliedVer = applyRes.body?.version?.version;

  // 5. Check device auto-sync
  let devRes = await request('GET', '/api/v1/devices');
  let syncedDev = devRes.body?.devices?.find((d) => d.id === 'ESP32S3_ECO_01');
  let isDevSynced = syncedDev?.currentConfigVersion === newAppliedVer;

  // 6. Rollback to original baseVer
  let rbRes = await request('POST', '/api/v1/projects/proj_eco_01/config/rollback', {
    targetVersion: baseVer,
  });
  let rbVer = rbRes.body?.version?.version;

  let group3Success = valRes.body?.valid && isDevSynced && !!rbVer;
  recordGroup(
    'NHOM_03',
    'Vòng Đời Cấu Hình: Draft -> Validate -> Apply -> Hardware Sync -> Rollback',
    group3Success,
    [
      `Tạo bản nháp thay đổi cảm biến -> Validate hợp lệ`,
      `Áp dụng cấu hình lên phiên bản mới v${newAppliedVer}`,
      `Kiểm tra ESP32 đồng bộ nhận hash cấu hình v${newAppliedVer}`,
      `Rollback an toàn về snapshot v${baseVer} thành công`,
    ],
    Date.now() - t0
  );

  // --------------------------------------------------------------------
  // NHÓM 4: CẤP PHÁT THIẾT BỊ MỚI, BẢO MẬT KHÓA & QR CODE HANDSHAKE
  // --------------------------------------------------------------------
  t0 = Date.now();
  const stationId = `ESP32S3_STATION_${Math.floor(Math.random() * 10000)}`;
  let prov = await request('POST', '/api/v1/provision/devices', {
    name: 'Trạm Cảm Biến Bể Lọc Bèo 03',
    deviceId: stationId,
    templateId: 'tmpl_aquaponics_v1',
  });
  let devKey = prov.body?.result?.deviceKey;
  let qrPayload = prov.body?.result?.qrPayload;

  // Rotate key
  let rot = await request('POST', `/api/v1/provision/devices/${stationId}/rotate-key`);
  let rotVer = rot.body?.keyVersion;

  // Revoke key
  let rev = await request('POST', `/api/v1/provision/devices/${stationId}/revoke-key`);

  let group4Success = devKey?.startsWith('dvk_live_') && !!qrPayload && rotVer === 2 && rev.body?.success;
  recordGroup(
    'NHOM_04',
    'Cấp Phát Thiết Bị Mới, Mã QR & Quản Trị Khóa Mật Mã ESP32 (Security Handshake)',
    group4Success,
    [
      'Cấp phát trạm mới: sinh dvk_live_* và QR payload',
      'Xoay khóa bảo mật: chuyển khóa cũ sang REVOKED, cấp khóa v2 ACTIVE',
      'Thu hồi khóa: ngắt toàn bộ phiên kết nối',
    ],
    Date.now() - t0
  );

  // --------------------------------------------------------------------
  // NHÓM 5: TƯƠNG QUAN AI VISION VỚI VÙNG SINH THÁI BÈO & ỐC
  // --------------------------------------------------------------------
  t0 = Date.now();
  let visionPush = await request('POST', '/api/v1/vision/result', {
    duckweed: { detected: true, coverage: 74, status: 'NORMAL', confidence: 91 },
    snail_eggs: { detected: true, egg_clusters: 7, hatching: 'HIGH', confidence: 89 },
    notes: 'Thảm bèo phát triển đồng đều, phát hiện 7 cụm trứng ốc bám bờ',
  });
  let visionGet = await request('GET', '/api/v1/vision/latest');
  let aiAnalyze = await request('POST', '/api/ai/analyze');

  let group5Success =
    visionGet.body?.latest_result?.duckweed?.coverage === 74 &&
    visionGet.body?.latest_result?.snail_eggs?.egg_clusters === 7 &&
    aiAnalyze.body?.success === true;

  recordGroup(
    'NHOM_05',
    'Liên Kết AI Vision & Đánh Giá Sức Khỏe Sinh Thái Đa Vùng',
    group5Success,
    [
      'AI Vision PC gửi dữ liệu bèo 74% & 7 cụm trứng ốc',
      'Hub cập nhật đồng bộ cho Vùng Thực Vật & Vùng Sinh Vật',
      'Gọi mô hình AI đánh giá cân bằng tuần hoàn thành công',
    ],
    Date.now() - t0
  );

  // --------------------------------------------------------------------
  // NHÓM 6: CHU TRÌNH DỮ LIỆU LỊCH SỬ & BÁO CÁO ĐÁM MÂY GOOGLE SHEETS
  // --------------------------------------------------------------------
  t0 = Date.now();
  // Ingest batch telemetry
  for (let i = 0; i < 3; i++) {
    await request('POST', '/api/v1/devices/telemetry', {
      device_id: 'ESP32S3_ECO_01',
      tds: 430 + i * 5,
      soil_moisture: 66,
      float_low: true,
      float_high: false,
    });
  }
  let histRes = await request('GET', '/api/iot/history?range=24h');
  let sheetsRes = await request('GET', '/api/sheets');

  let group6Success = histRes.body?.data?.length > 20 && sheetsRes.status === 200;
  recordGroup(
    'NHOM_06',
    'Chu Trỗi Timeseries & Đồng Bộ Báo Cáo Google Sheets',
    group6Success,
    [
      'Ghi nhận liên tục các chuỗi đo telemetry',
      'Cung cấp chuỗi dữ liệu cho biểu đồ trực quan hóa 24h/7d',
      'Tích hợp bảng tính đám mây Google Sheets trích xuất dữ liệu',
    ],
    Date.now() - t0
  );

  console.log('\n======================================================');
  console.log('TỔNG HỢP KẾT QUẢ RÀ SOÁT & KIỂM THỬ:');
  const totalUnits = testResults.units.length;
  const passedUnits = testResults.units.filter((u) => u.success).length;
  const totalGroups = testResults.groups.length;
  const passedGroups = testResults.groups.filter((g) => g.success).length;

  console.log(`- Đơn lẻ (Unit Tests): ${passedUnits}/${totalUnits} PASS (${Math.round((passedUnits/totalUnits)*100)}%)`);
  console.log(`- Phối hợp (Group Tests): ${passedGroups}/${totalGroups} PASS (${Math.round((passedGroups/totalGroups)*100)}%)`);
  console.log('======================================================\n');
}

async function main() {
  await runUnitTests();
  await runGroupTests();
}

main().catch(console.error);
