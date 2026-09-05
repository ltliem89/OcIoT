import React from 'react';
import {
  Droplets,
  Sprout,
  Waves,
  Zap,
  Volume2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Eye,
  Sliders,
  ChevronRight,
  Egg,
} from 'lucide-react';
import type {
  SensorData,
  IoTStatus,
  AIVisionResult,
  EcosystemAnalysis,
} from '../types.ts';

interface DashboardViewProps {
  status: IoTStatus | null;
  sensorData: SensorData | null;
  visionResult: AIVisionResult | null;
  analysis: EcosystemAnalysis | null;
  isAnalyzing: boolean;
  onTriggerAnalysis: () => void;
  onTogglePump1: () => void;
  onTogglePump2: () => void;
  onToggleBuzzer: () => void;
  onSelectTab: (tab: any) => void;
  isDemoMode: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  status,
  sensorData,
  visionResult,
  analysis,
  isAnalyzing,
  onTriggerAnalysis,
  onTogglePump1,
  onTogglePump2,
  onToggleBuzzer,
  onSelectTab,
  isDemoMode,
}) => {
  const isOnline = isDemoMode ? true : (status?.online ?? false);
  const tds = sensorData?.tds ?? 420;
  const soilMoisture = sensorData?.soil_moisture ?? 65;
  const floatLow = sensorData?.float_low ?? true;
  const floatHigh = sensorData?.float_high ?? false;
  const pump1 = sensorData?.pump1 ?? false;
  const pump2 = sensorData?.pump2 ?? false;
  const buzzer = sensorData?.buzzer ?? false;
  const mode = sensorData?.mode ?? 'AUTO';

  // Compute water status text
  let waterStatus = 'Bình thường';
  let waterBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';

  if (!floatLow && !floatHigh) {
    waterStatus = 'Cạn nước (Dưới phao LOW)';
    waterBadgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (floatLow && floatHigh) {
    waterStatus = 'Nước đầy (Chạm phao HIGH)';
    waterBadgeColor = 'bg-sky-50 text-sky-700 border-sky-200';
  } else if (!floatLow && floatHigh) {
    waterStatus = 'Bất thường (Lỗi phao)';
    waterBadgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  // Format last update
  const lastUpdateTime = sensorData?.timestamp
    ? new Date(sensorData.timestamp).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '--:--:--';

  return (
    <div className="space-y-5 pb-20 sm:pb-6">
      {/* Offline Alert Banner if ESP32 is offline */}
      {!isOnline && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between gap-3 text-rose-800 shadow-sm">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-sm">ESP32 OFFLINE</p>
              <p className="text-xs text-rose-600">
                Không nhận được tín hiệu cảm biến từ thiết bị phần cứng trong hơn 30 giây qua.
              </p>
            </div>
          </div>
          <button
            onClick={() => onSelectTab('settings')}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer"
          >
            Kiểm tra
          </button>
        </div>
      )}

      {/* Top Banner: Quick Summary & AI Analysis Button */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Giám Sát Trực Tiếp
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                Cập nhật: {lastUpdateTime}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">
              Tổng Quan Hệ Sinh Thái Tuần Hoàn
            </h2>
            <p className="text-xs text-slate-500 max-w-2xl">
              Cảm biến TDS, độ ẩm đất, phao mực nước và AI Vision PC tự động đồng bộ thời gian thực.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onTriggerAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 text-emerald-400 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Đang phân tích...' : 'Phân Tích Hệ Sinh Thái'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Sensor Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: TDS Sensor */}
        <div className="bg-white border-2 border-cyan-100 hover:border-cyan-300 rounded-2xl p-4 sm:p-5 shadow-sm transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-blue-500" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-sm shadow-cyan-200">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-cyan-800 uppercase tracking-widest">
                  Cảm biến TDS
                </span>
                <p className="text-xs text-slate-500">Chất lượng nước</p>
              </div>
            </div>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                tds <= 800 && tds >= 200
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {tds <= 800 && tds >= 200 ? 'TỐI ƯU' : 'CẢNH BÁO'}
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono">
                {tds}
              </span>
              <span className="text-xs font-bold text-cyan-600">ppm</span>
            </div>
            <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  tds > 800
                    ? 'bg-gradient-to-r from-amber-400 to-rose-500'
                    : tds < 200
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-400'
                    : 'bg-gradient-to-r from-cyan-400 to-emerald-500'
                }`}
                style={{ width: `${Math.min(100, (tds / 1000) * 100)}%` }}
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium text-slate-600">Chuẩn: 200 - 800 ppm</span>
            <button
              onClick={() => onSelectTab('charts')}
              className="text-cyan-700 hover:text-cyan-800 font-bold flex items-center gap-0.5 cursor-pointer"
            >
              Biểu đồ <ArrowUpRight className="w-3.5 h-3.5 text-cyan-600" />
            </button>
          </div>
        </div>

        {/* Card 2: Soil Moisture Sensor */}
        <div className="bg-white border-2 border-emerald-100 hover:border-emerald-300 rounded-2xl p-4 sm:p-5 shadow-sm transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-sm shadow-emerald-200">
                <Sprout className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest">
                  Độ Ẩm Đất
                </span>
                <p className="text-xs text-slate-500">Thảm sinh thái</p>
              </div>
            </div>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                soilMoisture >= 40 && soilMoisture <= 85
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {soilMoisture >= 40 && soilMoisture <= 85 ? 'PHÙ HỢP' : 'CẦN TƯỚI'}
            </span>
          </div>

          <div className="my-2">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono">
                {soilMoisture}
              </span>
              <span className="text-xs font-bold text-emerald-600">%</span>
            </div>
            <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, soilMoisture))}%` }}
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium text-slate-600">Ngưỡng: 40% - 85%</span>
            <button
              onClick={() => onSelectTab('charts')}
              className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 cursor-pointer"
            >
              Biểu đồ <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
            </button>
          </div>
        </div>

        {/* Card 3: Water Status & 2 Float Sensors */}
        <div className="bg-white border-2 border-indigo-100 hover:border-indigo-300 rounded-2xl p-4 sm:p-5 shadow-sm transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-indigo-600" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-sm shadow-blue-200">
                <Waves className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-widest">
                  Mực Nước Hồ
                </span>
                <p className="text-xs text-slate-500">2 Phao cảm biến</p>
              </div>
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${waterBadgeColor}`}>
              {waterStatus}
            </span>
          </div>

          <div className="my-2 grid grid-cols-2 gap-2 bg-indigo-50/40 p-2.5 rounded-xl border border-indigo-100">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  floatLow ? 'bg-emerald-500 shadow-sm shadow-emerald-200' : 'bg-rose-500 animate-pulse'
                }`}
              />
              <div className="text-xs">
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Phao LOW</p>
                <p className={`font-bold ${floatLow ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {floatLow ? 'ĐỦ NƯỚC' : 'CẠN NƯỚC'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  floatHigh ? 'bg-sky-500 animate-pulse shadow-sm shadow-sky-200' : 'bg-slate-300'
                }`}
              />
              <div className="text-xs">
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Phao HIGH</p>
                <p className={`font-bold ${floatHigh ? 'text-sky-700' : 'text-slate-600'}`}>
                  {floatHigh ? 'ĐẦY BỂ' : 'BÌNH THƯỜNG'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium text-slate-600">Bảo vệ: {floatLow ? 'An toàn' : 'Ngắt bơm 1'}</span>
            <button
              onClick={() => onSelectTab('control')}
              className="text-indigo-700 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
            >
              Cơ cấu <ArrowUpRight className="w-3.5 h-3.5 text-indigo-600" />
            </button>
          </div>
        </div>

        {/* Card 4: Actuator Status (Pump 1, Pump 2, Buzzer) */}
        <div className="bg-white border-2 border-amber-100 hover:border-amber-300 rounded-2xl p-4 sm:p-5 shadow-sm transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-sm shadow-amber-200">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest">
                  Cơ Cấu Chấp Hành
                </span>
                <p className="text-xs text-slate-500">2 Bơm & Còi</p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-50 text-amber-800 border-amber-200">
              {mode}
            </span>
          </div>

          <div className="my-1 space-y-1.5">
            <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-slate-700 font-medium">Bơm 1 (Tuần hoàn)</span>
              <span
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                  pump1 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {pump1 ? 'ĐANG CHẠY' : 'TẮT'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-slate-700 font-medium">Bơm 2 (Tưới đất)</span>
              <span
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                  pump2 ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {pump2 ? 'ĐANG CHẠY' : 'TẮT'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-xl border border-slate-100">
              <span className="text-slate-700 font-medium">Còi Buzzer</span>
              <span
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                  buzzer ? 'bg-rose-600 text-white animate-pulse shadow-xs' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {buzzer ? 'HÚ CÒI' : 'TẮT'}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium text-slate-600">Bảo vệ rơ-le an toàn</span>
            <button
              onClick={() => onSelectTab('control')}
              className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-0.5 cursor-pointer"
            >
              Điều khiển <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Middle Grid: AI Vision PC Card & Quick Actuator Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: AI Vision Overview (Bèo & Trứng Ốc) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-slate-700">
                <Eye className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 flex items-center gap-2">
                  AI Vision PC (Thị Giác Máy Tính)
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded">
                    KẾT NỐI
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Phát hiện mật độ bèo lọc nước & tổ trứng ốc bươu đen
                </p>
              </div>
            </div>

            <button
              onClick={() => onSelectTab('vision')}
              className="text-xs font-medium text-slate-700 hover:text-slate-900 flex items-center gap-1 border border-slate-200 px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Mở Camera AI <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Box 1: Bèo Coverage */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Thảm Bèo Lọc Sinh Học
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Độ tin cậy: {visionResult?.duckweed.confidence ?? 89}%
                </span>
              </div>

              <div className="my-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900 font-mono">
                    {visionResult?.duckweed.coverage ?? 76}%
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">
                    Trạng thái: {visionResult?.duckweed.status ?? 'NORMAL'}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full transition-all duration-700"
                    style={{ width: `${visionResult?.duckweed.coverage ?? 76}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-slate-500 italic">
                {visionResult?.duckweed.coverage && visionResult.duckweed.coverage > 85
                  ? 'Mật độ bèo quá dày, cần thu tỉa bớt để thoáng khí.'
                  : 'Mật độ quang hợp và hấp thu amoniac đang ở mức lý tưởng.'}
              </p>
            </div>

            {/* Box 2: Trứng Ốc & Hatching */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Egg className="w-3.5 h-3.5 text-pink-600" />
                  Trứng Ốc Bươu Đen
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 border border-pink-200">
                  Độ tin cậy: {visionResult?.snail_eggs.confidence ?? 84}%
                </span>
              </div>

              <div className="my-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900 font-mono">
                    {visionResult?.snail_eggs.egg_clusters ?? 5} CỤM
                  </span>
                  <span className="text-xs font-semibold text-amber-700">
                    Khả năng nở: {visionResult?.snail_eggs.hatching ?? 'POSSIBLE'}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-pink-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, (visionResult?.snail_eggs.egg_clusters ?? 5) * 15)}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-slate-500 italic">
                Cụm trứng bám thành bể ở vị trí khô ráo trên phao HIGH, độ ẩm 65-75% thuận lợi cho ấu trùng phát triển.
              </p>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Quick Control Toggles */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm sm:text-base font-semibold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-700" />
                Thao Tác Nhanh
              </h3>
              <button
                onClick={() => onSelectTab('control')}
                className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Chi tiết →
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Lưu ý: Trong chế độ MANUAL, người dùng có thể bật/tắt trực tiếp. AI không tự ý bật relay.
            </p>

            <div className="space-y-2.5">
              {/* Pump 1 Button */}
              <button
                onClick={onTogglePump1}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                  pump1
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-md shadow-blue-200'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-blue-50/50 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${pump1 ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold">BƠM 1 (Lọc tuần hoàn bèo)</p>
                    <p className={`text-[10px] ${pump1 ? 'text-blue-100' : 'text-slate-500'}`}>
                      {pump1 ? 'Đang bơm nước lọc sinh học' : 'Đang nghỉ / Tắt'}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                    pump1 ? 'bg-white text-blue-700 shadow-xs' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {pump1 ? 'ĐANG CHẠY' : 'TẮT'}
                </span>
              </button>

              {/* Pump 2 Button */}
              <button
                onClick={onTogglePump2}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                  pump2
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-md shadow-emerald-200'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-emerald-50/50 hover:border-emerald-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${pump2 ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold">BƠM 2 (Tưới phun sương đất)</p>
                    <p className={`text-[10px] ${pump2 ? 'text-emerald-100' : 'text-slate-500'}`}>
                      {pump2 ? 'Đang tưới giữ ẩm đất' : 'Đang nghỉ / Tắt'}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                    pump2 ? 'bg-white text-emerald-700 shadow-xs' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {pump2 ? 'ĐANG CHẠY' : 'TẮT'}
                </span>
              </button>

              {/* Buzzer Button */}
              <button
                onClick={onToggleBuzzer}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                  buzzer
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-rose-500 shadow-md shadow-rose-200 animate-pulse'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-rose-50/50 hover:border-rose-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${buzzer ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-600'}`}>
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold">CÒI BÁO ĐỘNG BUZZER</p>
                    <p className={`text-[10px] ${buzzer ? 'text-rose-100 font-bold' : 'text-slate-500'}`}>
                      {buzzer ? 'Hú còi cảnh báo sự cố' : 'Chế độ im lặng'}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                    buzzer ? 'bg-white text-rose-700 shadow-xs' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {buzzer ? 'HÚ CÒI' : 'TẮT'}
                </span>
              </button>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400">
              Cơ chế an toàn tự ngắt khi phao cạn nước
            </span>
          </div>
        </div>
      </div>

      {/* AI Ecosystem Analysis Report Card */}
      {analysis && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-slate-900 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 flex items-center gap-2">
                  Báo Cáo Phân Tích Hệ Sinh Thái (Gemini AI)
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      analysis.status_rating === 'TỐT'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : analysis.status_rating === 'CẦN CHÚ Ý'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {analysis.status_rating}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Phân tích dựa trên dữ liệu cảm biến IoT, Google Sheets và AI Vision PC
                </p>
              </div>
            </div>

            <span className="text-xs text-slate-400 flex items-center gap-1 self-start sm:self-auto">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {new Date(analysis.timestamp).toLocaleTimeString('vi-VN')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Tổng Quan
              </p>
              <p className="text-xs text-slate-700 leading-relaxed">
                {analysis.summary}
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-cyan-600" />
                Xu Hướng Sinh Thái
              </p>
              <p className="text-xs text-slate-700 leading-relaxed">
                {analysis.trend}
              </p>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Bất Thường
              </p>
              <p className="text-xs text-slate-700 leading-relaxed">
                {analysis.anomaly}
              </p>
            </div>
          </div>

          {/* Recommendations List */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Khuyến Nghị Vận Hành Cho Con Người:
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600">
              {analysis.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-slate-400 italic">
              * Nguyên tắc an toàn: AI chỉ đóng vai trò phân tích & khuyến nghị, không tự ý can thiệp bật/tắt thiết bị vật lý.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
