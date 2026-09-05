import React from 'react';
import {
  Wifi,
  WifiOff,
  Cpu,
  Radio,
  Bell,
  PlayCircle,
  RotateCw,
  Settings,
} from 'lucide-react';
import type { IoTStatus, SensorData } from '../types.ts';

interface HeaderProps {
  status: IoTStatus | null;
  sensorData: SensorData | null;
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
  activeAlertCount: number;
  onOpenAlerts: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenConfigMode?: () => void;
  isConfigMode?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  sensorData,
  isDemoMode,
  onToggleDemoMode,
  activeAlertCount,
  onOpenAlerts,
  onRefresh,
  isRefreshing,
  onOpenConfigMode,
  isConfigMode,
}) => {
  const isOnline = isDemoMode ? true : (status?.online ?? false);
  const deviceId = isDemoMode ? 'DEMO-ESP32-S3' : (status?.device_id || 'ESP32S3_ECO_01');
  const wifiRssi = sensorData?.wifi_rssi ?? -65;
  const mode = sensorData?.mode ?? status?.mode ?? 'AUTO';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-3 py-2.5 sm:px-6 shrink-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Brand & Status */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
            <Cpu className="w-5 h-5 text-emerald-400" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-1">
                <span className="text-emerald-600">OC</span>
                <span>IoT</span>
              </span>
              <span className="hidden xxs:inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
                Hệ Sinh Thái Thông Minh
              </span>
              {isConfigMode && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500 text-slate-950 uppercase tracking-wide animate-pulse">
                  Config Mode
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 truncate">
              <div className="flex items-center text-xs font-medium">
                <span
                  className={`w-2 h-2 rounded-full mr-1.5 ${
                    isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span
                  className={
                    isOnline
                      ? 'text-emerald-700 font-semibold text-[11px]'
                      : 'text-rose-600 font-semibold text-[11px]'
                  }
                >
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <span className="text-slate-300">•</span>
              <span className="font-mono text-slate-700 text-[11px] truncate max-w-[90px] sm:max-w-none">
                {deviceId}
              </span>
              <span className="text-slate-300 hidden xs:inline">•</span>
              <span className="hidden xs:flex items-center gap-1 text-[11px] text-slate-600">
                {wifiRssi > -70 ? (
                  <Wifi className="w-3 h-3 text-emerald-600" />
                ) : (
                  <WifiOff className="w-3 h-3 text-amber-600" />
                )}
                <span>{wifiRssi} dBm</span>
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span
                className={`hidden sm:inline-flex text-[11px] px-2 py-0.5 rounded font-semibold border ${
                  mode === 'AUTO'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {mode}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Controls, Config mode toggle & Alerts */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Refresh button */}
          <button
            onClick={onRefresh}
            title="Làm mới dữ liệu"
            className="w-10 h-10 sm:w-9 sm:h-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors active:scale-95 cursor-pointer shadow-2xs"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-slate-900' : ''}`} />
          </button>

          {/* Alerts button */}
          <button
            onClick={onOpenAlerts}
            className="relative w-10 h-10 sm:w-9 sm:h-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors active:scale-95 cursor-pointer shadow-2xs"
            title="Cảnh báo hệ thống"
          >
            <Bell className="w-4 h-4" />
            {activeAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center border-2 border-white shadow-xs">
                {activeAlertCount}
              </span>
            )}
          </button>

          {/* Configuration Mode Trigger */}
          {onOpenConfigMode && (
            <button
              onClick={onOpenConfigMode}
              className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
                isConfigMode
                  ? 'bg-amber-500 text-slate-950 border-amber-600'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
              }`}
              title="Mở Chế Độ Cấu Hình"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isConfigMode ? 'Thoát Cấu Hình' : 'Cấu Hình'}
              </span>
            </button>
          )}

          {/* Mobile Single Pill Toggle */}
          <button
            onClick={onToggleDemoMode}
            className={`sm:hidden flex items-center gap-1 px-2.5 py-1.5 min-h-[44px] rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
              isDemoMode
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
            title="Chuyển đổi chế độ LIVE / DEMO"
          >
            {isDemoMode ? (
              <>
                <PlayCircle className="w-3.5 h-3.5 text-amber-300" />
                <span className="font-mono text-[11px]">DEMO</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                <span className="font-mono text-[11px]">LIVE</span>
              </>
            )}
          </button>

          {/* Desktop/Tablet Segmented Switch */}
          <div className="hidden sm:flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => isDemoMode && onToggleDemoMode()}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                !isDemoMode
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-emerald-600" />
              <span>LIVE</span>
            </button>
            <button
              onClick={() => !isDemoMode && onToggleDemoMode()}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                isDemoMode
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>DEMO</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
