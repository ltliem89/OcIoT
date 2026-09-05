import React, { useState } from 'react';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Sliders,
  Check,
  Filter,
  UserCheck,
  ChevronDown,
} from 'lucide-react';
import type { ActiveAlarm, AlarmRule, AlarmSeverity } from '../types.ts';

interface AlarmsViewProps {
  alarms: ActiveAlarm[];
  rules: AlarmRule[];
  onAcknowledge: (id: string, note?: string) => Promise<any>;
  isLoading?: boolean;
}

export const AlarmsView: React.FC<AlarmsViewProps> = ({
  alarms,
  rules,
  onAcknowledge,
  isLoading,
}) => {
  const [filterState, setFilterState] = useState<'ALL' | 'ACTIVE' | 'ACKNOWLEDGED' | 'CLEARED'>('ACTIVE');
  const [selectedAlarmForAck, setSelectedAlarmForAck] = useState<string | null>(null);
  const [ackNote, setAckNote] = useState('');
  const [isSubmittingAck, setIsSubmittingAck] = useState(false);

  const filteredAlarms = alarms.filter((a) => {
    if (filterState === 'ALL') return true;
    return a.state === filterState;
  });

  const activeCount = alarms.filter((a) => a.state === 'ACTIVE').length;
  const ackCount = alarms.filter((a) => a.state === 'ACKNOWLEDGED').length;
  const clearedCount = alarms.filter((a) => a.state === 'CLEARED').length;

  const handleConfirmAck = async (id: string) => {
    setIsSubmittingAck(true);
    try {
      await onAcknowledge(id, ackNote.trim() || undefined);
      setSelectedAlarmForAck(null);
      setAckNote('');
    } finally {
      setIsSubmittingAck(false);
    }
  };

  const getSeverityBadge = (sev: AlarmSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            WARNING
          </span>
        );
      case 'INFO':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
            INFO
          </span>
        );
    }
  };

  const getStateBadge = (state: string) => {
    switch (state) {
      case 'ACTIVE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
            ● ĐANG XẢY RA
          </span>
        );
      case 'ACKNOWLEDGED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            ✓ ĐÃ XÁC NHẬN
          </span>
        );
      case 'CLEARED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            ✓ ĐÃ BÌNH THƯỜNG
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <Bell className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Trung Tâm Quản Lý Cảnh Báo & Sự Cố
              </h2>
              {activeCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white animate-pulse">
                  {activeCount} đang kích hoạt
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Vòng đời trạng thái: NORMAL → ACTIVE → ACKNOWLEDGED → CLEARED với cơ chế chống rung giật (Hysteresis)
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setFilterState('ACTIVE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap min-h-[36px] transition-colors cursor-pointer ${
                filterState === 'ACTIVE'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Đang xảy ra ({activeCount})
            </button>
            <button
              onClick={() => setFilterState('ACKNOWLEDGED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap min-h-[36px] transition-colors cursor-pointer ${
                filterState === 'ACKNOWLEDGED'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Đã xác nhận ({ackCount})
            </button>
            <button
              onClick={() => setFilterState('CLEARED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap min-h-[36px] transition-colors cursor-pointer ${
                filterState === 'CLEARED'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Đã xóa/khôi phục ({clearedCount})
            </button>
            <button
              onClick={() => setFilterState('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap min-h-[36px] transition-colors cursor-pointer ${
                filterState === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({alarms.length})
            </button>
          </div>
        </div>
      </div>

      {/* Alarms List */}
      <div className="space-y-3">
        {filteredAlarms.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Không có cảnh báo nào trong mục này
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Hệ thống vận hành an toàn. Cảm biến và máy bơm đang hoạt động trong ngưỡng bình thường.
            </p>
          </div>
        ) : (
          filteredAlarms.map((alarm) => {
            const isAcking = selectedAlarmForAck === alarm.id;
            return (
              <div
                key={alarm.id}
                className={`bg-white border rounded-xl p-4 shadow-xs transition-all ${
                  alarm.state === 'ACTIVE'
                    ? 'border-rose-300 bg-rose-50/20'
                    : alarm.state === 'ACKNOWLEDGED'
                    ? 'border-amber-200 bg-amber-50/10'
                    : 'border-slate-200 opacity-80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {getSeverityBadge(alarm.severity)}
                      {getStateBadge(alarm.state)}
                      <span className="text-xs font-mono font-bold text-slate-500">
                        {alarm.entityId}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 pt-0.5">{alarm.title}</h3>
                    <p className="text-xs text-slate-600">{alarm.message}</p>
                  </div>

                  <div className="flex flex-col sm:items-end gap-1 shrink-0 pt-1 sm:pt-0">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(alarm.triggeredAt).toLocaleTimeString('vi-VN')}</span>
                    </div>

                    {alarm.state === 'ACTIVE' && (
                      <button
                        onClick={() => setSelectedAlarmForAck(isAcking ? null : alarm.id)}
                        className="mt-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer min-h-[36px]"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Xác Nhận (ACK)</span>
                      </button>
                    )}

                    {alarm.state === 'ACKNOWLEDGED' && (
                      <span className="text-[10px] text-amber-700 font-medium">
                        Xác nhận bởi: {alarm.acknowledgedBy || 'Vận hành viên'}
                      </span>
                    )}

                    {alarm.state === 'CLEARED' && (
                      <span className="text-[10px] text-emerald-700 font-medium">
                        Khôi phục lúc: {alarm.clearedAt ? new Date(alarm.clearedAt).toLocaleTimeString('vi-VN') : '--'}
                      </span>
                    )}
                  </div>
                </div>

                {/* ACK Drawer Form */}
                {isAcking && (
                  <div className="mt-3 pt-3 border-t border-amber-200 bg-amber-50/70 -mx-4 -mb-4 p-4 rounded-b-xl space-y-2">
                    <span className="text-xs font-bold text-amber-900 block">
                      Ghi chú xử lý sự cố (Tùy chọn):
                    </span>
                    <input
                      type="text"
                      value={ackNote}
                      onChange={(e) => setAckNote(e.target.value)}
                      placeholder="VD: Đã xả bớt nước đáy, đang bơm nước sạch mới..."
                      className="w-full px-3 py-2 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => setSelectedAlarmForAck(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-amber-100 cursor-pointer min-h-[36px]"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={() => handleConfirmAck(alarm.id)}
                        disabled={isSubmittingAck}
                        className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer min-h-[36px] flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Lưu Xác Nhận (ACK)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Alarm Rules Section (Hysteresis Explainer) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Quy Tắc Cảnh Báo Có Hysteresis (Chống Nháy Còi/Rung Giật)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {rules.length} quy tắc đang chạy
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rules.map((r) => (
            <div
              key={r.id}
              className="p-3 rounded-lg border border-slate-100 bg-slate-50/80 space-y-1.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{r.name}</span>
                {getSeverityBadge(r.severity)}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="p-2 rounded bg-rose-50 text-rose-900 border border-rose-100">
                  <span className="text-[9px] uppercase font-bold text-rose-600 block">
                    Kích hoạt (Trigger)
                  </span>
                  <span>{r.entityId} {r.operator} {r.triggerValue}</span>
                </div>
                <div className="p-2 rounded bg-emerald-50 text-emerald-900 border border-emerald-100">
                  <span className="text-[9px] uppercase font-bold text-emerald-600 block">
                    Khôi phục (Clear Hysteresis)
                  </span>
                  <span>{r.entityId} {r.clearOperator} {r.clearValue}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                <span>Lọc nhiễu: {r.durationSec} giây liên tục</span>
                <span>Hành động: {r.action}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
