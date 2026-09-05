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
} from 'lucide-react';
import type { GoogleSheetsData, SystemSettings } from '../types.ts';

interface GoogleSheetsViewProps {
  sheetsData: GoogleSheetsData | null;
  onConnect: (url: string) => Promise<void>;
  isLoading: boolean;
}

export const GoogleSheetsView: React.FC<GoogleSheetsViewProps> = ({
  sheetsData,
  onConnect,
  isLoading,
}) => {
  const [urlInput, setUrlInput] = useState(
    sheetsData?.url || 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0'
  );

  const [activeSubTab, setActiveSubTab] = useState<'log' | 'settings_tab' | 'apps_script'>('settings_tab');
  const [copiedScript, setCopiedScript] = useState(false);
  const [scriptCode, setScriptCode] = useState<string>('');
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);

  // Sync urlInput when sheetsData updates
  useEffect(() => {
    if (sheetsData?.url) {
      setUrlInput(sheetsData.url);
    }
  }, [sheetsData?.url]);

  // Fetch current system settings and Apps Script code on mount
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;
    onConnect(urlInput.trim());
  };

  const handleUseDemoUrl = () => {
    const demoUrl = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0';
    setUrlInput(demoUrl);
    onConnect(demoUrl);
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

  return (
    <div className="space-y-6 pb-20 sm:pb-6 max-w-5xl mx-auto">
      {/* Title Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700 border border-emerald-100">
            <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Đồng Bộ Google Sheets (Mô Hình 2 Tab)</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                Nhật Ký & Cài Đặt
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Lưu trữ đồng thời dữ liệu cảm biến đo đạc và toàn bộ bảng thông số cài đặt hệ thống trên cùng một file Sheet
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadSettingsCsv}
            className="text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 font-semibold flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 shadow-sm cursor-pointer transition-colors"
            title="Tải tệp CSV cấu hình để nạp vào Google Sheet"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>Tải CSV Cài Đặt</span>
          </button>

          <button
            onClick={handleUseDemoUrl}
            className="text-xs text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1 bg-white hover:bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 shadow-sm cursor-pointer transition-colors"
          >
            <span>Dùng Sheet mẫu</span>
          </button>
        </div>
      </div>

      {/* Connection Form: Exact Specification Layout */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-emerald-600" />
            <span>Liên Kết Google Sheets / Web App URL</span>
          </h3>
          <p className="text-xs text-slate-500">
            Dán đường link Google Sheets trống của bạn (ví dụ: <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">https://docs.google.com/spreadsheets/d/.../edit</code>) hoặc link Google Apps Script Web App.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="Dán link Google Sheets của bạn vào đây..."
                className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>KẾT NỐI NGAY</span>
            </button>
          </div>
        </form>

        {/* Success message / Empty sheet notification */}
        {sheetsData?.message && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-950">{sheetsData.message}</p>
              {sheetsData.isNewOrEmpty && (
                <p className="text-[11px] text-emerald-700 mt-1">
                  💡 Bảng tính của bạn đã kết nối thành công. Hãy bấm vào nút <b>"Tải CSV Cài Đặt"</b> hoặc xem tab <b>"Mã Apps Script (Tự Động)"</b> bên dưới để tạo 2 Tab chuẩn nhé!
                </p>
              )}
            </div>
          </div>
        )}

        {/* Error notification with specific guidance */}
        {sheetsData?.error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-950">Lỗi kết nối Google Sheets</p>
              <p className="text-rose-700">{sheetsData.error}</p>
              <div className="mt-2 text-[11px] text-rose-900 bg-rose-100/60 p-2.5 rounded-lg border border-rose-200/80 leading-relaxed">
                <b>Cách xử lý quyền truy cập:</b> Mở trang Google Sheet của bạn trên trình duyệt -&gt; Bấm nút <b>Chia sẻ (Share)</b> ở góc trên bên phải -&gt; Tại mục <i>Quyền truy cập chung</i>, đổi thành <b>"Bất kỳ ai có đường liên kết"</b> (Anyone with the link) -&gt; Phân quyền <b>Người xem (Viewer)</b> hoặc <b>Người chỉnh sửa (Editor)</b> -&gt; Bấm Xong và thử lại.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Connection Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Connected Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
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
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Trạng Thái</p>
            <p className="text-sm font-bold text-slate-900">
              {sheetsData?.connected ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <span>Đã Kết Nối</span>
                </span>
              ) : (
                <span className="text-slate-500">Chưa Kết Nối</span>
              )}
            </p>
          </div>
        </div>

        {/* Rows Count Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 border border-slate-200">
            <Database className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Dữ Liệu Đã Đọc</p>
            <p className="text-sm font-bold text-slate-900 font-mono">
              {sheetsData?.rowsCount ?? 0} dòng
            </p>
          </div>
        </div>

        {/* Last Update Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700 border border-slate-200">
            <Clock className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cập Nhật Gần Nhất</p>
            <p className="text-sm font-bold text-slate-900">
              {sheetsData?.lastUpdate
                ? new Date(sheetsData.lastUpdate).toLocaleTimeString('vi-VN')
                : 'Chưa cập nhật'}
            </p>
          </div>
        </div>
      </div>

      {/* Architecture Explanation Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-md space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Cấu Trúc 2 Tab Trong 1 File Google Sheet Của Bạn</span>
            </h3>
            <p className="text-xs text-slate-300">
              Cả máy tính ở nhà, điện thoại ngoài vườn hay bất kỳ thiết bị nào khác đều dùng chung bảng tính này
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-700/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
                <Layers className="w-4 h-4" />
                <span>Tab 1: DuLieu_NhatKy</span>
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">
                Ghi Dữ Liệu
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Lưu trữ từng dòng đo đạc gửi từ ESP32 theo chu kỳ: Thời gian, TDS (ppm), Độ ẩm đất (%), Trạng thái phao cạn/tràn, Bơm 1 và Bơm 2.
            </p>
          </div>

          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-700/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 font-mono">
                <Sliders className="w-4 h-4" />
                <span>Tab 2: CaiDat_HeThong</span>
              </span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono">
                Lưu Cài Đặt
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Lưu bảng tra cứu gồm 3 cột: <b>Mã Thông Số – Giá Trị – Ý Nghĩa</b> (TDS_MIN, TDS_MAX, Độ ẩm đất min/max, Thời gian tưới, Device Key...).
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Selector for Previewing and Setup */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-4 pt-3 bg-slate-50/50 flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('settings_tab')}
            className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeSubTab === 'settings_tab'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>Tab 2: Bảng Cài Đặt Hệ Thống (Xem & Tải CSV)</span>
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
            <span>Mã Apps Script (Tự Động Khởi Tạo 2 Tab)</span>
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
            <span>Tab 1: Nhật Ký Cảm Biến ({sheetsData?.records?.length ?? 0})</span>
          </button>
        </div>

        {/* Content Tab 2: Settings Table */}
        {activeSubTab === 'settings_tab' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/80">
              <div>
                <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Nội Dung Sẽ Lưu Vào Tab "CaiDat_HeThong"
                </h4>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Bạn có thể tải file CSV này về rồi vào Google Sheet chọn <b>Tệp -&gt; Nhập -&gt; Tải lên</b> để tạo Tab chỉ mất 5 giây!
                </p>
              </div>

              <button
                onClick={handleDownloadSettingsCsv}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 shrink-0 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Tải File .CSV Này Về Máy</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 font-mono">Cột A: Tên Thông Số (Key)</th>
                    <th className="py-2.5 px-4 font-mono">Cột B: Giá Trị (Value)</th>
                    <th className="py-2.5 px-4">Cột C: Đơn Vị &amp; Ý Nghĩa Hoạt Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">TDS_MIN</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-700">{systemSettings?.tdsMin ?? 200}</td>
                    <td className="py-2.5 px-4 text-slate-600">ppm - Dưới ngưỡng này kích hoạt bổ sung vi lượng dinh dưỡng</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">TDS_MAX</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-700">{systemSettings?.tdsMax ?? 750}</td>
                    <td className="py-2.5 px-4 text-slate-600">ppm - Ngưỡng an toàn tối đa cho cá và ốc</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">DO_AM_DAT_MIN</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-700">{systemSettings?.soilMoistureMin ?? 50}</td>
                    <td className="py-2.5 px-4 text-slate-600">% - Dưới ngưỡng này tự động bật Bơm 2 tưới rau</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">DO_AM_DAT_MAX</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-700">{systemSettings?.soilMoistureMax ?? 80}</td>
                    <td className="py-2.5 px-4 text-slate-600">% - Đạt ngưỡng này tự động ngắt Bơm 2</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">THOI_GIAN_BOM_1_MAX</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-700">{systemSettings?.pump1MaxContinuousMinutes ?? 45}</td>
                    <td className="py-2.5 px-4 text-slate-600">phút - Thời gian Bơm 1 tuần hoàn chạy liên tục tối đa</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">THOI_GIAN_TUOI_RAU</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-700">{systemSettings?.pump2IrrigationDurationSeconds ?? 45}</td>
                    <td className="py-2.5 px-4 text-slate-600">giây - Thời gian mỗi đợt tưới rau</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">KHOANG_NGHI_TUOI</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-700">{systemSettings?.pump2RestIntervalMinutes ?? 30}</td>
                    <td className="py-2.5 px-4 text-slate-600">phút - Khoảng nghỉ giữa các đợt tưới rau</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">TU_DONG_NGAT_KHI_CAN</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-emerald-700">
                      {systemSettings?.floatLowSafetyCutoff ? 'BAT' : 'TAT'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">Tự động ngắt Bơm 1 ngay khi phao đáy báo cạn nước để chống cháy bơm</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">DEVICE_ID</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{systemSettings?.deviceId || 'ESP32S3_ECO_01'}</td>
                    <td className="py-2.5 px-4 text-slate-600">Mã định danh phần cứng trạm điều khiển</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Content Tab Apps Script */}
        {activeSubTab === 'apps_script' && (
          <div className="p-5 space-y-4">
            <div className="p-4 bg-slate-900 text-slate-200 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>Mã Tự Động Khởi Tạo 2 Tab Trên Google Sheet</span>
                  </h4>
                  <p className="text-xs text-slate-300">
                    Dán mã này vào Google Sheets để tự động sinh cả 2 Tab (định dạng màu sắc, cột và công thức)
                  </p>
                </div>

                <button
                  onClick={handleCopyScript}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copiedScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedScript ? 'Đã Sao Chép Code!' : 'Sao Chép Mã Apps Script'}</span>
                </button>
              </div>

              {/* Instructions steps */}
              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-1.5">
                <p className="font-bold text-white">📌 3 Bước Thực Hiện Cực Kỳ Đơn Giản:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                  <li>Trên trang Google Sheets của bạn, bấm vào menu <b>Tiện ích mở rộng</b> (Extensions) -&gt; chọn <b>Apps Script</b>.</li>
                  <li>Xóa đoạn mã mặc định có sẵn, dán toàn bộ đoạn mã bên dưới vào rồi bấm biểu tượng <b>Lưu (Save)</b>.</li>
                  <li>Tại ô chọn hàm, chọn <b>khoiTaoHaiTabEcoFarm</b> rồi bấm nút <b>Chạy (Run)</b>. Google Sheets sẽ tự tạo xong 2 Tab ngay lập tức!</li>
                </ol>
              </div>

              {/* Script code block */}
              <div className="relative">
                <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-72 leading-relaxed">
                  {scriptCode || '// Đang nạp mã Apps Script...'}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Content Tab 1: Telemetry Data Table */}
        {activeSubTab === 'log' && (
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-xs text-slate-600">
                <span>Spreadsheet ID: </span>
                <span className="font-mono text-slate-900 font-bold">
                  {sheetsData?.spreadsheetId || 'Chưa có ID'}
                </span>
              </div>

              {sheetsData?.spreadsheetId && sheetsData.spreadsheetId !== 'APPS_SCRIPT_WEBHOOK' && (
                <a
                  href={`https://docs.google.com/spreadsheets/d/${sheetsData.spreadsheetId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-semibold"
                >
                  Mở trực tiếp trên Google Sheets <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
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
                      <th className="py-2.5 px-3">Bơm 1</th>
                      <th className="py-2.5 px-3">Bơm 2</th>
                      <th className="py-2.5 px-3">Còi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {sheetsData.records.slice(-10).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-500 font-sans">
                          {new Date(r.timestamp).toLocaleTimeString('vi-VN')}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900">{r.tds ?? '--'}</td>
                        <td className="py-2 px-3 font-bold text-emerald-700">{r.soil_moisture ?? '--'}%</td>
                        <td className="py-2 px-3">{r.float_low ? 'BÌNH THƯỜNG' : 'CẠN NƯỚC'}</td>
                        <td className="py-2 px-3">{r.float_high ? 'TRÀN' : 'BÌNH THƯỜNG'}</td>
                        <td className="py-2 px-3">{r.pump1 ? 'BẬT' : 'TẮT'}</td>
                        <td className="py-2 px-3">{r.pump2 ? 'BẬT' : 'TẮT'}</td>
                        <td className="py-2 px-3">{r.buzzer ? 'BẬT' : 'TẮT'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Chưa có dòng dữ liệu nào từ bảng tính hoặc bảng tính mới tạo. Khi ESP32 chạy, dữ liệu sẽ ghi tự động vào đây.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
