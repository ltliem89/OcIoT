import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Cpu,
  Sliders,
  Bell,
  Camera,
  Save,
  CheckCircle2,
  Send,
  Droplets,
  Sprout,
  Waves,
  Timer,
  Volume2,
  Radio,
  FileSpreadsheet,
  AlertTriangle,
  RotateCw,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import type { SystemSettings } from '../types.ts';
import { syncESPThresholds } from '../lib/api.ts';

interface SettingsViewProps {
  settings: SystemSettings;
  onSaveSettings: (settings: Partial<SystemSettings>) => Promise<void>;
  isLoading: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  isLoading,
}) => {
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSyncingESP, setIsSyncingESP] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const handleSyncToESP = async () => {
    try {
      setIsSyncingESP(true);
      setSyncStatusMsg(null);
      // Save settings to server first
      await onSaveSettings(formData);
      // Push sync command directly to ESP
      const res = await syncESPThresholds(formData);
      setSyncStatusMsg(res.message || 'Đã đồng bộ thành công ngưỡng xuống ESP32-S3');
      setSavedSuccess(true);
      setTimeout(() => {
        setSyncStatusMsg(null);
        setSavedSuccess(false);
      }, 4000);
    } catch (err: any) {
      setSyncStatusMsg(`Lỗi đồng bộ: ${err.message}`);
    } finally {
      setIsSyncingESP(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 sm:pb-6 max-w-5xl mx-auto">
      {/* Top Banner & Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-900 flex items-center justify-center text-white shadow-md shadow-slate-200">
            <Sliders className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-xl font-bold text-slate-900">
                Cài Đặt Chức Năng & Ngưỡng ESP
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wide">
                OC IoT Firmware v2.4
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tùy biến các ngưỡng TDS, độ ẩm đất, mực nước phao, định thời rơ-le và chu kỳ truyền nhận ESP32-S3
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleSyncToESP}
            disabled={isSyncingESP || isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Đồng bộ ngay lập tức các ngưỡng xuống vi điều khiển ESP32-S3"
          >
            <Send className={`w-3.5 h-3.5 ${isSyncingESP ? 'animate-bounce' : ''}`} />
            <span>{isSyncingESP ? 'Đang gửi xuống ESP...' : 'Đồng Bộ Xuống ESP32'}</span>
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu Cấu Hình</span>
          </button>
        </div>
      </div>

      {/* Success Notification Bar */}
      {(savedSuccess || syncStatusMsg) && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncStatusMsg || 'Cấu hình và ngưỡng chức năng đã được cập nhật thành công!'}</span>
          </div>
          <span className="text-[10px] text-emerald-700 bg-white/70 px-2 py-0.5 rounded font-mono">
            SYNCED OK
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* =========================================================
            SECTION 1: TDS WATER QUALITY THRESHOLDS (OCEAN BLUE THEME)
            ========================================================= */}
        <div className="bg-white border-2 border-cyan-100 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500 text-white flex items-center justify-center shadow-sm shadow-cyan-200">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Ngưỡng Cảm Biến TDS & Chất Lượng Nước
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                    NƯỚC BỂ
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  ESP32-S3 sử dụng các ngưỡng này để phân loại chất lượng nước và kích hoạt cảnh báo
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-cyan-700 bg-cyan-50 px-2.5 py-1 rounded-lg border border-cyan-200">
              Đơn vị: ppm
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
            {/* TDS Min */}
            <div className="p-3.5 rounded-xl bg-cyan-50/50 border border-cyan-200 space-y-1.5">
              <label className="font-semibold text-cyan-900 block">
                Ngưỡng Tối Thiểu (Min)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={formData.tdsMin}
                  onChange={(e) => setFormData({ ...formData, tdsMin: Number(e.target.value) })}
                  className="w-full bg-white border border-cyan-300 rounded-lg px-2.5 py-2 font-mono font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <span className="text-slate-400 font-mono text-[11px]">ppm</span>
              </div>
              <span className="text-[10px] text-cyan-700 block">
                Dưới mức này: Cảnh báo nước quá nhạt/thiếu khoáng.
              </span>
            </div>

            {/* TDS Max */}
            <div className="p-3.5 rounded-xl bg-cyan-50/50 border border-cyan-200 space-y-1.5">
              <label className="font-semibold text-cyan-900 block">
                Ngưỡng Tối Ưu Tối Đa (Max)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={formData.tdsMax}
                  onChange={(e) => setFormData({ ...formData, tdsMax: Number(e.target.value) })}
                  className="w-full bg-white border border-cyan-300 rounded-lg px-2.5 py-2 font-mono font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <span className="text-slate-400 font-mono text-[11px]">ppm</span>
              </div>
              <span className="text-[10px] text-cyan-700 block">
                Chuẩn tối ưu: 200 - 800 ppm cho bèo & ốc bươu.
              </span>
            </div>

            {/* TDS Critical */}
            <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200 space-y-1.5">
              <label className="font-semibold text-rose-900 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Ngưỡng Nguy Cấp (Critical)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={formData.tdsCritical ?? 1200}
                  onChange={(e) =>
                    setFormData({ ...formData, tdsCritical: Number(e.target.value) })
                  }
                  className="w-full bg-white border border-rose-300 rounded-lg px-2.5 py-2 font-mono font-bold text-rose-900 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <span className="text-rose-400 font-mono text-[11px]">ppm</span>
              </div>
              <span className="text-[10px] text-rose-700 block">
                Vượt ngưỡng: Kích hoạt còi hú & báo động khẩn.
              </span>
            </div>

            {/* TDS Calibration Offset */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <label className="font-semibold text-slate-800 block">
                Bù Sai Số Hiệu Chuẩn (Offset)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={formData.tdsCalibrationOffset ?? 0}
                  onChange={(e) =>
                    setFormData({ ...formData, tdsCalibrationOffset: Number(e.target.value) })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 font-mono font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                <span className="text-slate-400 font-mono text-[11px]">±ppm</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                Giá trị cộng/trừ trực tiếp vào cảm biến TDS ESP32.
              </span>
            </div>
          </div>

          {/* Visual Range bar */}
          <div className="pt-2 px-1">
            <div className="flex items-center justify-between text-[10px] font-mono font-semibold text-slate-500 mb-1">
              <span>0 ppm</span>
              <span className="text-cyan-600 font-bold">{formData.tdsMin} (Min)</span>
              <span className="text-emerald-600 font-bold">{formData.tdsMax} (Max)</span>
              <span className="text-rose-600 font-bold">{formData.tdsCritical ?? 1200} (Báo Động)</span>
              <span>1500+ ppm</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden flex">
              <div className="bg-cyan-400 w-[15%]" title="Thấp" />
              <div className="bg-emerald-500 w-[45%]" title="Tối ưu lý tưởng" />
              <div className="bg-amber-400 w-[25%]" title="Cần chú ý" />
              <div className="bg-rose-500 w-[15%]" title="Nguy hiểm" />
            </div>
          </div>
        </div>

        {/* =========================================================
            SECTION 2: SOIL MOISTURE THRESHOLDS (EMERALD NATURE THEME)
            ========================================================= */}
        <div className="bg-white border-2 border-emerald-100 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-green-600" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-200">
                <Sprout className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Ngưỡng Độ Ẩm Đất Sinh Thái & Tưới Tự Động
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    THẢM THỰC VẬT
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  ESP32 kích hoạt Bơm 2 (tưới phun sương) khi độ ẩm đất xuống dưới ngưỡng tối thiểu
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              Đơn vị: %
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
            {/* Soil Min */}
            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1.5">
              <label className="font-semibold text-emerald-900 block">
                Ngưỡng Bắt Đầu Tưới (Min)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.soilMoistureMin}
                  onChange={(e) =>
                    setFormData({ ...formData, soilMoistureMin: Number(e.target.value) })
                  }
                  className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-2 font-mono font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-slate-400 font-mono text-[11px]">%</span>
              </div>
              <span className="text-[10px] text-emerald-700 block">
                Dưới mức này: Bật Bơm 2 tưới phun sương.
              </span>
            </div>

            {/* Soil Max */}
            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1.5">
              <label className="font-semibold text-emerald-900 block">
                Ngưỡng Đủ Ẩm Ngắt Tưới (Max)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.soilMoistureMax}
                  onChange={(e) =>
                    setFormData({ ...formData, soilMoistureMax: Number(e.target.value) })
                  }
                  className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-2 font-mono font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-slate-400 font-mono text-[11px]">%</span>
              </div>
              <span className="text-[10px] text-emerald-700 block">
                Đạt mức này: Tự động ngắt Bơm 2 tiết kiệm nước.
              </span>
            </div>

            {/* Soil Critical */}
            <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-1.5">
              <label className="font-semibold text-amber-900 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Ngưỡng Khô Hạn Khẩn (Critical)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.soilMoistureCritical ?? 25}
                  onChange={(e) =>
                    setFormData({ ...formData, soilMoistureCritical: Number(e.target.value) })
                  }
                  className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-2 font-mono font-bold text-amber-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-amber-500 font-mono text-[11px]">%</span>
              </div>
              <span className="text-[10px] text-amber-700 block">
                Dưới mức này: Báo động nguy cơ khô cháy thực bì.
              </span>
            </div>

            {/* Soil Offset */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <label className="font-semibold text-slate-800 block">
                Bù Sai Số Độ Ẩm (Offset)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={formData.soilMoistureCalibrationOffset ?? 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      soilMoistureCalibrationOffset: Number(e.target.value),
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 font-mono font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                <span className="text-slate-400 font-mono text-[11px]">±%</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                Hiệu chỉnh sai số điện dung của que đo đất.
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================
            SECTION 3: WATER FLOATS & SAFETY RULES (SKY / INDIGO THEME)
            ========================================================= */}
        <div className="bg-white border-2 border-indigo-100 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-200">
                <Waves className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Cảm Biến Phao Nước & Bảo Vệ An Toàn
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    PHAO LOW / HIGH
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Lọc nhiễu chống rung sóng và quy tắc ngắt bơm bảo vệ máy móc phần cứng
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Float Debounce */}
            <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-200 space-y-1.5">
              <label className="font-semibold text-indigo-950 block">
                Thời Gian Lọc Nhiễu Sóng Nước (Debounce)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={formData.waterFloatDebounceSeconds ?? 3}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      waterFloatDebounceSeconds: Number(e.target.value),
                    })
                  }
                  className="w-full bg-white border border-indigo-300 rounded-lg px-2.5 py-2 font-mono font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-slate-400 font-mono text-[11px]">Giây</span>
              </div>
              <span className="text-[10px] text-indigo-700 block">
                Chống tình trạng nước sóng sánh làm rơ-le bật/tắt liên tục.
              </span>
            </div>

            {/* Toggle 1: Float Low Cutoff */}
            <label className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.autoRules.lowWaterCutPump1}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    autoRules: { ...formData.autoRules, lowWaterCutPump1: e.target.checked },
                  })
                }
                className="mt-1 rounded text-indigo-600 focus:ring-0 w-4 h-4"
              />
              <div>
                <span className="font-bold text-slate-900 block">Ngắt Bơm 1 khi hụt phao LOW</span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Bảo vệ chống cháy máy bơm tuần hoàn khi bể nước bị hụt dưới mức an toàn.
                </span>
              </div>
            </label>

            {/* Toggle 2: Float High Alert */}
            <label className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors flex items-start gap-3">
              <input
                type="checkbox"
                checked={formData.floatHighAlert ?? true}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    floatHighAlert: e.target.checked,
                  })
                }
                className="mt-1 rounded text-indigo-600 focus:ring-0 w-4 h-4"
              />
              <div>
                <span className="font-bold text-slate-900 block">Cảnh báo chạm phao HIGH</span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Cảnh báo nguy cơ tràn bể sinh thái khi trời mưa lớn hoặc cấp nước quá đà.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* =========================================================
            SECTION 4: ACTUATOR TIMERS & RELAY RULES (AMBER / ORANGE)
            ========================================================= */}
        <div className="bg-white border-2 border-amber-100 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm shadow-amber-200">
                <Timer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Cấu Hình Định Thời Bơm 1, Bơm 2 & Còi Buzzer
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    RƠ-LE ESP32
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Thời lượng hoạt động tối đa và chu kỳ an toàn cho từng tải điện tử
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
            {/* Pump 1 max runtime */}
            <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 space-y-1.5">
              <label className="font-semibold text-amber-950 block">
                Bơm 1: Chạy Liên Tục Tối Đa
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={formData.pump1MaxContinuousMinutes ?? 30}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pump1MaxContinuousMinutes: Number(e.target.value),
                    })
                  }
                  className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-2 font-mono font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-slate-400 font-mono text-[11px]">Phút</span>
              </div>
              <span className="text-[10px] text-amber-700 block">
                Tự ngắt nghỉ chống quá nhiệt động cơ bơm tuần hoàn.
              </span>
            </div>

            {/* Pump 2 duration */}
            <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 space-y-1.5">
              <label className="font-semibold text-amber-950 block">
                Bơm 2: Thời Gian Tưới Mỗi Lần
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="10"
                  max="600"
                  value={formData.pump2IrrigationDurationSeconds ?? 45}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pump2IrrigationDurationSeconds: Number(e.target.value),
                    })
                  }
                  className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-2 font-mono font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-slate-400 font-mono text-[11px]">Giây</span>
              </div>
              <span className="text-[10px] text-amber-700 block">
                Mỗi chu kỳ tưới phun sương duy trì thảm vi sinh.
              </span>
            </div>

            {/* Buzzer duration */}
            <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200 space-y-1.5">
              <label className="font-semibold text-rose-950 flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-rose-600" />
                Còi Buzzer: Thời Lượng Báo Động
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="3"
                  max="60"
                  value={formData.buzzerAlertDurationSeconds ?? 10}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      buzzerAlertDurationSeconds: Number(e.target.value),
                    })
                  }
                  className="w-full bg-white border border-rose-300 rounded-lg px-2.5 py-2 font-mono font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <span className="text-slate-400 font-mono text-[11px]">Giây</span>
              </div>
              <span className="text-[10px] text-rose-700 block">
                Tự động ngắt còi sau số giây này tránh ô nhiễm âm thanh.
              </span>
            </div>

            {/* Buzzer Mode */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <label className="font-semibold text-slate-800 block">Kiểu Âm Thanh Còi</label>
              <select
                value={formData.buzzerMode ?? 'BEEP_INTERVAL'}
                onChange={(e) =>
                  setFormData({ ...formData, buzzerMode: e.target.value as any })
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 font-semibold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-500 cursor-pointer"
              >
                <option value="BEEP_INTERVAL">Bíp ngắt quãng 1s (Khuyên dùng)</option>
                <option value="CONTINUOUS">Hú còi liên tục</option>
                <option value="CRITICAL_ONLY">Chỉ kêu khi khẩn cấp</option>
              </select>
              <span className="text-[10px] text-slate-500 block">
                Tần điệu còi trên bo mạch ESP32-S3.
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================
            SECTION 5: TELEMETRY, CLOUD & HARDWARE (PURPLE THEME)
            ========================================================= */}
        <div className="bg-white border-2 border-purple-100 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm shadow-purple-200">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Chu Kỳ Truyền Dữ Liệu ESP & Đồng Bộ Đám Mây
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    TELEMETRY
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Tần suất gửi gói tin cảm biến, ghi Google Sheets và định danh phần cứng
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
            {/* Device ID */}
            <div className="p-3.5 rounded-xl bg-purple-50/40 border border-purple-200 space-y-1.5">
              <label className="font-semibold text-purple-950 block">Mã Thiết Bị (Device ID)</label>
              <input
                type="text"
                value={formData.deviceId}
                onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                className="w-full bg-white border border-purple-300 rounded-lg px-2.5 py-2 font-mono font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <span className="text-[10px] text-purple-700 block">ID xác thực của module ESP32-S3.</span>
            </div>

            {/* ESP Report Interval */}
            <div className="p-3.5 rounded-xl bg-purple-50/40 border border-purple-200 space-y-1.5">
              <label className="font-semibold text-purple-950 block">
                Chu Kỳ Gửi Tin ESP32
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={formData.espReportIntervalSeconds ?? 5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      espReportIntervalSeconds: Number(e.target.value),
                    })
                  }
                  className="w-full bg-white border border-purple-300 rounded-lg px-2.5 py-2 font-mono font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-slate-400 font-mono text-[11px]">Giây</span>
              </div>
              <span className="text-[10px] text-purple-700 block">
                Tần suất gói tin telemetry gửi lên Web.
              </span>
            </div>

            {/* Google Sheets Sync Interval */}
            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1.5">
              <label className="font-semibold text-emerald-950 flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                Ghi Tự Động Google Sheets
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="10"
                  max="600"
                  value={formData.espSheetsSyncIntervalSeconds ?? 60}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      espSheetsSyncIntervalSeconds: Number(e.target.value),
                    })
                  }
                  className="w-full bg-white border border-emerald-300 rounded-lg px-2.5 py-2 font-mono font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-slate-400 font-mono text-[11px]">Giây</span>
              </div>
              <span className="text-[10px] text-emerald-700 block">
                Chu kỳ lưu một dòng lịch sử vào trang tính.
              </span>
            </div>

            {/* Offline Timeout */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <label className="font-semibold text-slate-800 block">Thời Gian Chờ Mất Kết Nối</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={formData.offlineTimeoutSeconds}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      offlineTimeoutSeconds: Number(e.target.value),
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 font-mono font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                <span className="text-slate-400 font-mono text-[11px]">Giây</span>
              </div>
              <span className="text-[10px] text-slate-500 block">
                Báo OFFLINE nếu quá thời gian không có tin.
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================
            SECTION 6: CAMERA AI VISION & ECOSYSTEM RULES
            ========================================================= */}
        <div className="bg-white border-2 border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Camera className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Cấu Hình Camera AI Vision PC
              </h3>
              <p className="text-xs text-slate-500">
                Luồng camera giám sát độ che phủ bèo và đếm cụm trứng ốc bươu đen
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1.5">
                URL Luồng Video Camera (HTTP Stream / RTSP / MJPEG)
              </label>
              <input
                type="text"
                placeholder="http://192.168.1.100:8080/video"
                value={formData.cameraStreamUrl}
                onChange={(e) => setFormData({ ...formData, cameraStreamUrl: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-indigo-500 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1.5">
                Độ Nhạy Nhận Diện AI (Gemini Vision)
              </label>
              <select
                value={formData.aiSensitivity}
                onChange={(e) =>
                  setFormData({ ...formData, aiSensitivity: e.target.value as any })
                }
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-indigo-500 shadow-sm cursor-pointer"
              >
                <option value="low">Thấp (Chỉ báo biến động lớn)</option>
                <option value="medium">Trung bình (Chuẩn xác & Tối ưu)</option>
                <option value="high">Cao (Cảnh báo nhạy mọi thay đổi)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bottom Save & Sync Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-900 text-white rounded-2xl shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold">Lưu & Đồng Bộ Ngưỡng Xuống ESP32-S3</p>
              <p className="text-[11px] text-slate-400">
                Hệ thống sẽ cập nhật máy chủ và gửi tức thì gói cấu hình xuống vi điều khiển
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSyncToESP}
              disabled={isSyncingESP || isLoading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{isSyncingESP ? 'Đang gửi...' : 'ĐỒNG BỘ NGƯỠNG XUỐNG ESP'}</span>
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4 text-slate-900" />
              <span>LƯU CẤU HÌNH</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
