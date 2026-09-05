import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Link2,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Download,
  Code,
  Copy,
  Check,
  Layers,
  Settings2,
  Sliders,
  Sparkles,
  Send,
  Zap,
  ShieldCheck,
  Search,
  BookOpen,
  LineChart,
  TrendingUp,
  BarChart2,
} from 'lucide-react';
import type { GoogleSheetsData, SystemSettings } from '../types.ts';
import { syncToGoogleSheets, saveGoogleSheetsConfig, fetchGoogleSheets } from '../lib/api.ts';

interface GoogleSheetsViewProps {
  sheetsData: GoogleSheetsData | null;
  onConnect: (url: string, webhookUrl?: string) => Promise<void>;
  isLoading: boolean;
}

export const GoogleSheetsView: React.FC<GoogleSheetsViewProps> = ({
  sheetsData,
  onConnect,
  isLoading,
}) => {
  const [sheetUrlInput, setSheetUrlInput] = useState(
    sheetsData?.url || 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0'
  );
  const [webhookUrlInput, setWebhookUrlInput] = useState(sheetsData?.webhookUrl || '');

  const [activeSubTab, setActiveSubTab] = useState<'distribution' | 'data_sensor_tab' | 'settings_tab' | 'apps_script' | 'log'>('distribution');
  const [copiedScript, setCopiedScript] = useState(false);
  const [scriptCode, setScriptCode] = useState<string>('');
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Sync inputs when sheetsData updates
  useEffect(() => {
    if (sheetsData?.url) setSheetUrlInput(sheetsData.url);
    if (sheetsData?.webhookUrl) setWebhookUrlInput(sheetsData.webhookUrl);
  }, [sheetsData?.url, sheetsData?.webhookUrl]);

  // Fetch settings & Apps Script code on mount
  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => setSystemSettings(data))
      .catch((err) => console.error('Error fetching settings:', err));

    fetch('/api/sheets/apps-script-code')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.script) {
          setScriptCode(data.script);
        }
      })
      .catch((err) => console.error('Error fetching apps script:', err));
  }, []);

  const handleConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSyncFeedback(null);
    await onConnect(sheetUrlInput.trim(), webhookUrlInput.trim());
  };

  const handleUseDemoUrl = () => {
    const demoUrl = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';
    setSheetUrlInput(demoUrl);
    onConnect(demoUrl, webhookUrlInput.trim());
  };

  const handleCopyScript = () => {
    if (!scriptCode) return;
    navigator.clipboard.writeText(scriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleDownloadSettingsCsv = () => {
    window.open('/api/sheets/settings-csv', '_blank');
  };

  const handleDownloadTelemetryCsv = () => {
    window.open('/api/sheets/telemetry-csv', '_blank');
  };

  const handleDownloadDataSensorCsv = () => {
    window.open('/api/sheets/data-sensor-csv', '_blank');
  };

  const handleTriggerSync = async (target: 'all' | 'settings' | 'telemetry') => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await syncToGoogleSheets(target, webhookUrlInput.trim());
      if (res.success) {
        setSyncFeedback({
          type: 'success',
          message: res.message || 'Đồng bộ thành công lên Google Sheets!',
        });
        // Re-fetch sheet metadata to refresh status
        await onConnect(sheetUrlInput.trim(), webhookUrlInput.trim());
      } else {
        setSyncFeedback({
          type: res.needWebhook ? 'info' : 'error',
          message: res.message || 'Đồng bộ thất bại',
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err.message || 'Lỗi khi gửi yêu cầu đồng bộ',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Structured Smart Configuration Items for Tab 2
  const configGroups = [
    {
      group: '1. DINH DƯỠNG & NƯỚC',
      color: 'border-blue-500 text-blue-700 bg-blue-50',
      items: [
        {
          key: 'TDS_MIN',
          val: systemSettings?.tdsMin ?? 200,
          unit: 'ppm',
          desc: 'Dưới ngưỡng này kích hoạt cảnh báo thiếu dưỡng chất cho bèo & cây',
        },
        {
          key: 'TDS_MAX',
          val: systemSettings?.tdsMax ?? 750,
          unit: 'ppm',
          desc: 'Ngưỡng an toàn tối đa cho hệ sinh thái cá và ốc bươu đen',
        },
        {
          key: 'TDS_CRITICAL',
          val: systemSettings?.tdsCritical ?? 950,
          unit: 'ppm',
          desc: 'Ngưỡng nguy cấp, kích hoạt cảnh báo đỏ và còi khẩn cấp',
        },
      ],
    },
    {
      group: '2. GIÀN RAU & ĐỘ ẨM',
      color: 'border-emerald-500 text-emerald-700 bg-emerald-50',
      items: [
        {
          key: 'DO_AM_DAT_MIN',
          val: systemSettings?.soilMoistureMin ?? 50,
          unit: '%',
          desc: 'Dưới ngưỡng này tự động kích hoạt Bơm 2 tưới rau hồi lưu',
        },
        {
          key: 'DO_AM_DAT_MAX',
          val: systemSettings?.soilMoistureMax ?? 80,
          unit: '%',
          desc: 'Đạt ngưỡng này tự động ngắt Bơm 2 để chống úng rễ rau',
        },
        {
          key: 'THOI_GIAN_TUOI_RAU',
          val: systemSettings?.pump2IrrigationDurationSeconds ?? 45,
          unit: 'giây',
          desc: 'Thời gian chạy bơm cho mỗi đợt tưới giàn rau',
        },
        {
          key: 'KHOANG_NGHI_TUOI',
          val: systemSettings?.pump2RestIntervalMinutes ?? 30,
          unit: 'phút',
          desc: 'Khoảng nghỉ giữa 2 lần tưới liên tiếp để đất thẩm thấu',
        },
      ],
    },
    {
      group: '3. BƠM TUẦN HOÀN',
      color: 'border-cyan-500 text-cyan-700 bg-cyan-50',
      items: [
        {
          key: 'THOI_GIAN_BOM_1_MAX',
          val: systemSettings?.pump1MaxContinuousMinutes ?? 45,
          unit: 'phút',
          desc: 'Thời gian Bơm 1 tuần hoàn sinh thái chạy liên tục tối đa',
        },
      ],
    },
    {
      group: '4. AN TOÀN & BÁO ĐỘNG',
      color: 'border-rose-500 text-rose-700 bg-rose-50',
      items: [
        {
          key: 'TU_DONG_NGAT_KHI_CAN',
          val: systemSettings?.floatLowSafetyCutoff ? 'BAT' : 'TAT',
          unit: 'Logic',
          desc: 'Tự động ngắt Bơm 1 ngay khi phao đáy báo cạn để chống cháy bơm',
        },
        {
          key: 'COI_BUZZER_CANH_BAO',
          val: systemSettings?.autoRules.buzzerOnCriticalAlert ? 'BAT' : 'TAT',
          unit: 'Logic',
          desc: 'Kêu còi bíp cảnh báo khi hệ thống có sự cố bất thường',
        },
      ],
    },
    {
      group: '5. THIẾT BỊ & PHẦN CỨNG',
      color: 'border-slate-500 text-slate-700 bg-slate-50',
      items: [
        {
          key: 'CHU_KY_GUI_TIN_ESP',
          val: systemSettings?.espReportIntervalSeconds ?? 5,
          unit: 'giây',
          desc: 'Chu kỳ gửi dữ liệu telemetry từ trạm vi điều khiển ESP32-S3',
        },
        {
          key: 'CHU_KY_GHI_SHEETS',
          val: systemSettings?.espSheetsSyncIntervalSeconds ?? 60,
          unit: 'giây',
          desc: 'Chu kỳ máy chủ tự động đẩy đồng bộ lên Google Sheets',
        },
        {
          key: 'DEVICE_ID',
          val: systemSettings?.deviceId || 'ESP32S3_ECO_01',
          unit: 'ID Phần Cứng',
          desc: 'Mã định danh duy nhất của vi điều khiển trạm Aquaponics',
        },
      ],
    },
  ];

  // Filter items by search term
  const filteredGroups = configGroups
    .map((grp) => ({
      ...grp,
      items: grp.items.filter(
        (it) =>
          it.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          it.desc.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    }))
    .filter((grp) => grp.items.length > 0);

  return (
    <div className="space-y-6 pb-20 sm:pb-6 max-w-5xl mx-auto font-sans" id="google-sheets-container">
      {/* Title & Overview Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-700 border border-emerald-100 shrink-0 shadow-xs">
            <FileSpreadsheet className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Đồng Bộ Google Sheets &amp; Phân Bố Dữ Liệu Thông Minh
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wide border border-emerald-200">
                2 Tab Trên 1 File
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Giải pháp lưu trữ thông minh: Dữ liệu đo đạc (Telemetry) phân bổ theo dòng thời gian ở <b>Tab 1</b>, còn toàn bộ 14 thông số cài đặt hệ thống được phân nhóm tra cứu nhanh ở <b>Tab 2</b>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <button
            onClick={handleDownloadSettingsCsv}
            className="text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-semibold flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 shadow-xs cursor-pointer transition-colors"
            title="Tải tệp CSV cấu hình 5 cột để nạp vào Google Sheet"
          >
            <Download className="w-3.5 h-3.5 text-emerald-700" />
            <span>CSV Cài Đặt (Tab 2)</span>
          </button>

          <button
            onClick={handleDownloadTelemetryCsv}
            className="text-xs text-blue-800 bg-blue-50 hover:bg-blue-100 font-semibold flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 shadow-xs cursor-pointer transition-colors"
            title="Tải tệp CSV nhật ký 9 cột để nạp vào Google Sheet"
          >
            <Download className="w-3.5 h-3.5 text-blue-700" />
            <span>CSV Nhật Ký (Tab 1)</span>
          </button>

          <button
            onClick={handleUseDemoUrl}
            className="text-xs text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1 bg-white hover:bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 shadow-xs cursor-pointer transition-colors"
          >
            <span>Sheet Mẫu</span>
          </button>
        </div>
      </div>

      {/* 2-Way Connection & Webhook Configuration Console */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Link2 className="w-4 h-4 text-emerald-600" />
              <span>Cấu Hình Liên Kết Google Sheets &amp; Webhook Đẩy Dữ Liệu</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Nhập link bảng tính Google Sheet của bạn để đọc và link Webhook Web App để tự động đẩy dữ liệu lên
            </p>
          </div>

          {sheetsData?.spreadsheetId && sheetsData.spreadsheetId !== 'APPS_SCRIPT_WEBHOOK' && (
            <a
              href={`https://docs.google.com/spreadsheets/d/${sheetsData.spreadsheetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-semibold hover:underline"
            >
              Mở Google Sheets Trong Tab Mới <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <form onSubmit={handleConnect} className="space-y-3.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Input 1: Google Sheet URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>1. Đường Link Google Sheet hoặc Drive (Để Mở &amp; Đọc Dữ Liệu)</span>
                <span className="text-[10px] text-slate-400 font-normal">Bắt buộc</span>
              </label>
              <div className="relative">
                <FileSpreadsheet className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={sheetUrlInput}
                  onChange={(e) => setSheetUrlInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit hoặc link Drive"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-mono transition-all"
                />
              </div>

              {/* Dynamic feedback under Box 1 */}
              {sheetUrlInput.includes('drive.google.com/file/d/') && (
                <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Đã nhận diện link Google Drive! Hệ thống sẽ tự động trích xuất mã tệp sang Google Sheets.</span>
                </p>
              )}
              {sheetUrlInput.includes('drive.google.com/drive/folders/') && (
                <p className="text-[11px] text-amber-800 font-medium flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Đây là link Thư mục Drive (Folder). Vui lòng mở tệp bảng tính bên trong và copy link của bảng tính đó.</span>
                </p>
              )}
              {sheetUrlInput.includes('script.google.com/macros/s/') && (
                <div className="flex items-center justify-between text-[11px] text-blue-800 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200">
                  <span className="flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Bạn đang dán link Webhook Apps Script vào ô Sheet.</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setWebhookUrlInput(sheetUrlInput);
                      setSheetUrlInput('');
                    }}
                    className="font-bold underline text-blue-700 hover:text-blue-900 cursor-pointer ml-2"
                  >
                    Chuyển sang ô số 2
                  </button>
                </div>
              )}
            </div>

            {/* Input 2: Google Apps Script Webhook URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>2. Đường Link Webhook Web App (Để Tự Động Ghi / Đẩy Lên)</span>
                <span className="text-[10px] text-emerald-600 font-semibold">Khuyến nghị để ghi 2 chiều</span>
              </label>
              <div className="relative">
                <Zap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                <input
                  type="text"
                  value={webhookUrlInput}
                  onChange={(e) => setWebhookUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 font-mono transition-all"
                />
              </div>

              {/* Dynamic feedback under Box 2 */}
              {(webhookUrlInput.includes('script.google.com/d/') || (webhookUrlInput.includes('script.google.com') && webhookUrlInput.includes('/edit'))) && (
                <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 space-y-1">
                  <p className="font-bold flex items-center gap-1 text-amber-900">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Lưu ý: Đây là link soạn thảo mã Apps Script (/edit), không phải Web App!</span>
                  </p>
                  <p className="text-amber-800 leading-normal">
                    Để có link Webhook: Vào Apps Script -&gt; Bấm nút xanh <b>Triển khai (Deploy)</b> ở góc trên bên phải -&gt; Chọn <b>Tùy chọn triển khai mới</b> -&gt; Loại: <b>Ứng dụng web (Web app)</b> -&gt; Quyền truy cập: <b>Bất kỳ ai (Anyone)</b> -&gt; Bấm Triển khai và copy link đuôi <code>/exec</code>.
                  </p>
                </div>
              )}
              {(webhookUrlInput.includes('docs.google.com/spreadsheets') || webhookUrlInput.includes('drive.google.com')) && (
                <div className="flex items-center justify-between text-[11px] text-blue-800 bg-blue-50 px-2.5 py-1.5 rounded-lg border border-blue-200">
                  <span className="flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Bạn đang dán link Google Sheets/Drive vào ô Webhook.</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSheetUrlInput(webhookUrlInput);
                      setWebhookUrlInput('');
                    }}
                    className="font-bold underline text-blue-700 hover:text-blue-900 cursor-pointer ml-2"
                  >
                    Chuyển sang ô số 1
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Hỗ trợ cả link Google Sheets thông thường lẫn link chia sẻ từ Google Drive.</span>
            </div>

            <div className="flex items-center gap-2">
              {sheetUrlInput && webhookUrlInput && (
                <button
                  type="button"
                  onClick={() => {
                    const temp = sheetUrlInput;
                    setSheetUrlInput(webhookUrlInput);
                    setWebhookUrlInput(temp);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                  title="Đổi chỗ 2 đường link nếu bạn lỡ dán ngược"
                >
                  Đổi chỗ 2 ô
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2 whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>LƯU &amp; KIỂM TRA KẾT NỐI</span>
              </button>
            </div>
          </div>
        </form>

        {/* Live Sync Action Console: Direct Push Buttons */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-emerald-600" />
                <span>Hộp Công Cụ Đẩy Dữ Liệu Lên Google Sheets (Sync Now)</span>
              </p>
              <p className="text-[11px] text-slate-500">
                Bấm nút để kích hoạt đẩy ngay lập tức dữ liệu cài đặt hoặc điểm đo telemetry lên file Sheet
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleTriggerSync('settings')}
                disabled={isSyncing}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs rounded-lg border border-slate-200 shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                <span>Đẩy Cài Đặt (Tab 2)</span>
              </button>

              <button
                onClick={() => handleTriggerSync('telemetry')}
                disabled={isSyncing}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs rounded-lg border border-slate-200 shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Database className="w-3.5 h-3.5 text-blue-600" />
                <span>Đẩy Cảm Biến (Tab 1 &amp; 3)</span>
              </button>

              <button
                onClick={handleDownloadDataSensorCsv}
                className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 font-semibold text-xs rounded-lg border border-indigo-200 shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                title="Tải file CSV dữ liệu số chuẩn hóa cho Tab 3 data_sensor"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tải CSV data_sensor (Tab 3)</span>
              </button>

              <button
                onClick={() => handleTriggerSync('all')}
                disabled={isSyncing}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Zap className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>ĐỒNG BỘ TOÀN DIỆN (CẢ 3 TAB)</span>
              </button>
            </div>
          </div>

          {/* Sync Action Feedback Alert */}
          {syncFeedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 transition-all ${
                syncFeedback.type === 'success'
                  ? 'bg-emerald-100/70 border border-emerald-200 text-emerald-900'
                  : syncFeedback.type === 'info'
                  ? 'bg-amber-100/70 border border-amber-200 text-amber-900'
                  : 'bg-rose-100/70 border border-rose-200 text-rose-900'
              }`}
            >
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : syncFeedback.type === 'info' ? (
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{syncFeedback.message}</p>
                {syncFeedback.type === 'info' && (
                  <p className="text-[11px] mt-1 text-amber-800">
                    💡 <b>Cách xử lý:</b> Bạn chỉ cần bấm sang tab <b>"Mã Apps Script"</b> bên dưới, làm theo 3 bước hướng dẫn để lấy link Webhook dán vào ô số 2 là có thể đẩy dữ liệu tự động 2 chiều mọi lúc! Hoặc có thể bấm <b>"Tải CSV Cài Đặt"</b> để nạp thủ công.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Connection Error Notification with Smart Troubleshooting */}
        {sheetsData?.error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <p className="font-bold text-rose-950 text-sm">Chẩn Đoán Kết Nối Google Sheets</p>
              <p className="text-rose-700 leading-relaxed">{sheetsData.error}</p>
              <div className="mt-2 text-[11px] text-rose-950 bg-white/80 p-3 rounded-lg border border-rose-200 leading-relaxed space-y-1">
                <p className="font-bold text-rose-900">🛠 Hướng dẫn khắc phục quyền riêng tư Google Sheets:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-700">
                  <li>Mở bảng tính Google Sheets của bạn trên trình duyệt.</li>
                  <li>Bấm nút <b>Chia sẻ (Share)</b> màu xanh ở góc trên bên phải.</li>
                  <li>Tại mục <b>Quyền truy cập chung</b> (General access), chuyển từ <i>Hạn chế</i> sang <b>"Bất kỳ ai có đường liên kết"</b> (Anyone with the link).</li>
                  <li>Chọn quyền <b>Người xem (Viewer)</b> hoặc <b>Người chỉnh sửa (Editor)</b> rồi bấm <b>Xong</b>.</li>
                  <li>Quay lại đây và bấm nút <b>"LƯU &amp; KIỂM TRA KẾT NỐI"</b> phía trên.</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Connected Success Message */}
        {sheetsData?.connected && !sheetsData.error && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-950">{sheetsData.message}</p>
              {sheetsData.isNewOrEmpty && (
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Bảng tính mới của bạn đã sẵn sàng! Bạn có thể bấm nút <b>"Đẩy Cài Đặt (Tab 2)"</b> hoặc chạy hàm Apps Script để khởi tạo giao diện 2 Tab chuẩn.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Connection Status KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              sheetsData?.connected
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}
          >
            {sheetsData?.connected ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Trạng Thái Kết Nối</p>
            <p className="text-sm font-bold text-slate-900">
              {sheetsData?.connected ? (
                <span className="text-emerald-700">Đã Liên Kết Thành Công</span>
              ) : (
                <span className="text-slate-500">Chưa Hoàn Tất</span>
              )}
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 border border-slate-200 shrink-0">
            <Database className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dữ Liệu Đã Đọc / Ghi</p>
            <p className="text-sm font-bold text-slate-900 font-mono">
              {sheetsData?.rowsCount ?? 0} dòng
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 border border-slate-200 shrink-0">
            <Clock className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Đồng Bộ Gần Nhất</p>
            <p className="text-sm font-bold text-slate-900">
              {sheetsData?.lastSyncTime
                ? new Date(sheetsData.lastSyncTime).toLocaleTimeString('vi-VN')
                : sheetsData?.lastUpdate
                ? new Date(sheetsData.lastUpdate).toLocaleTimeString('vi-VN')
                : 'Chưa có'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-4 pt-3 bg-slate-50/70 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('distribution')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === 'distribution'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>1. Sơ Đồ Kiến Trúc 3 Tab</span>
          </button>

          <button
            onClick={() => setActiveSubTab('data_sensor_tab')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === 'data_sensor_tab'
                ? 'border-indigo-600 text-indigo-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <LineChart className="w-4 h-4 text-indigo-600" />
            <span>2. Tab 3: data_sensor (Chuỗi Số Vẽ Biểu Đồ)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('settings_tab')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === 'settings_tab'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>3. Tab 2: CaiDat_HeThong</span>
          </button>

          <button
            onClick={() => setActiveSubTab('log')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === 'log'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>4. Tab 1: DuLieu_NhatKy ({sheetsData?.records?.length ?? 0})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('apps_script')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === 'apps_script'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>5. Mã Apps Script 3 Tab &amp; Auto Chart</span>
          </button>
        </div>

        {/* SUB-TAB 1: DATA DISTRIBUTION SCHEMA EXPLANATION */}
        {activeSubTab === 'distribution' && (
          <div className="p-5 space-y-5">
            <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-800 text-white rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Kiến Trúc Phân Bố Dữ Liệu 3 Tab Chuẩn Hóa (Tri-Tab Cloud Schema)
                  </h3>
                  <p className="text-xs text-slate-300">
                    Phân tách rõ ràng giữa Nhật ký đọc trực quan (Tab 1), Cấu hình thông số (Tab 2) và Cơ sở dữ liệu số chuyên dụng vẽ biểu đồ thời gian (Tab 3: data_sensor)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                {/* Tab 1 Spec */}
                <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-700/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5 font-mono">
                      <Layers className="w-4 h-4" />
                      <span>Tab 1: DuLieu_NhatKy</span>
                    </span>
                    <span className="text-[10px] bg-sky-500/20 text-sky-300 font-semibold px-2 py-0.5 rounded font-mono">
                      14 Cột
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Lưu trữ toàn diện các điểm đo cảm biến kèm văn bản giải nghĩa tiếng Việt (BẬT/TẮT, ĐỦ NƯỚC, TRÀN BỂ) giúp kỹ sư nông trại dễ dàng theo dõi trực tiếp bằng mắt.
                  </p>
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 space-y-1">
                    <p className="text-slate-400 uppercase font-bold">14 Cột Văn Bản &amp; Đánh Giá:</p>
                    <p className="text-sky-300 leading-normal">
                      Thời Gian • Thiết Bị • TDS • Độ Ẩm Đất • Phao Đáy • Phao Tràn • Bơm 1 • Bơm 2 • Buzzer • WiFi • Chế Độ • Bèo AI • Trứng Ốc • Ghi Chú
                    </p>
                  </div>
                </div>

                {/* Tab 2 Spec */}
                <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-700/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 font-mono">
                      <Sliders className="w-4 h-4" />
                      <span>Tab 2: CaiDat_HeThong</span>
                    </span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 font-semibold px-2 py-0.5 rounded font-mono">
                      5 Cột Key-Value
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Bảng cấu hình thông số vận hành chia theo 5 nhóm thông minh. Dễ dàng kiểm tra và tinh chỉnh ngưỡng TDS, độ ẩm, thời gian bơm từ xa.
                  </p>
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 space-y-1">
                    <p className="text-slate-400 uppercase font-bold">5 Cột Phân Nhóm Cấu Hình:</p>
                    <p className="text-amber-300 leading-normal">
                      MÃ THÔNG SỐ • GIÁ TRỊ (VALUE) • ĐƠN VỊ &amp; Ý NGHĨA • NHÓM CẤU HÌNH • THỜI GIAN CẬP NHẬT
                    </p>
                  </div>
                </div>

                {/* Tab 3 Spec: data_sensor */}
                <div className="p-4 bg-slate-950/90 rounded-xl border border-indigo-500/50 shadow-sm space-y-2.5 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg uppercase tracking-wider">
                    MỚI THÊM
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 font-mono">
                      <LineChart className="w-4 h-4 text-indigo-400" />
                      <span>Tab 3: data_sensor</span>
                    </span>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded font-mono mr-12">
                      12 Cột Số Chuẩn
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <b>Cơ sở vẽ biểu đồ chuỗi thời gian:</b> 100% cột là dạng số nguyên thủy (Numeric) và mốc thời gian chuẩn. Tương thích ngay với Google Sheets Chart, Looker Studio, và Dashboard.
                  </p>
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300 space-y-1">
                    <p className="text-indigo-400 uppercase font-bold">12 Cột Số Chuyên Dụng Biểu Đồ:</p>
                    <p className="text-indigo-300 leading-normal">
                      timestamp • device_id • tds_ppm • soil_moisture_pct • water_level_state • pump1_state • pump2_state • buzzer_state • wifi_rssi_dbm • duckweed_coverage_pct • snail_eggs_count • auto_mode
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step By Step Usage Guide */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="w-7 h-7 bg-emerald-100 text-emerald-800 rounded-lg flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h4 className="text-xs font-bold text-slate-900">Mở Quyền Google Sheet</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Đảm bảo đường link bảng tính đã được mở quyền <i>"Bất kỳ ai có đường liên kết"</i> để server có thể đọc và đồng bộ.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="w-7 h-7 bg-indigo-100 text-indigo-800 rounded-lg flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h4 className="text-xs font-bold text-slate-900">Khởi Tạo 3 Tab Tự Động</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Sao chép mã Apps Script ở Tab 5, bấm chạy hàm <b>khoiTaoBaTabEcoFarm</b> để Google Sheet tự sinh 3 Tab đầy đủ cấu trúc và màu sắc.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="w-7 h-7 bg-purple-100 text-purple-800 rounded-lg flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h4 className="text-xs font-bold text-slate-900">Vẽ Biểu Đồ &amp; Webhook</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Chạy hàm <b>taoBieuDoDataSensor</b> để vẽ biểu đồ đường Line Chart tự động, và dán link Webhook để hệ thống đẩy điểm đo thời gian thực.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: DATA_SENSOR (CHUYÊN DỤNG VẼ BIỂU ĐỒ THEO THỜI GIAN) */}
        {activeSubTab === 'data_sensor_tab' && (
          <div className="p-5 space-y-5">
            {/* Header Banner */}
            <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 text-white rounded-2xl p-5 border border-indigo-900/60 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shrink-0">
                    <LineChart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Tab 3: data_sensor — Cơ Sở Dữ Liệu Vẽ Biểu Đồ Thời Gian</span>
                      <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-mono px-2 py-0.5 rounded-full border border-indigo-500/40">
                        Numeric Time-Series
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300">
                      Được thiết kế chuyên biệt với 100% cột số (Numeric) phục vụ vẽ biểu đồ biến thiên TDS, độ ẩm đất, trạng thái bơm theo thời gian thực
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleDownloadDataSensorCsv}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải CSV data_sensor</span>
                  </button>

                  <button
                    onClick={() => setActiveSubTab('apps_script')}
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-indigo-200 font-semibold text-xs rounded-xl border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>Xem Mã Apps Script Tự Động Vẽ</span>
                  </button>
                </div>
              </div>

              {/* Core Advantage Explanation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs text-slate-300">
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1.5">
                  <p className="font-bold text-indigo-300 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    <span>Tại sao cần Tab data_sensor riêng biệt?</span>
                  </p>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Tab 1 <code>DuLieu_NhatKy</code> chứa các chuỗi tiếng Việt như <i>"BẬT"</i>, <i>"ĐỦ NƯỚC"</i>, <i>"ppm"</i> giúp người đọc dễ nhìn nhưng công cụ biểu đồ sẽ bị lỗi không vẽ được trục số. Tab 3 <code>data_sensor</code> chuyển toàn bộ sang số nguyên thủy (0, 1, 450, 68) giúp Google Sheets vẽ biểu đồ đường Line Chart mượt mà lập tức!
                  </p>
                </div>

                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1.5">
                  <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>Tự Động Cập Nhật Đồng Thời</span>
                  </p>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Mỗi khi trạm vi điều khiển ESP32 hoặc hệ thống gửi dữ liệu telemetry qua Webhook, Apps Script sẽ tự động ghi đồng thời 1 dòng vào Tab 1 và 1 dòng số vào Tab 3 <code>data_sensor</code>. Biểu đồ của bạn trên Google Sheets sẽ tự động nối dài đường cong theo thời gian!
                  </p>
                </div>
              </div>
            </div>

            {/* Column Schema Specification Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-3 p-4">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-600" />
                <span>Quy Chuẩn 12 Cột Số Của data_sensor (Dùng Làm Trục Vẽ Biểu Đồ)</span>
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-indigo-950 text-indigo-200 font-mono text-[11px]">
                      <th className="py-2.5 px-3 font-semibold">STT</th>
                      <th className="py-2.5 px-3 font-semibold">Tên Cột (Header)</th>
                      <th className="py-2.5 px-3 font-semibold">Kiểu Dữ Liệu</th>
                      <th className="py-2.5 px-3 font-semibold">Miền Giá Trị</th>
                      <th className="py-2.5 px-3 font-semibold">Vai Trò Vẽ Biểu Đồ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-slate-400 font-mono">1</td>
                      <td className="py-2 px-3 font-mono font-bold text-indigo-700">timestamp</td>
                      <td className="py-2 px-3 text-slate-700 font-semibold">DateTime</td>
                      <td className="py-2 px-3 font-mono text-slate-600">dd/MM/yyyy HH:mm:ss</td>
                      <td className="py-2 px-3 text-slate-700"><b>Trục Hoành X (Thời gian)</b> làm mốc biến thiên</td>
                    </tr>
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-slate-400 font-mono">2</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">device_id</td>
                      <td className="py-2 px-3 text-slate-700">String</td>
                      <td className="py-2 px-3 font-mono text-slate-600">ESP32S3_ECO_01</td>
                      <td className="py-2 px-3 text-slate-700">Bộ lọc phân loại trạm (Filter/Series)</td>
                    </tr>
                    <tr className="hover:bg-indigo-50/40">
                      <td className="py-2 px-3 text-slate-400 font-mono">3</td>
                      <td className="py-2 px-3 font-mono font-bold text-sky-700">tds_ppm</td>
                      <td className="py-2 px-3 text-sky-800 font-semibold">Number (Float)</td>
                      <td className="py-2 px-3 font-mono text-slate-600">0 – 2000 ppm</td>
                      <td className="py-2 px-3 text-sky-800 font-semibold"><b>Trục Tung Y1 (Trái)</b>: Đường cong nồng độ dinh dưỡng nước</td>
                    </tr>
                    <tr className="hover:bg-emerald-50/40">
                      <td className="py-2 px-3 text-slate-400 font-mono">4</td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-700">soil_moisture_pct</td>
                      <td className="py-2 px-3 text-emerald-800 font-semibold">Number (Float)</td>
                      <td className="py-2 px-3 font-mono text-slate-600">0 – 100 %</td>
                      <td className="py-2 px-3 text-emerald-800 font-semibold"><b>Trục Tung Y2 (Phải)</b>: Đường cong độ ẩm đất giàn rau</td>
                    </tr>
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-slate-400 font-mono">5</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">water_level_state</td>
                      <td className="py-2 px-3 text-slate-700 font-semibold">Number (Enum)</td>
                      <td className="py-2 px-3 font-mono text-slate-600">0=Cạn, 1=Đủ, 2=Tràn</td>
                      <td className="py-2 px-3 text-slate-700">Biểu đồ bậc thang (Step Chart) mức an toàn nước bồn</td>
                    </tr>
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-slate-400 font-mono">6</td>
                      <td className="py-2 px-3 font-mono font-bold text-cyan-700">pump1_state</td>
                      <td className="py-2 px-3 text-slate-700 font-semibold">Number (Binary)</td>
                      <td className="py-2 px-3 font-mono text-slate-600">1 (BẬT) / 0 (TẮT)</td>
                      <td className="py-2 px-3 text-slate-700">Xung hoạt động chu kỳ Bơm 1 tuần hoàn</td>
                    </tr>
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-slate-400 font-mono">7</td>
                      <td className="py-2 px-3 font-mono font-bold text-emerald-700">pump2_state</td>
                      <td className="py-2 px-3 text-slate-700 font-semibold">Number (Binary)</td>
                      <td className="py-2 px-3 font-mono text-slate-600">1 (BẬT) / 0 (TẮT)</td>
                      <td className="py-2 px-3 text-slate-700">Xung hoạt động chu kỳ Bơm 2 tưới rau</td>
                    </tr>
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-slate-400 font-mono">8</td>
                      <td className="py-2 px-3 font-mono font-bold text-rose-700">buzzer_state</td>
                      <td className="py-2 px-3 text-slate-700 font-semibold">Number (Binary)</td>
                      <td className="py-2 px-3 font-mono text-slate-600">1 (KÊU) / 0 (TẮT)</td>
                      <td className="py-2 px-3 text-slate-700">Chỉ số cảnh báo sự cố bất thường</td>
                    </tr>
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-slate-400 font-mono">9</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">wifi_rssi_dbm</td>
                      <td className="py-2 px-3 text-slate-700 font-semibold">Number (Int)</td>
                      <td className="py-2 px-3 font-mono text-slate-600">-90 đến -30 dBm</td>
                      <td className="py-2 px-3 text-slate-700">Biểu đồ đường theo dõi chất lượng kết nối WiFi</td>
                    </tr>
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-slate-400 font-mono">10</td>
                      <td className="py-2 px-3 font-mono font-bold text-teal-700">duckweed_coverage_pct</td>
                      <td className="py-2 px-3 text-slate-700 font-semibold">Number (Float)</td>
                      <td className="py-2 px-3 font-mono text-slate-600">0 – 100 %</td>
                      <td className="py-2 px-3 text-slate-700">Theo dõi tốc độ sinh trưởng sinh khối bèo lọc</td>
                    </tr>
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-slate-400 font-mono">11</td>
                      <td className="py-2 px-3 font-mono font-bold text-amber-700">snail_eggs_count</td>
                      <td className="py-2 px-3 text-slate-700 font-semibold">Number (Int)</td>
                      <td className="py-2 px-3 font-mono text-slate-600">0 – 50 ổ</td>
                      <td className="py-2 px-3 text-slate-700">Biểu đồ cột theo dõi mật độ sinh sản ốc bươu</td>
                    </tr>
                    <tr className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-slate-400 font-mono">12</td>
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">auto_mode</td>
                      <td className="py-2 px-3 text-slate-700 font-semibold">Number (Binary)</td>
                      <td className="py-2 px-3 font-mono text-slate-600">1=AUTO, 0=MANUAL</td>
                      <td className="py-2 px-3 text-slate-700">Trạng thái tự động hóa</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Real Data Preview Table in data_sensor format */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-3 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-600" />
                  <span>Dữ Liệu Chuỗi Thời Gian Mẫu Được Định Dạng Vào Tab data_sensor</span>
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">
                  {sheetsData?.records?.length ?? 0} bản ghi đo đạc
                </span>
              </div>

              <div className="overflow-x-auto max-h-72 border border-slate-100 rounded-lg">
                <table className="w-full text-left border-collapse text-[11px] font-mono">
                  <thead className="bg-indigo-950 text-indigo-200 sticky top-0">
                    <tr>
                      <th className="py-2 px-2.5 whitespace-nowrap">timestamp</th>
                      <th className="py-2 px-2.5 whitespace-nowrap">device_id</th>
                      <th className="py-2 px-2.5 whitespace-nowrap text-sky-300">tds_ppm</th>
                      <th className="py-2 px-2.5 whitespace-nowrap text-emerald-300">soil_moisture_pct</th>
                      <th className="py-2 px-2.5 whitespace-nowrap">water_level_state</th>
                      <th className="py-2 px-2.5 whitespace-nowrap">pump1_state</th>
                      <th className="py-2 px-2.5 whitespace-nowrap">pump2_state</th>
                      <th className="py-2 px-2.5 whitespace-nowrap">buzzer_state</th>
                      <th className="py-2 px-2.5 whitespace-nowrap">wifi_rssi_dbm</th>
                      <th className="py-2 px-2.5 whitespace-nowrap">duckweed_coverage_pct</th>
                      <th className="py-2 px-2.5 whitespace-nowrap">snail_eggs_count</th>
                      <th className="py-2 px-2.5 whitespace-nowrap">auto_mode</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {sheetsData?.records && sheetsData.records.length > 0 ? (
                      sheetsData.records.slice(0, 15).map((row, idx) => {
                        const waterState = !row.float_low ? 0 : (row.float_high ? 2 : 1);
                        return (
                          <tr key={idx} className="hover:bg-indigo-50/30">
                            <td className="py-1.5 px-2.5 whitespace-nowrap text-slate-600">
                              {new Date(row.timestamp).toLocaleString('vi-VN')}
                            </td>
                            <td className="py-1.5 px-2.5 whitespace-nowrap text-slate-800 font-semibold">
                              {row.device_id || 'ESP32S3_ECO_01'}
                            </td>
                            <td className="py-1.5 px-2.5 whitespace-nowrap text-sky-700 font-bold">
                              {row.tds}
                            </td>
                            <td className="py-1.5 px-2.5 whitespace-nowrap text-emerald-700 font-bold">
                              {row.soil_moisture}
                            </td>
                            <td className="py-1.5 px-2.5 whitespace-nowrap text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                waterState === 1 ? 'bg-emerald-100 text-emerald-800' : waterState === 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {waterState}
                              </span>
                            </td>
                            <td className="py-1.5 px-2.5 whitespace-nowrap text-center">
                              {row.pump1 ? <span className="text-cyan-700 font-bold">1</span> : <span className="text-slate-400">0</span>}
                            </td>
                            <td className="py-1.5 px-2.5 whitespace-nowrap text-center">
                              {row.pump2 ? <span className="text-emerald-700 font-bold">1</span> : <span className="text-slate-400">0</span>}
                            </td>
                            <td className="py-1.5 px-2.5 whitespace-nowrap text-center">
                              {row.buzzer ? <span className="text-rose-700 font-bold">1</span> : <span className="text-slate-400">0</span>}
                            </td>
                            <td className="py-1.5 px-2.5 whitespace-nowrap text-slate-600">
                              {row.wifi_rssi || -60}
                            </td>
                            <td className="py-1.5 px-2.5 whitespace-nowrap text-slate-600">
                              75
                            </td>
                            <td className="py-1.5 px-2.5 whitespace-nowrap text-slate-600">
                              5
                            </td>
                            <td className="py-1.5 px-2.5 whitespace-nowrap text-center">
                              {row.mode === 'MANUAL' ? '0' : '1'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={12} className="py-6 text-center text-slate-400 font-sans text-xs">
                          Chưa có dữ liệu cảm biến nào. Bấm nút <b>"Đẩy Cảm Biến (Tab 1 &amp; 3)"</b> ở trên để tạo dòng dữ liệu đầu tiên!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Visual Guide: 2 Ways to Create Charts */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-700" />
                <span>2 Cách Vẽ Biểu Đồ Chuỗi Thời Gian Từ Tab data_sensor</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Method 1: Auto Apps Script */}
                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-xs space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">A</span>
                    <h5 className="font-bold text-indigo-900">Cách 1: Tự Động 1-Click Với Apps Script (Khuyên Dùng)</h5>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Mã Google Apps Script của chúng tôi đã tích hợp sẵn hàm <code>taoBieuDoDataSensor()</code>:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700 font-sans pl-1">
                    <li>Mở file Google Sheets của bạn trên trình duyệt.</li>
                    <li>Trên thanh menu đỉnh, chọn menu <b>🌿 EcoFarm IoT</b>.</li>
                    <li>Bấm chọn <b>"2. Tự Động Vẽ Biểu Đồ data_sensor"</b>.</li>
                  </ol>
                  <p className="text-indigo-800 text-[11px] bg-indigo-50 p-2 rounded-lg border border-indigo-200 font-medium">
                    ✨ Biểu đồ đường Line Chart 2 trục (TDS màu xanh lam &amp; Độ ẩm màu xanh lá) sẽ tự động xuất hiện ngay cạnh bảng số liệu từ cột N!
                  </p>
                </div>

                {/* Method 2: Manual Insert */}
                <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-xs space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-700 text-white font-bold flex items-center justify-center text-xs">B</span>
                    <h5 className="font-bold text-slate-900">Cách 2: Chèn Biểu Đồ Thủ Công Trong Google Sheets</h5>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Nếu bạn muốn tùy biến giao diện biểu đồ theo ý thích:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-700 font-sans pl-1">
                    <li>Mở tab <b>data_sensor</b>.</li>
                    <li>Giữ phím <b>Ctrl</b> (hoặc <b>Cmd</b> trên Mac), bôi đen <b>Cột A (timestamp)</b>, <b>Cột C (tds_ppm)</b> và <b>Cột D (soil_moisture_pct)</b>.</li>
                    <li>Vào menu <b>Chèn (Insert)</b> -&gt; chọn <b>Biểu đồ (Chart)</b>.</li>
                    <li>Ở bảng bên phải: Loại biểu đồ chọn <b>Biểu đồ đường (Line chart)</b>.</li>
                  </ol>
                  <p className="text-slate-700 text-[11px] bg-slate-50 p-2 rounded-lg border border-slate-200">
                    💡 Do dữ liệu là kiểu số chuẩn hóa, Google Sheets sẽ tự động nhận diện trục thời gian và vẽ biểu đồ ngay lập tức mà không gặp bất kỳ lỗi nào!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 3: SETTINGS TABLE ORGANIZED IN 5 SMART GROUPS */}
        {activeSubTab === 'settings_tab' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/80">
              <div>
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-emerald-700" />
                  <span>Dữ Liệu Thông Số Cài Đặt (Tab 2: CaiDat_HeThong)</span>
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Bảng thông số được tổ chức thành 5 nhóm cấu hình thông minh giúp tra cứu và quản trị trực quan
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm thông số..."
                    className="bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 w-36 sm:w-44"
                  />
                </div>

                <button
                  onClick={handleDownloadSettingsCsv}
                  className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải CSV</span>
                </button>
              </div>
            </div>

            {/* Smart 5-Category Layout */}
            <div className="space-y-4">
              {filteredGroups.map((grp, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <div className="bg-slate-100/70 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${grp.color.split(' ')[2]}`} />
                      <span>{grp.group}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold font-mono">
                      {grp.items.length} thông số
                    </span>
                  </div>

                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="py-2 px-4 w-44 font-mono">MÃ THÔNG SỐ (KEY)</th>
                        <th className="py-2 px-4 w-28 font-mono text-right sm:text-left">GIÁ TRỊ (VALUE)</th>
                        <th className="py-2 px-4">ĐƠN VỊ &amp; Ý NGHĨA HOẠT ĐỘNG</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {grp.items.map((it, itemIdx) => (
                        <tr key={itemIdx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-4 font-mono font-bold text-slate-900 text-[11px]">
                            {it.key}
                          </td>
                          <td className="py-2 px-4 font-mono font-bold text-emerald-700 text-[12px] text-right sm:text-left">
                            {it.val}
                          </td>
                          <td className="py-2 px-4 text-slate-600 text-xs">
                            <span className="font-semibold text-slate-700">[{it.unit}]</span> — {it.desc}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SUB-TAB 5: APPS SCRIPT CODE & AUTOMATION WIZARD */}
        {activeSubTab === 'apps_script' && (
          <div className="p-5 space-y-4">
            <div className="p-5 bg-slate-900 text-slate-200 rounded-2xl space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Mã Apps Script Tự Động Khởi Tạo 3 Tab, Vẽ Biểu Đồ &amp; Nhận Webhook</span>
                  </h4>
                  <p className="text-xs text-slate-300">
                    Bao gồm hàm khởi tạo 3 Tab chuẩn, hàm tự động vẽ biểu đồ đường Line Chart 2 trục trên tab <code>data_sensor</code>, và Webhook 2 chiều
                  </p>
                </div>

                <button
                  onClick={handleCopyScript}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  {copiedScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedScript ? 'ĐÃ SAO CHÉP MÃ!' : 'SAO CHÉP MÃ APPS SCRIPT 3 TAB'}</span>
                </button>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <span>📌 4 Bước Triển Khai Trong Vòng 60 Giây:</span>
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                  <li>
                    Trên file Google Sheets trống của bạn, bấm menu <b>Tiện ích mở rộng (Extensions)</b> -&gt; chọn <b>Apps Script</b>.
                  </li>
                  <li>
                    Xóa hết mã trắng có sẵn, dán toàn bộ đoạn mã bên dưới vào rồi bấm biểu tượng <b>Lưu (Save)</b>.
                  </li>
                  <li>
                    Tại ô chọn hàm trên thanh công cụ, chọn hàm <b>khoiTaoBaTabEcoFarm</b> rồi bấm <b>Chạy (Run)</b> (cấp quyền truy cập nếu Google hỏi). Ngay lập tức file Google Sheets sẽ sinh ra đủ 3 Tab: <code>DuLieu_NhatKy</code>, <code>CaiDat_HeThong</code> và <code>data_sensor</code>.
                  </li>
                  <li>
                    <i>(Tự động vẽ biểu đồ):</i> Chọn tiếp hàm <b>taoBieuDoDataSensor</b> rồi bấm <b>Chạy (Run)</b>. Google Sheets sẽ tự động chèn biểu đồ đường Line Chart kép (TDS &amp; Độ ẩm) ngay trên tab <code>data_sensor</code>! Hoặc tải lại trang tính, bạn sẽ thấy menu mới <b>🌿 EcoFarm IoT</b> ngay trên đỉnh Google Sheets.
                  </li>
                  <li>
                    <i>(Mở Webhook tự động 24/7):</i> Bấm nút <b>Triển khai (Deploy)</b> ở góc trên bên phải -&gt; <b>Tùy chọn triển khai mới (New deployment)</b> -&gt; Loại: <b>Ứng dụng web (Web app)</b> -&gt; Ai có quyền truy cập: Chọn <b>Bất kỳ ai (Anyone)</b> -&gt; Bấm Triển khai và copy đường link kết thúc bằng <code>/exec</code> dán vào ô <b>"2. Đường Link Webhook"</b> ở trên.
                  </li>
                </ol>
              </div>

              {/* Code Viewer */}
              <div className="relative">
                <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-80 leading-relaxed selection:bg-emerald-900 selection:text-white">
                  {scriptCode || '// Đang nạp mã Apps Script...'}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 4: TELEMETRY LOGS PREVIEW */}
        {activeSubTab === 'log' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="text-xs text-slate-600">
                <span>Spreadsheet ID: </span>
                <span className="font-mono text-slate-900 font-bold">
                  {sheetsData?.spreadsheetId || 'Chưa liên kết'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadTelemetryCsv}
                  className="text-xs text-blue-800 bg-white hover:bg-blue-50 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 shadow-xs cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tải File CSV Nhật Ký</span>
                </button>

                {sheetsData?.spreadsheetId && sheetsData.spreadsheetId !== 'APPS_SCRIPT_WEBHOOK' && (
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${sheetsData.spreadsheetId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-semibold"
                  >
                    Mở Sheet Trực Tiếp <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {sheetsData?.records && sheetsData.records.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Thời Gian (Timestamp)</th>
                      <th className="py-2.5 px-3">Thiết Bị</th>
                      <th className="py-2.5 px-3">TDS (ppm)</th>
                      <th className="py-2.5 px-3">Độ Ẩm Đất</th>
                      <th className="py-2.5 px-3">Phao Đáy</th>
                      <th className="py-2.5 px-3">Phao Tràn</th>
                      <th className="py-2.5 px-3">Bơm 1 (Tuần Hoàn)</th>
                      <th className="py-2.5 px-3">Bơm 2 (Tưới Rau)</th>
                      <th className="py-2.5 px-3">Còi</th>
                      <th className="py-2.5 px-3">WiFi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {sheetsData.records.slice(-15).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 text-slate-700 font-sans whitespace-nowrap">
                          <span className="font-semibold text-slate-900">{new Date(r.timestamp).toLocaleTimeString('vi-VN')}</span>
                          <span className="text-[10px] text-slate-400 ml-1.5 font-mono">{new Date(r.timestamp).toLocaleDateString('vi-VN')}</span>
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{r.device_id || 'NODE_01'}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{r.tds ?? '--'}</td>
                        <td className="py-2 px-3 font-bold text-emerald-700">{r.soil_moisture ?? '--'}%</td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${r.float_low ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 font-bold'}`}>
                            {r.float_low ? 'ĐỦ NƯỚC' : 'CẠN NƯỚC'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${r.float_high ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-slate-100 text-slate-600'}`}>
                            {r.float_high ? 'TRÀN BỂ' : 'BÌNH THƯỜNG'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.pump1 ? 'bg-blue-100 text-blue-800' : 'text-slate-400'}`}>
                            {r.pump1 ? 'BẬT' : 'TẮT'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.pump2 ? 'bg-emerald-100 text-emerald-800' : 'text-slate-400'}`}>
                            {r.pump2 ? 'BẬT' : 'TẮT'}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${r.buzzer ? 'bg-rose-100 text-rose-800 font-bold' : 'text-slate-400'}`}>
                            {r.buzzer ? 'BẬT' : 'TẮT'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[11px] text-slate-500">
                          {r.wifi_rssi ? `${r.wifi_rssi} dBm` : '-60 dBm'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1">
                <p className="font-semibold text-slate-600">Bảng tính đang trống hoặc chưa có dữ liệu đo đạc.</p>
                <p>Hãy bấm nút <b>"Đẩy Điểm Đo Mới (Tab 1)"</b> hoặc cấu hình Webhook để tự động ghi nhật ký.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
