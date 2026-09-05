import React, { useState } from 'react';
import {
  Zap,
  Droplets,
  Volume2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Sliders,
  Power,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import type { IoTStatus, SensorData } from '../types.ts';

interface ControlsViewProps {
  status: IoTStatus | null;
  sensorData: SensorData | null;
  onSendCommand: (cmd: {
    pump1?: boolean;
    pump2?: boolean;
    buzzer?: boolean;
    mode?: 'MANUAL' | 'AUTO';
  }) => Promise<void>;
  isSending?: boolean;
}

export const ControlsView: React.FC<ControlsViewProps> = ({
  status,
  sensorData,
  onSendCommand,
  isSending = false,
}) => {
  const currentMode = status?.mode || sensorData?.mode || 'AUTO';
  const [targetMode, setTargetMode] = useState<'MANUAL' | 'AUTO'>(currentMode);

  const pump1 = sensorData?.pump1 ?? status?.current_data?.pump1 ?? false;
  const pump2 = sensorData?.pump2 ?? status?.current_data?.pump2 ?? false;
  const buzzer = sensorData?.buzzer ?? status?.current_data?.buzzer ?? false;
  const floatLow = sensorData?.float_low ?? true;

  const handleModeChange = async (newMode: 'MANUAL' | 'AUTO') => {
    setTargetMode(newMode);
    await onSendCommand({ mode: newMode });
  };

  const handleEmergencyStop = async () => {
    await onSendCommand({
      pump1: false,
      pump2: false,
      buzzer: false,
      mode: 'MANUAL',
    });
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3.5 mb-2">
          <div className="w-10 h-10 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-white shadow-xs">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Bảng Điều Khiển Thiết Bị Cơ Điện
            </h2>
            <p className="text-xs text-slate-500">
              Quản lý Bơm tuần hoàn lọc bèo, Bơm tưới ẩm thảm vi sinh và Còi cảnh báo ESP32-S3
            </p>
          </div>
        </div>

        {/* Safety Rule Note */}
        <div className="mt-4 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Quy tắc an toàn hệ sinh thái OC IoT:</span>{' '}
            AI không tự ý can thiệp bật relay. Trong chế độ{' '}
            <span className="text-blue-700 font-bold underline decoration-blue-300">AUTO</span>, hệ
            thống bảo vệ tự ngắt Bơm 1 khi cạn nước phao LOW và kích hoạt Bơm 2 khi đất khô dưới
            ngưỡng. Trong chế độ{' '}
            <span className="text-amber-800 font-bold underline decoration-amber-400">MANUAL</span>,
            con người làm chủ thao tác trực tiếp.
          </div>
        </div>
      </div>

      {/* Mode Selector Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <span>Chế Độ Hoạt Động Trạm (SYSTEM MODE)</span>
          </h3>
          <span
            className={`text-xs px-3 py-1 rounded-full font-bold border ${
              currentMode === 'AUTO'
                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs'
                : 'bg-amber-50 text-amber-700 border-amber-200 shadow-xs'
            }`}
          >
            Đang hoạt động: {currentMode}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* AUTO Mode Card */}
          <button
            onClick={() => handleModeChange('AUTO')}
            disabled={isSending}
            className={`p-4 rounded-xl border-2 text-left transition-all relative cursor-pointer ${
              currentMode === 'AUTO'
                ? 'bg-gradient-to-br from-blue-900 to-indigo-900 text-white border-blue-500 shadow-md shadow-blue-200'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-sm font-bold flex items-center gap-2 ${
                  currentMode === 'AUTO' ? 'text-white' : 'text-slate-900'
                }`}
              >
                <ShieldCheck
                  className={`w-4 h-4 ${
                    currentMode === 'AUTO' ? 'text-emerald-400' : 'text-blue-600'
                  }`}
                />
                TỰ ĐỘNG (AUTO)
              </span>
              {currentMode === 'AUTO' ? (
                <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ĐANG BẬT
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-medium">Bấm kích hoạt</span>
              )}
            </div>
            <p
              className={`text-xs leading-relaxed ${
                currentMode === 'AUTO' ? 'text-blue-100' : 'text-slate-500'
              }`}
            >
              Hệ thống tự động kích hoạt ngắt Bơm 1 khi cạn phao LOW, bơm tưới ẩm đất Bơm 2 theo
              chu kỳ an toàn cài đặt.
            </p>
          </button>

          {/* MANUAL Mode Card */}
          <button
            onClick={() => handleModeChange('MANUAL')}
            disabled={isSending}
            className={`p-4 rounded-xl border-2 text-left transition-all relative cursor-pointer ${
              currentMode === 'MANUAL'
                ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-white border-amber-400 shadow-md shadow-amber-200'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`text-sm font-bold flex items-center gap-2 ${
                  currentMode === 'MANUAL' ? 'text-white' : 'text-slate-900'
                }`}
              >
                <Power
                  className={`w-4 h-4 ${
                    currentMode === 'MANUAL' ? 'text-amber-200' : 'text-amber-600'
                  }`}
                />
                THỦ CÔNG (MANUAL)
              </span>
              {currentMode === 'MANUAL' ? (
                <span className="flex items-center gap-1 text-[10px] font-bold bg-white/20 text-white border border-white/30 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
                  ĐANG BẬT
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-medium">Bấm kích hoạt</span>
              )}
            </div>
            <p
              className={`text-xs leading-relaxed ${
                currentMode === 'MANUAL' ? 'text-amber-100' : 'text-slate-500'
              }`}
            >
              Cho phép người vận hành trực tiếp bật/tắt Bơm 1, Bơm 2 và còi báo động để bảo trì, thay
              nước hoặc kiểm tra relay.
            </p>
          </button>
        </div>
      </div>

      {/* Actuator Controls Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pump 1 Control Card (Blue theme) */}
        <div
          className={`border-2 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all ${
            pump1
              ? 'bg-blue-50/60 border-blue-400'
              : 'bg-white border-slate-200'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  pump1 ? 'bg-blue-600 text-white shadow-xs' : 'bg-blue-50 text-blue-600'
                }`}
              >
                <Zap className="w-5 h-5" />
              </div>
              <span
                className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                  pump1
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {pump1 ? 'ĐANG CHẠY' : 'ĐÃ DỪNG'}
              </span>
            </div>

            <h4 className="font-bold text-slate-900 text-sm">BƠM 1 (PUMP 1)</h4>
            <p className="text-xs text-slate-500 mt-0.5">Tuần hoàn lọc bèo & cấp oxy hòa tan</p>

            {!floatLow && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Khoá an toàn: Cạn nước dưới phao LOW!</span>
              </div>
            )}
          </div>

          <div className="mt-6">
            <button
              onClick={() => onSendCommand({ pump1: !pump1 })}
              disabled={isSending}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                pump1
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs'
              }`}
            >
              {pump1 ? 'TẮT BƠM 1' : 'BẬT BƠM 1'}
            </button>
          </div>
        </div>

        {/* Pump 2 Control Card (Emerald theme) */}
        <div
          className={`border-2 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all ${
            pump2
              ? 'bg-emerald-50/60 border-emerald-400'
              : 'bg-white border-slate-200'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  pump2
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-600'
                }`}
              >
                <Droplets className="w-5 h-5" />
              </div>
              <span
                className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                  pump2
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {pump2 ? 'ĐANG CHẠY' : 'ĐÃ DỪNG'}
              </span>
            </div>

            <h4 className="font-bold text-slate-900 text-sm">BƠM 2 (PUMP 2)</h4>
            <p className="text-xs text-slate-500 mt-0.5">Phun sương giữ ẩm thảm đất vi sinh</p>
          </div>

          <div className="mt-6">
            <button
              onClick={() => onSendCommand({ pump2: !pump2 })}
              disabled={isSending}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                pump2
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs'
              }`}
            >
              {pump2 ? 'TẮT BƠM 2' : 'BẬT BƠM 2'}
            </button>
          </div>
        </div>

        {/* Buzzer Control Card (Rose theme) */}
        <div
          className={`border-2 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition-all ${
            buzzer
              ? 'bg-rose-50/80 border-rose-400 shadow-md shadow-rose-100 animate-pulse'
              : 'bg-white border-slate-200'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  buzzer ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-600'
                }`}
              >
                <Volume2 className="w-5 h-5" />
              </div>
              <span
                className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                  buzzer
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {buzzer ? 'ĐANG BÁO ĐỘNG' : 'IM LẶNG'}
              </span>
            </div>

            <h4 className="font-bold text-slate-900 text-sm">CÒI BÁO ĐỘNG BUZZER</h4>
            <p className="text-xs text-slate-500 mt-0.5">Cảnh báo âm thanh thực địa tại chuồng ốc</p>
          </div>

          <div className="mt-6">
            <button
              onClick={() => onSendCommand({ buzzer: !buzzer })}
              disabled={isSending}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                buzzer
                  ? 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
              }`}
            >
              {buzzer ? 'TẮT CÒI' : 'THỬ KÍCH HOẠT CÒI'}
            </button>
          </div>
        </div>
      </div>

      {/* Emergency Stop Action */}
      <div className="bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-rose-200">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-white/20 text-white backdrop-blur-xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-black">
              NGẮT KHẨN CẤP TOÀN BỘ RƠ-LE (EMERGENCY STOP)
            </h4>
            <p className="text-xs text-rose-100 mt-0.5">
              Lập tức ngắt điện Bơm 1, Bơm 2, tắt còi báo động và trả hệ thống về trạng thái an
              toàn MANUAL.
            </p>
          </div>
        </div>

        <button
          onClick={handleEmergencyStop}
          disabled={isSending}
          className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white hover:bg-rose-50 text-rose-700 font-black text-xs tracking-wider shadow-md transition-all active:scale-95 cursor-pointer whitespace-nowrap"
        >
          NGẮT TOÀN BỘ RƠ-LE
        </button>
      </div>
    </div>
  );
};
