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

  const [activeSubTab, setActiveSubTab] = useState<'distribution' | 'settings_tab' | 'apps_script' | 'log'>('distribution');
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
                <span>Đẩy Điểm Đo Mới (Tab 1)</span>
              </button>

              <button
                onClick={() => handleTriggerSync('all')}
                disabled={isSyncing}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Zap className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>ĐỒNG BỘ TOÀN DIỆN (CẢ 2 TAB)</span>
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
            <span>1. Sơ Đồ Phân Bố Dữ Liệu Thông Minh</span>
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
            <span>2. Bảng Cài Đặt Hệ Thống (5 Nhóm Cấu Hình)</span>
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
            <span>3. Mã Apps Script &amp; Web App Webhook (Tự Động)</span>
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
            <span>4. Nhật Ký Cảm Biến Real-Time ({sheetsData?.records?.length ?? 0})</span>
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
                    Kiến Trúc Phân Bố Dữ Liệu Tối Ưu Truy Cập (Fast &amp; Accurate Schema)
                  </h3>
                  <p className="text-xs text-slate-300">
                    Tách bạch giữa Dữ liệu chuỗi thời gian (Telemetry) và Dữ liệu cấu hình (Metadata/Settings) trên cùng một bảng tính
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Tab 1 Spec */}
                <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-700/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
                      <Layers className="w-4 h-4" />
                      <span>Tab 1: DuLieu_NhatKy</span>
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded font-mono">
                      9 Cột • Append-Only
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Chuyên lưu trữ các lần đo đạc định kỳ theo hàng dọc (dòng mới nhất ở dưới cùng). Phục vụ vẽ biểu đồ, theo dõi xu hướng sinh thái TDS, độ ẩm và trạng thái máy bơm.
                  </p>
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
                    <p className="text-slate-400 text-[10px] uppercase font-bold">Danh sách 9 Cột chuẩn:</p>
                    <p className="text-emerald-300">
                      Thời Gian | TDS (ppm) | Độ Ẩm Đất (%) | Phao Đáy | Phao Tràn | Bơm 1 | Bơm 2 | Còi Buzzer | Trạng Thái
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
                      5 Cột • Tra Cứu Key-Value
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Lưu trữ bảng thông số cài đặt hệ thống chia theo 5 nhóm rõ ràng. Cho phép mở từ máy tính bất kỳ để xem cấu hình trạm mà không cần đăng nhập vào vi điều khiển.
                  </p>
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
                    <p className="text-slate-400 text-[10px] uppercase font-bold">Danh sách 5 Cột phân nhóm:</p>
                    <p className="text-amber-300">
                      MÃ THÔNG SỐ (KEY) | GIÁ TRỊ (VALUE) | ĐƠN VỊ &amp; Ý NGHĨA | NHÓM CẤU HÌNH | THỜI GIAN CẬP NHẬT
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
                <div className="w-7 h-7 bg-blue-100 text-blue-800 rounded-lg flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h4 className="text-xs font-bold text-slate-900">Tạo 2 Tab Chuẩn</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bấm nút <b>"Tải CSV Cài Đặt"</b> để nhập vào Sheet, hoặc sao chép mã Apps Script ở Tab 3 để tạo tự động chỉ sau 1 lần bấm.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="w-7 h-7 bg-purple-100 text-purple-800 rounded-lg flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h4 className="text-xs font-bold text-slate-900">Đồng Bộ 2 Chiều</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Dán link Web App vào ô Webhook để hệ thống tự động ghi nhật ký và lưu cấu hình định kỳ mỗi 60 giây.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SUB-TAB 2: SETTINGS TABLE ORGANIZED IN 5 SMART GROUPS */}
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

        {/* SUB-TAB 3: APPS SCRIPT CODE & AUTOMATION WIZARD */}
        {activeSubTab === 'apps_script' && (
          <div className="p-5 space-y-4">
            <div className="p-5 bg-slate-900 text-slate-200 rounded-2xl space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>Mã Apps Script Tự Động Khởi Tạo 2 Tab &amp; Nhận Webhook</span>
                  </h4>
                  <p className="text-xs text-slate-300">
                    Chạy đoạn mã này trong Google Sheets để tự động phân nhóm cột, định dạng màu sắc và mở cổng Webhook nhận dữ liệu từ xa
                  </p>
                </div>

                <button
                  onClick={handleCopyScript}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  {copiedScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedScript ? 'ĐÃ SAO CHÉP MÃ!' : 'SAO CHÉP MÃ APPS SCRIPT'}</span>
                </button>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2">
                <p className="font-bold text-white flex items-center gap-1.5">
                  <span>📌 3 Bước Triển Khai Trong Vòng 60 Giây:</span>
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                  <li>
                    Trên file Google Sheets trống của bạn, bấm menu <b>Tiện ích mở rộng (Extensions)</b> -&gt; chọn <b>Apps Script</b>.
                  </li>
                  <li>
                    Xóa hết mã trắng có sẵn, dán toàn bộ đoạn mã bên dưới vào rồi bấm biểu tượng <b>Lưu (Save)</b>.
                  </li>
                  <li>
                    Tại ô chọn hàm trên thanh công cụ, chọn hàm <b>khoiTaoHaiTabEcoFarm</b> rồi bấm <b>Chạy (Run)</b>. Ngay lập tức file Google Sheets sẽ sinh ra 2 Tab với đầy đủ màu sắc và thông số!
                  </li>
                  <li>
                    <i>(Tùy chọn Webhook 2 chiều):</i> Bấm nút <b>Triển khai (Deploy)</b> ở góc trên bên phải -&gt; <b>Tùy chọn triển khai mới (New deployment)</b> -&gt; Loại: <b>Ứng dụng web (Web app)</b> -&gt; Ai có quyền truy cập: Chọn <b>Bất kỳ ai (Anyone)</b> -&gt; Bấm Triển khai và copy đường link dán vào ô <b>"2. Đường Link Webhook"</b> ở trên.
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
                      <th className="py-2.5 px-3">Thời gian</th>
                      <th className="py-2.5 px-3">TDS (ppm)</th>
                      <th className="py-2.5 px-3">Độ ẩm đất</th>
                      <th className="py-2.5 px-3">Phao đáy (LOW)</th>
                      <th className="py-2.5 px-3">Phao tràn (HIGH)</th>
                      <th className="py-2.5 px-3">Bơm 1 (Tuần Hoàn)</th>
                      <th className="py-2.5 px-3">Bơm 2 (Tưới Rau)</th>
                      <th className="py-2.5 px-3">Còi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {sheetsData.records.slice(-15).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 text-slate-500 font-sans">
                          {new Date(r.timestamp).toLocaleTimeString('vi-VN')}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">{r.tds ?? '--'}</td>
                        <td className="py-2 px-3 font-bold text-emerald-700">{r.soil_moisture ?? '--'}%</td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${r.float_low ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800 font-bold'}`}>
                            {r.float_low ? 'ĐẦY NƯỚC' : 'CẠN NƯỚC'}
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
