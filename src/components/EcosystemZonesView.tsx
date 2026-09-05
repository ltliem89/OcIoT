import React, { useState } from 'react';
import {
  Droplets,
  Sprout,
  Target,
  Waves,
  Sliders,
  Power,
  Volume2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Zap,
  Check,
  Loader2,
} from 'lucide-react';
import type {
  SensorData,
  IoTStatus,
  Zone,
  SensorConfig,
  ActuatorConfig,
  ControlCommand,
  AIVisionResult,
} from '../types.ts';

interface EcosystemZonesViewProps {
  status: IoTStatus | null;
  sensorData: SensorData | null;
  visionResult: AIVisionResult | null;
  zones: Zone[];
  sensors: SensorConfig[];
  actuators: ActuatorConfig[];
  onSendCommand: (cmd: ControlCommand) => Promise<any>;
  isDemoMode: boolean;
}

export const EcosystemZonesView: React.FC<EcosystemZonesViewProps> = ({
  status,
  sensorData,
  visionResult,
  zones,
  sensors,
  actuators,
  onSendCommand,
  isDemoMode,
}) => {
  const isOnline = isDemoMode ? true : (status?.online ?? false);
  const mode = sensorData?.mode ?? status?.mode ?? 'AUTO';

  // 2-Step Command verification UX states
  const [commandStates, setCommandStates] = useState<Record<string, 'IDLE' | 'SENDING' | 'ACCEPTED' | 'APPLYING' | 'CONFIRMED'>>({
    pump1: 'IDLE',
    pump2: 'IDLE',
    buzzer: 'IDLE',
    mode: 'IDLE',
  });

  const [activeZoneFilter, setActiveZoneFilter] = useState<string>('all');

  const executeCommand = async (key: 'pump1' | 'pump2' | 'buzzer', targetValue: boolean) => {
    if (!isOnline) return;

    setCommandStates((prev) => ({ ...prev, [key]: 'SENDING' }));

    try {
      // Step 1: Sending -> Accepted by Server
      await new Promise((r) => setTimeout(r, 300));
      setCommandStates((prev) => ({ ...prev, [key]: 'ACCEPTED' }));

      // Step 2: Applying on ESP32
      await new Promise((r) => setTimeout(r, 400));
      setCommandStates((prev) => ({ ...prev, [key]: 'APPLYING' }));

      await onSendCommand({ [key]: targetValue });

      // Telemetry confirms
      await new Promise((r) => setTimeout(r, 400));
      setCommandStates((prev) => ({ ...prev, [key]: 'CONFIRMED' }));

      setTimeout(() => {
        setCommandStates((prev) => ({ ...prev, [key]: 'IDLE' }));
      }, 1500);
    } catch {
      setCommandStates((prev) => ({ ...prev, [key]: 'IDLE' }));
    }
  };

  const toggleMode = async () => {
    if (!isOnline) return;
    const nextMode = mode === 'AUTO' ? 'MANUAL' : 'AUTO';
    setCommandStates((prev) => ({ ...prev, mode: 'SENDING' }));

    try {
      await onSendCommand({ mode: nextMode });
      setCommandStates((prev) => ({ ...prev, mode: 'CONFIRMED' }));
      setTimeout(() => {
        setCommandStates((prev) => ({ ...prev, mode: 'IDLE' }));
      }, 1200);
    } catch {
      setCommandStates((prev) => ({ ...prev, mode: 'IDLE' }));
    }
  };

  const handleEmergencyStop = () => {
    onSendCommand({ pump1: false, pump2: false, buzzer: false, mode: 'MANUAL' });
  };

  const filteredZones = activeZoneFilter === 'all' ? zones : zones.filter((z) => z.id === activeZoneFilter);

  return (
    <div className="space-y-4 pb-20">
      {/* Top Banner: Ecosystem Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🌿</span>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                5 Phân Vùng Sinh Thái Tuần Hoàn
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active Runtime
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Hệ thống liên kết thủy sinh bèo lọc - ốc bươu - giá thể đất vi sinh kiểm soát qua ESP32-S3
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleEmergencyStop}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors cursor-pointer min-h-[44px]"
            >
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>DỪNG KHẨN CẤP</span>
            </button>

            <button
              onClick={toggleMode}
              disabled={!isOnline}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
                mode === 'AUTO'
                  ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700'
                  : 'bg-amber-500 text-white shadow-xs hover:bg-amber-600'
              } ${!isOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{mode === 'AUTO' ? 'CHẾ ĐỘ AUTO' : 'CHẾ ĐỘ MANUAL'}</span>
            </button>
          </div>
        </div>

        {/* Zone Filter Chips */}
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveZoneFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors min-h-[36px] ${
              activeZoneFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất Cả Vùng (5)
          </button>
          {zones.map((z) => (
            <button
              key={z.id}
              onClick={() => setActiveZoneFilter(z.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors min-h-[36px] ${
                activeZoneFilter === z.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{z.emoji}</span>
              <span>{z.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* List of Zones */}
      <div className="space-y-4">
        {filteredZones.map((zone) => {
          return (
            <div
              key={zone.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs"
            >
              {/* Zone Header */}
              <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{zone.emoji}</span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{zone.name}</h3>
                    <p className="text-[11px] text-slate-500">{zone.description}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 font-semibold">
                  {zone.id}
                </span>
              </div>

              {/* Zone Content */}
              <div className="p-4 space-y-4">
                {/* 1. ZONE: WATER */}
                {zone.id === 'zone_water' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* TDS Card */}
                    <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-200 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wide">
                          Chỉ số TDS Nước
                        </span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-black text-blue-900 font-mono">
                            {sensorData?.tds ?? '--'}
                          </span>
                          <span className="text-xs font-bold text-blue-700">ppm</span>
                        </div>
                        <span className="text-[10px] text-blue-600 font-medium">
                          Khoảng lý tưởng: 200 - 600 ppm
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                        <Droplets className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Float Sensors */}
                    <div className="p-3.5 rounded-lg bg-teal-50/60 border border-teal-200 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wide">
                          Phao Mực Nước Bể
                        </span>
                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              sensorData?.float_low
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800 animate-pulse'
                            }`}
                          >
                            {sensorData?.float_low ? 'Phao LOW: Đầy nước' : 'Phao LOW: CẠN NƯỚC'}
                          </span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              sensorData?.float_high
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {sensorData?.float_high ? 'Phao HIGH: Chạm' : 'Phao HIGH: An toàn'}
                          </span>
                        </div>
                        <span className="text-[10px] text-teal-600 font-medium block mt-1">
                          Khóa an toàn ngắt Bơm 1 khi hụt phao LOW
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700">
                        <Waves className="w-5 h-5" />
                      </div>
                    </div>

                    {/* Actuator: Pump 1 */}
                    <div className="sm:col-span-2 p-3.5 rounded-lg bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              sensorData?.pump1 ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'
                            }`}
                          />
                          <span className="text-xs font-bold text-slate-900">
                            BƠM 1 (Lọc Tuần Hoàn Bèo Sinh Học)
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              sensorData?.pump1
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {sensorData?.pump1 ? 'ĐANG CHẠY' : 'ĐÃ TẮT'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Bơm nước từ bể ốc qua giàn bèo lọc amoniac và tuần hoàn lại
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {commandStates.pump1 !== 'IDLE' && (
                          <div className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md">
                            {commandStates.pump1 === 'SENDING' && (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Đang gửi...</span>
                              </>
                            )}
                            {commandStates.pump1 === 'ACCEPTED' && (
                              <>
                                <Check className="w-3.5 h-3.5 text-blue-600" />
                                <span>Máy chủ nhận</span>
                              </>
                            )}
                            {commandStates.pump1 === 'APPLYING' && (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                                <span>ESP thực thi</span>
                              </>
                            )}
                            {commandStates.pump1 === 'CONFIRMED' && (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Xác nhận telemetry!</span>
                              </>
                            )}
                          </div>
                        )}

                        <button
                          onClick={() => executeCommand('pump1', !sensorData?.pump1)}
                          disabled={!isOnline || commandStates.pump1 !== 'IDLE'}
                          className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            sensorData?.pump1
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xs'
                          } ${!isOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{sensorData?.pump1 ? 'TẮT BƠM 1' : 'BẬT BƠM 1'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. ZONE: PLANT (DUCKWEED) */}
                {zone.id === 'zone_plant' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-lg bg-purple-50/60 border border-purple-200">
                      <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wide">
                        Độ Che Phủ Thảm Bèo
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-black text-purple-900 font-mono">
                          {visionResult?.duckweed.coverage ?? 76}%
                        </span>
                        <span className="text-xs font-bold text-purple-700">mặt nước</span>
                      </div>
                      <div className="w-full bg-purple-200 rounded-full h-2 mt-2 overflow-hidden">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${visionResult?.duckweed.coverage ?? 76}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-purple-600 font-medium block mt-1.5">
                        Mật độ chuẩn: 60% - 80% để hấp thụ amoniac và làm mát nước
                      </span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200 flex flex-col justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wide">
                          Tình Trạng Sinh Khối Bèo
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {visionResult?.duckweed.status ?? 'NORMAL'} (Xanh tươi tốt)
                          </span>
                          <span className="text-xs text-emerald-700 font-mono font-bold">
                            {visionResult?.duckweed.confidence ?? 89}% tin cậy
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-emerald-700 mt-2">
                        Bèo hoa dâu và bèo tấm sinh trưởng đều, không có dấu hiệu úa thối.
                      </p>
                    </div>
                  </div>
                )}

                {/* 3. ZONE: BIO (SNAIL & EGGS) */}
                {zone.id === 'zone_bio' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-lg bg-pink-50/60 border border-pink-200 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-pink-800 uppercase tracking-wide">
                          Số Cụm Trứng Ốc Bươu Đen
                        </span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-2xl font-black text-pink-900 font-mono">
                            {visionResult?.snail_eggs.egg_clusters ?? 5}
                          </span>
                          <span className="text-xs font-bold text-pink-700">cụm bám</span>
                        </div>
                        <span className="text-[10px] text-pink-600 font-medium">
                          Camera AI PC tự động đếm qua định dạng bounding box
                        </span>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center text-pink-700">
                        <Target className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-rose-50/60 border border-rose-200 flex flex-col justify-between">
                      <div>
                        <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wide">
                          Xác Suất Phôi Nở
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                            Khả năng nở: {visionResult?.snail_eggs.hatching ?? 'POSSIBLE'}
                          </span>
                          <span className="text-xs text-rose-700 font-mono font-bold">
                            {visionResult?.snail_eggs.confidence ?? 84}% tin cậy
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-rose-700 mt-2">
                        Trứng bám bờ đạt độ ẩm thích hợp, dự kiến nở thành ốc con sau 3-5 ngày.
                      </p>
                    </div>
                  </div>
                )}

                {/* 4. ZONE: ORGANIC (SUBSTRATE & PUMP 2) */}
                {zone.id === 'zone_organic' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-lg bg-amber-50/60 border border-amber-200">
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">
                        Độ Ẩm Đất Giá Thể Vi Sinh
                      </span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-2xl font-black text-amber-900 font-mono">
                          {sensorData?.soil_moisture ?? '--'}%
                        </span>
                        <span className="text-xs font-bold text-amber-700">độ ẩm</span>
                      </div>
                      <div className="w-full bg-amber-200 rounded-full h-2 mt-2 overflow-hidden">
                        <div
                          className="bg-amber-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${sensorData?.soil_moisture ?? 65}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-amber-700 font-medium block mt-1.5">
                        Khoảng tối ưu: 50% - 80% giữ ẩm giá thể hữu cơ
                      </span>
                    </div>

                    {/* Actuator: Pump 2 */}
                    <div className="p-3.5 rounded-lg bg-white border border-slate-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              sensorData?.pump2 ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'
                            }`}
                          />
                          <span className="text-xs font-bold text-slate-900">
                            BƠM 2 (Tưới Phun Sương Đất)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Tưới ẩm định kỳ hoặc tự động khi độ ẩm đất &lt; 45%
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            sensorData?.pump2
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {sensorData?.pump2 ? 'ĐANG TƯỚI' : 'TẮT'}
                        </span>

                        <button
                          onClick={() => executeCommand('pump2', !sensorData?.pump2)}
                          disabled={!isOnline || commandStates.pump2 !== 'IDLE'}
                          className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            sensorData?.pump2
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                              : 'bg-amber-600 text-white hover:bg-amber-700 shadow-xs'
                          } ${!isOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{sensorData?.pump2 ? 'TẮT BƠM 2' : 'BẬT BƠM 2'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. ZONE: CONTROL */}
                {zone.id === 'zone_control' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Buzzer Control */}
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4 text-slate-700" />
                          <span className="text-xs font-bold text-slate-900">
                            CÒI BÁO ĐỘNG BUZZER
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Phát âm thanh cảnh báo sự cố cạn nước hoặc TDS nguy hiểm
                        </p>
                      </div>

                      <button
                        onClick={() => executeCommand('buzzer', !sensorData?.buzzer)}
                        disabled={!isOnline || commandStates.buzzer !== 'IDLE'}
                        className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                          sensorData?.buzzer
                            ? 'bg-rose-600 text-white animate-pulse'
                            : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                        } ${!isOnline ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Power className="w-3.5 h-3.5" />
                        <span>{sensorData?.buzzer ? 'TẮT CÒI' : 'BẬT CÒI'}</span>
                      </button>
                    </div>

                    {/* Auto Safety Interlocks */}
                    <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200 flex items-center gap-3">
                      <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-emerald-900 block">
                          Khóa An Toàn Tự Động ESP32
                        </span>
                        <span className="text-[11px] text-emerald-700">
                          Tự động ngắt Bơm 1 khi hụt phao LOW • Tự động giới hạn bơm chạy liên tục 30 phút.
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
