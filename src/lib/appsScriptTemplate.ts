// src/lib/appsScriptTemplate.ts
// Shared Google Apps Script Code Generator for both Server and Client (Vercel compatible)

export interface AppsScriptOptions {
  deviceId?: string;
  deviceKey?: string;
  tdsMin?: number;
  tdsMax?: number;
  tdsCritical?: number;
  soilMoistureMin?: number;
  soilMoistureMax?: number;
  pump1MaxContinuousMinutes?: number;
  pump2IrrigationDurationSeconds?: number;
  pump2RestIntervalMinutes?: number;
  floatLowSafetyCutoff?: boolean;
  buzzerOnCriticalAlert?: boolean;
  espReportIntervalSeconds?: number;
  espSheetsSyncIntervalSeconds?: number;
}

export function generateAppsScriptCode(options?: AppsScriptOptions): string {
  const devId = options?.deviceId || 'ESP32S3_ECO_01';
  const devKey = options?.deviceKey || 'dvk_live_eco_01_a9f4c82b7e1039d';
  const tdsMin = options?.tdsMin ?? 200;
  const tdsMax = options?.tdsMax ?? 750;
  const tdsCritical = options?.tdsCritical ?? 950;
  const soilMin = options?.soilMoistureMin ?? 50;
  const soilMax = options?.soilMoistureMax ?? 80;
  const pump1Max = options?.pump1MaxContinuousMinutes ?? 45;
  const pump2Duration = options?.pump2IrrigationDurationSeconds ?? 45;
  const pump2Rest = options?.pump2RestIntervalMinutes ?? 30;
  const floatCutoff = options?.floatLowSafetyCutoff !== false ? 'BAT' : 'TAT';
  const buzzerAlert = options?.buzzerOnCriticalAlert !== false ? 'BAT' : 'TAT';
  const espInterval = options?.espReportIntervalSeconds ?? 5;
  const syncInterval = options?.espSheetsSyncIntervalSeconds ?? 60;

  return `/**
 * ==============================================================================
 * HỆ THỐNG GIÁM SÁT AQUAPONICS ECOFARM - GOOGLE APPS SCRIPT ĐỒNG BỘ 3 TAB
 * - Tab 1: DuLieu_NhatKy (Nhật ký chuỗi thời gian tổng hợp trực quan)
 * - Tab 2: CaiDat_HeThong (Bảng thông số cấu hình phân nhóm thông minh)
 * - Tab 3: data_sensor   (Dữ liệu cảm biến chuẩn hóa dạng số chuyên dùng vẽ biểu đồ)
 * ==============================================================================
 */

// BƯỚC 1: Bấm nút "Chạy" (Run) hàm này ĐẦU TIÊN để tự động tạo 3 Tab và định dạng màu sắc chuẩn
function khoiTaoBaTabEcoFarm() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("Không tìm thấy bảng tính Google Sheet đang mở. Vui lòng mở Apps Script bằng cách: Mở file Google Sheet của bạn -> Bấm menu 'Tiện ích mở rộng' (Extensions) -> Chọn 'Apps Script' rồi dán mã vào!");
  }

  // 1. TẠO TAB 1: DuLieu_NhatKy (Nhật ký quan sát tổng hợp)
  var sheet1 = ss.getSheetByName("DuLieu_NhatKy");
  if (!sheet1) {
    sheet1 = ss.insertSheet("DuLieu_NhatKy", 0);
  }
  sheet1.clear();
  var headers1 = [
    "Thời Gian",
    "Mã Thiết Bị",
    "TDS (ppm)",
    "Độ Ẩm Đất (%)",
    "Phao Đáy (LOW)",
    "Phao Tràn (HIGH)",
    "Bơm 1 (Tuần Hoàn)",
    "Bơm 2 (Tưới Rau)",
    "Còi Buzzer",
    "Sóng WiFi RSSI",
    "Chế Độ",
    "Mật Độ Bèo AI (%)",
    "Ổ Trứng Ốc (ổ)",
    "Ghi Chú Đánh Giá"
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
    ["TDS_MIN", ${tdsMin}, "ppm - Dưới ngưỡng này cảnh báo thiếu dinh dưỡng", "[1. DINH DƯỠNG & NƯỚC]", nowStr],
    ["TDS_MAX", ${tdsMax}, "ppm - Ngưỡng an toàn tối đa cho ốc và cá", "[1. DINH DƯỠNG & NƯỚC]", nowStr],
    ["TDS_CRITICAL", ${tdsCritical}, "ppm - Ngưỡng nguy cấp, kích hoạt cảnh báo đỏ", "[1. DINH DƯỠNG & NƯỚC]", nowStr],
    ["DO_AM_DAT_MIN", ${soilMin}, "% - Dưới ngưỡng này tự động bật Bơm 2 tưới rau", "[2. GIÀN RAU & ĐỘ ẨM]", nowStr],
    ["DO_AM_DAT_MAX", ${soilMax}, "% - Đạt ngưỡng này tự động ngắt Bơm 2", "[2. GIÀN RAU & ĐỘ ẨM]", nowStr],
    ["THOI_GIAN_TUOI_RAU", ${pump2Duration}, "giây - Thời gian mỗi đợt bơm tưới giàn rau", "[2. GIÀN RAU & ĐỘ ẨM]", nowStr],
    ["KHOANG_NGHI_TUOI", ${pump2Rest}, "phút - Khoảng nghỉ giữa các đợt tưới liên tiếp", "[2. GIÀN RAU & ĐỘ ẨM]", nowStr],
    ["THOI_GIAN_BOM_1_MAX", ${pump1Max}, "phút - Thời gian Bơm 1 tuần hoàn chạy liên tục tối đa", "[3. BƠM TUẦN HOÀN]", nowStr],
    ["TU_DONG_NGAT_KHI_CAN", "${floatCutoff}", "Tự động ngắt Bơm 1 ngay khi phao đáy báo cạn để chống cháy", "[4. AN TOÀN & BÁO ĐỘNG]", nowStr],
    ["COI_BUZZER_CANH_BAO", "${buzzerAlert}", "Phát còi bíp cảnh báo khi hệ thống gặp sự cố khẩn cấp", "[4. AN TOÀN & BÁO ĐỘNG]", nowStr],
    ["CHU_KY_GUI_TIN_ESP", ${espInterval}, "giây - Chu kỳ gửi tin telemetry từ ESP32", "[5. THIẾT BỊ & PHẦN CỨNG]", nowStr],
    ["CHU_KY_GHI_SHEETS", ${syncInterval}, "giây - Chu kỳ tự động đồng bộ lên Google Sheets", "[5. THIẾT BỊ & PHẦN CỨNG]", nowStr],
    ["DEVICE_ID", "${devId}", "Mã định danh trạm điều khiển phần cứng", "[5. THIẾT BỊ & PHẦN CỨNG]", nowStr],
    ["DEVICE_KEY", "${devKey}", "Khóa xác thực bảo mật nạp vào firmware ESP32", "[5. THIẾT BỊ & PHẦN CỨNG]", nowStr]
  ];

  for (var i = 0; i < settingsRows.length; i++) {
    sheet2.appendRow(settingsRows[i]);
  }
  sheet2.autoResizeColumns(1, headers2.length);

  // 3. TẠO TAB 3: data_sensor (CƠ SỞ DỮ LIỆU SỐ CHUẨN ĐỂ VẼ BIỂU ĐỒ THEO THỜI GIAN)
  var sheet3 = ss.getSheetByName("data_sensor");
  if (!sheet3) {
    sheet3 = ss.insertSheet("data_sensor", 2);
  }
  sheet3.clear();
  var headers3 = [
    "timestamp",
    "device_id",
    "tds_ppm",
    "soil_moisture_pct",
    "water_level_state",
    "pump1_state",
    "pump2_state",
    "buzzer_state",
    "wifi_rssi_dbm",
    "duckweed_coverage_pct",
    "snail_eggs_count",
    "auto_mode"
  ];
  sheet3.appendRow(headers3);
  var headerRange3 = sheet3.getRange(1, 1, 1, headers3.length);
  headerRange3.setBackground("#1e1b4b"); // Màu tím indigo chuyên dùng cho Analytics
  headerRange3.setFontColor("#a5b4fc"); // Màu tím sáng nổi bật
  headerRange3.setFontWeight("bold");
  headerRange3.setHorizontalAlignment("center");
  sheet3.setFrozenRows(1);

  // Thêm 1 dòng dữ liệu khởi tạo mẫu chuẩn số
  sheet3.appendRow([
    nowStr,
    "${devId}",
    485,
    68,
    1,
    0,
    0,
    0,
    -60,
    76,
    5,
    1
  ]);
  sheet3.autoResizeColumns(1, headers3.length);

  // Xóa sheet rác mặc định nếu có tên "Trang tính 1" hoặc "Sheet1"
  var defaultSheet = ss.getSheetByName("Trang tính 1") || ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 3) {
    ss.deleteSheet(defaultSheet);
  }

  thongBaoAnToan("✅ Đã khởi tạo thành công 3 Tab: 'DuLieu_NhatKy', 'CaiDat_HeThong' và 'data_sensor' (sẵn sàng vẽ biểu đồ)!", "Khởi Tạo Thành Công");
  return "✅ Khởi tạo thành công 3 Tab: DuLieu_NhatKy, CaiDat_HeThong, data_sensor";
}

// Giữ lại alias hàm cũ để người dùng quen tay vẫn chạy bình thường
function khoiTaoHaiTabEcoFarm() {
  return khoiTaoBaTabEcoFarm();
}

// BƯỚC 2 (TÙY CHỌN TIỆN ÍCH): Tự động tạo Biểu Đồ Đường (Line Chart) trên Tab data_sensor
function taoBieuDoDataSensor() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    thongBaoAnToan("Không tìm thấy bảng tính Google Sheet đang mở.", "Lỗi");
    return "Không tìm thấy bảng tính";
  }
  var sheet = ss.getSheetByName("data_sensor");
  if (!sheet) {
    thongBaoAnToan("Chưa tìm thấy tab 'data_sensor'. Vui lòng chạy hàm 'khoiTaoBaTabEcoFarm' trước!", "Lưu Ý");
    return "Chưa tìm thấy tab 'data_sensor'";
  }

  // Xóa các biểu đồ cũ trên sheet nếu có để không bị trùng lặp
  var charts = sheet.getCharts();
  for (var i = 0; i < charts.length; i++) {
    sheet.removeChart(charts[i]);
  }

  var lastRow = Math.max(sheet.getLastRow(), 2);

  // Cột 1: timestamp (Trục X thời gian)
  // Cột 3: tds_ppm (Trục Y1 bên trái)
  // Cột 4: soil_moisture_pct (Trục Y2 bên phải)
  var rangeX = sheet.getRange("A1:A" + lastRow);
  var rangeTds = sheet.getRange("C1:C" + lastRow);
  var rangeSoil = sheet.getRange("D1:D" + lastRow);

  var chart = sheet.newChart()
    .asLineChart()
    .addRange(rangeX)
    .addRange(rangeTds)
    .addRange(rangeSoil)
    .setPosition(2, 14, 10, 10)
    .setOption("title", "📊 XU HƯỚNG DINH DƯỠNG TDS & ĐỘ ẨM ĐẤT ECOFARM (REAL-TIME)")
    .setOption("titleTextStyle", { color: "#1e1b4b", fontSize: 14, bold: true })
    .setOption("legend", { position: "top" })
    .setOption("curveType", "function") // Đường cong mượt mà
    .setOption("pointSize", 4)
    .setOption("hAxis", { title: "Thời Gian", format: "HH:mm dd/MM" })
    .setOption("vAxes", {
      0: { title: "TDS (ppm)", textStyle: { color: "#0284c7" }, minValue: 0, maxValue: 1200 },
      1: { title: "Độ Ẩm (%)", textStyle: { color: "#16a34a" }, minValue: 0, maxValue: 100 }
    })
    .setOption("series", {
      0: { targetAxisIndex: 0, color: "#0284c7", lineWidth: 3, labelInLegend: "Nồng Độ TDS (ppm)" },
      1: { targetAxisIndex: 1, color: "#16a34a", lineWidth: 3, labelInLegend: "Độ Ẩm Đất (%)" }
    })
    .setOption("width", 880)
    .setOption("height", 460)
    .build();

  sheet.insertChart(chart);
  thongBaoAnToan("✅ Đã vẽ thành công Biểu Đồ Thời Gian Thực trên tab 'data_sensor'!", "Vẽ Biểu Đồ Thành Công");
  return "✅ Đã vẽ thành công Biểu Đồ Thời Gian Thực trên tab data_sensor";
}

// Tự động tạo menu điều khiển ngay trên giao diện Google Sheets khi mở tệp
function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    if (ui && typeof ui.createMenu === "function") {
      ui.createMenu("🌿 EcoFarm IoT")
        .addItem("1. Khởi Tạo 3 Tab Chuẩn", "khoiTaoBaTabEcoFarm")
        .addItem("2. Tự Động Vẽ Biểu Đồ data_sensor", "taoBieuDoDataSensor")
        .addToUi();
    }
  } catch (e) {
    Logger.log("Không thể tạo Menu UI (onOpen): " + e.toString());
  }
}

// Hàm thông báo thông minh & an toàn: tự động tương thích khi chạy từ Editor, Webhook hoặc Menu
function thongBaoAnToan(message, title) {
  title = title || "EcoFarm IoT";
  // 1. Thử hiển thị pop-up Alert nếu đang ở ngữ cảnh giao diện người dùng
  try {
    var ui = SpreadsheetApp.getUi();
    if (ui && typeof ui.alert === "function") {
      ui.alert(title, message, ui.ButtonSet.OK);
      return;
    }
  } catch (errUi) {
    // Không có UI context (khi chạy từ Apps Script Editor hoặc Web App Webhook)
  }

  // 2. Thử hiển thị toast nhỏ ở góc dưới bảng tính
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss && typeof ss.toast === "function") {
      ss.toast(message, title, 6);
    }
  } catch (errToast) {}

  // 3. Luôn ghi log vào Execution Log của Apps Script
  Logger.log("[" + title + "] " + message);
}

// BƯỚC 3: Nhận dữ liệu gửi từ Webhook để ghi đồng thời vào Nhật Ký, Cài Đặt và data_sensor
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
    var timeFormatted = data.timestamp ? Utilities.formatDate(new Date(data.timestamp), "Asia/Ho_Chi_Minh", "dd/MM/yyyy HH:mm:ss") : nowStr;
    var devId = data.device_id || "${devId}";
    var tdsVal = Number(data.tds || 0);
    var soilVal = Number(data.soil_moisture || 0);
    var duckweed = data.duckweed_coverage !== undefined ? Number(data.duckweed_coverage) : 75;
    var snailEggs = data.snail_eggs_count !== undefined ? Number(data.snail_eggs_count) : 5;
    var modeStr = data.mode || "AUTO";

    // 1. Ghi nhận dữ liệu cảm biến vào Tab 1: DuLieu_NhatKy (Tổng hợp trực quan)
    if (data.action === "log_telemetry" || data.action === "sync_all" || data.tds !== undefined) {
      var sheet1 = ss.getSheetByName("DuLieu_NhatKy");
      if (!sheet1) {
        khoiTaoBaTabEcoFarm();
        sheet1 = ss.getSheetByName("DuLieu_NhatKy");
      }

      var floatLowText = data.float_low === false || data.float_low === 0 ? "CẠN NƯỚC (BÁO ĐỘNG)" : "ĐỦ NƯỚC";
      var floatHighText = data.float_high === true || data.float_high === 1 ? "TRÀN BỂ" : "BÌNH THƯỜNG";
      var pump1Text = data.pump1 ? "BẬT" : "TẮT";
      var pump2Text = data.pump2 ? "BẬT" : "TẮT";
      var buzzerText = data.buzzer ? "BẬT" : "TẮT";
      var rssiText = data.wifi_rssi ? data.wifi_rssi + " dBm" : "-60 dBm";

      var noteText = data.note || "Đồng bộ từ Dashboard EcoFarm";
      if (tdsVal > ${tdsCritical}) noteText = "CỰC KỲ NGUY CẤP (TDS QUÁ CAO)";
      else if (tdsVal > ${tdsMax}) noteText = "TDS VƯỢT NGƯỠNG AN TOÀN";
      else if (soilVal < ${soilMin}) noteText = "ĐẤT KHÔ - ĐANG KÍCH HOẠT TƯỚI";
      else if (data.float_low === false || data.float_low === 0) noteText = "NGUY HIỂM: CẠN NƯỚC BỂ";

      sheet1.appendRow([
        timeFormatted,
        devId,
        tdsVal,
        soilVal,
        floatLowText,
        floatHighText,
        pump1Text,
        pump2Text,
        buzzerText,
        rssiText,
        modeStr,
        duckweed,
        snailEggs,
        noteText
      ]);
    }

    // 2. Ghi nhận dữ liệu số chuẩn hóa vào Tab 3: data_sensor (CHUYÊN DÙNG VẼ BIỂU ĐỒ)
    if (data.action === "log_telemetry" || data.action === "sync_all" || data.tds !== undefined) {
      var sheet3 = ss.getSheetByName("data_sensor");
      if (!sheet3) {
        khoiTaoBaTabEcoFarm();
        sheet3 = ss.getSheetByName("data_sensor");
      }

      var waterStateNum = (data.float_low === false || data.float_low === 0) ? 0 : ((data.float_high === true || data.float_high === 1) ? 2 : 1);
      var p1Num = data.pump1 ? 1 : 0;
      var p2Num = data.pump2 ? 1 : 0;
      var bzNum = data.buzzer ? 1 : 0;
      var wifiNum = Number(data.wifi_rssi || -60);
      var autoNum = modeStr === "MANUAL" ? 0 : 1;

      sheet3.appendRow([
        timeFormatted,
        devId,
        tdsVal,
        soilVal,
        waterStateNum,
        p1Num,
        p2Num,
        bzNum,
        wifiNum,
        duckweed,
        snailEggs,
        autoNum
      ]);
    }

    // 3. Cập nhật bảng cài đặt Tab 2: CaiDat_HeThong nếu có gói dữ liệu settings
    if (data.settings && (data.action === "update_settings" || data.action === "sync_all")) {
      var sheet2 = ss.getSheetByName("CaiDat_HeThong");
      if (!sheet2) {
        khoiTaoBaTabEcoFarm();
        sheet2 = ss.getSheetByName("CaiDat_HeThong");
      }

      var lastR = sheet2.getLastRow();
      if (lastR >= 2) {
        var keys = sheet2.getRange(2, 1, lastR - 1, 1).getValues();
        for (var k = 0; k < keys.length; k++) {
          var paramKey = String(keys[k][0]).trim();
          if (data.settings[paramKey] !== undefined) {
            sheet2.getRange(k + 2, 2).setValue(data.settings[paramKey]);
            sheet2.getRange(k + 2, 5).setValue(nowStr);
          }
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: "Đã cập nhật đồng thời lên cả 3 Tab Google Sheets thành công!",
      recorded_at: nowStr,
      device_id: devId
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "online",
    service: "EcoFarm Aquaponics IoT Webhook",
    message: "Webhook 3 Tab đang hoạt động sẵn sàng nhận dữ liệu POST từ hệ thống EcoFarm!"
  })).setMimeType(ContentService.MimeType.JSON);
}
`;
}
