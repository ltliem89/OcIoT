import React from 'react';
import {
  Bell,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCircle2,
  X,
} from 'lucide-react';
import type { AlertItem } from '../types.ts';

interface AlertsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AlertItem[];
  onDismissAlert: (id: string) => void;
  onClearAll: () => void;
  onSelectTab: (tab: any) => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  isOpen,
  onClose,
  alerts,
  onDismissAlert,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Bell className="w-5 h-5 text-slate-800" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Cảnh Báo Hệ Thống</h3>
              <p className="text-xs text-slate-500">
                {alerts.length} cảnh báo đang được giám sát theo thời gian thực
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {alerts.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs text-slate-500 hover:text-slate-800 transition-colors px-2 py-1 rounded-md hover:bg-slate-100 cursor-pointer"
              >
                Xoá tất cả
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Alert List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {alerts.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="font-semibold text-slate-900 text-sm">Hệ Thống Đang Ổn Định</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Không phát hiện vi phạm ngưỡng cảm biến, mực nước an toàn và kết nối ESP32-S3 liên tục.
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3.5 rounded-lg border flex items-start justify-between gap-3 transition-all ${
                  alert.level === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : alert.level === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5">
                    {alert.level === 'error' ? (
                      <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                    ) : alert.level === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-slate-600 shrink-0" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs">{alert.title}</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/80 border border-slate-200 text-slate-600">
                        {alert.source}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {alert.message}
                    </p>
                    <span className="text-[10px] text-slate-400 font-mono mt-1.5 block">
                      {new Date(alert.timestamp).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => onDismissAlert(alert.id)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200/50 transition-colors shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-500">
          Cảnh báo tự động kích hoạt còi buzzer nếu được bật trong Cài Đặt
        </div>
      </div>
    </div>
  );
};
