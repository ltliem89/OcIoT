import React, { useState } from 'react';
import {
  LayoutDashboard,
  Sprout,
  Camera,
  Bell,
  Cpu,
  Settings,
  History,
  FileSpreadsheet,
  MoreHorizontal,
  X,
  ChevronRight,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import type { TabId } from '../types.ts';
export type { TabId };

interface BottomNavProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  activeAlertCount?: number;
  onOpenConfigMode?: () => void;
  isConfigMode?: boolean;
}

export interface NavItemDef {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  activeClass: string;
}

// 5 primary tabs per V4 specification
export const PRIMARY_NAV_ITEMS: NavItemDef[] = [
  {
    id: 'overview',
    label: 'Tổng Quan',
    shortLabel: 'Tổng quan',
    icon: LayoutDashboard,
    colorClass: 'text-blue-600',
    activeClass: 'text-blue-700 font-bold',
  },
  {
    id: 'ecosystem',
    label: 'Hệ Sinh Thái',
    shortLabel: 'Sinh thái',
    icon: Sprout,
    colorClass: 'text-emerald-600',
    activeClass: 'text-emerald-700 font-bold',
  },
  {
    id: 'vision',
    label: 'AI Vision',
    shortLabel: 'Camera AI',
    icon: Camera,
    colorClass: 'text-purple-600',
    activeClass: 'text-purple-700 font-bold',
  },
  {
    id: 'alarms',
    label: 'Cảnh Báo',
    shortLabel: 'Cảnh báo',
    icon: Bell,
    colorClass: 'text-rose-600',
    activeClass: 'text-rose-700 font-bold',
  },
  {
    id: 'devices',
    label: 'Thiết Bị',
    shortLabel: 'Thiết bị',
    icon: Cpu,
    colorClass: 'text-slate-800',
    activeClass: 'text-slate-900 font-bold',
  },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  activeAlertCount = 0,
  onOpenConfigMode,
  isConfigMode = false,
}) => {
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);

  return (
    <>
      {/* ---------------------------------------------------------------------- */}
      {/* DESKTOP TOP/SIDEBAR HELPER BAR (md+ screens) */}
      {/* ---------------------------------------------------------------------- */}
      <nav className="hidden md:flex items-center justify-between bg-white border-b border-slate-200 px-4 py-2 shadow-xs sticky top-[57px] z-30">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id ||
              (item.id === 'overview' && activeTab === 'dashboard') ||
              (item.id === 'ecosystem' && activeTab === 'control');

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[40px] ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
                {item.id === 'alarms' && activeAlertCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                    {activeAlertCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              activeTab === 'history' || activeTab === 'charts'
                ? 'bg-indigo-50 text-indigo-700 font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Lịch Sử</span>
          </button>

          <button
            onClick={() => onSelectTab('sheets')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              activeTab === 'sheets'
                ? 'bg-emerald-50 text-emerald-700 font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Google Sheets</span>
          </button>

          <button
            onClick={() => onSelectTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-slate-900 text-white font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Cài Đặt & Lịch Sử</span>
          </button>

          {onOpenConfigMode && (
            <button
              onClick={onOpenConfigMode}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                isConfigMode
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
              }`}
            >
              <Settings className="w-3.5 h-3.5 text-amber-600" />
              <span>Cấu Hình</span>
            </button>
          )}
        </div>
      </nav>

      {/* ---------------------------------------------------------------------- */}
      {/* MOBILE BOTTOM NAVIGATION BAR (Fixed at bottom for 360-430px screens) */}
      {/* ---------------------------------------------------------------------- */}
      <nav
        aria-label="Điều hướng chính"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-1 py-1"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 6px)' }}
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id ||
              (item.id === 'overview' && activeTab === 'dashboard') ||
              (item.id === 'ecosystem' && activeTab === 'control');

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 px-0.5 rounded-lg transition-colors cursor-pointer min-h-[48px] ${
                  isActive ? 'text-blue-700 font-black' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`w-5 h-5 transition-transform ${
                      isActive ? 'scale-110 text-blue-700 stroke-[2.5]' : 'stroke-[1.8]'
                    }`}
                  />
                  {item.id === 'alarms' && activeAlertCount > 0 && (
                    <span className="absolute -top-1 -right-2.5 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center animate-pulse shadow-xs">
                      {activeAlertCount}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1 whitespace-nowrap leading-tight ${
                    isActive ? 'font-black text-blue-700' : 'font-semibold text-slate-500'
                  }`}
                >
                  {item.shortLabel}
                </span>
              </button>
            );
          })}

          {/* More menu button for secondary screens */}
          <button
            onClick={() => setIsMoreSheetOpen(true)}
            className="flex flex-col items-center justify-center flex-1 py-1.5 px-0.5 rounded-lg text-slate-500 hover:text-slate-800 cursor-pointer min-h-[48px]"
          >
            <MoreHorizontal className="w-5 h-5 stroke-[1.8]" />
            <span className="text-[10px] mt-1 font-semibold text-slate-500">Thêm</span>
          </button>
        </div>
      </nav>

      {/* ---------------------------------------------------------------------- */}
      {/* MOBILE MORE SHEET MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isMoreSheetOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end md:hidden">
          <div className="bg-white rounded-t-2xl p-5 shadow-2xl border-t border-slate-200 max-w-md mx-auto w-full space-y-4 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Tính Năng Khác</h3>
              <button
                onClick={() => setIsMoreSheetOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {onOpenConfigMode && (
                <button
                  onClick={() => {
                    setIsMoreSheetOpen(false);
                    onOpenConfigMode();
                  }}
                  className="w-full p-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 flex items-center justify-between text-left cursor-pointer min-h-[48px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center">
                      <Settings className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-amber-950 block">
                        Chế Độ Cấu Hình (Configuration Mode)
                      </span>
                      <span className="text-[10px] text-amber-700">
                        Chỉnh sửa cảm biến, Display Builder, ngưỡng và áp dụng phiên bản
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-700" />
                </button>
              )}

              <button
                onClick={() => {
                  onSelectTab('history');
                  setIsMoreSheetOpen(false);
                }}
                className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between text-left cursor-pointer min-h-[48px]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Lịch Sử & Đồ Thị (History & Charts)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Chuỗi thời gian TDS, độ ẩm và sự kiện hệ thống
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  onSelectTab('sheets');
                  setIsMoreSheetOpen(false);
                }}
                className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between text-left cursor-pointer min-h-[48px]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Đồng Bộ Google Sheets
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Báo cáo và trích xuất dữ liệu đám mây
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => {
                  onSelectTab('settings');
                  setIsMoreSheetOpen(false);
                }}
                className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 flex items-center justify-between text-left cursor-pointer min-h-[48px]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-900 text-emerald-400 flex items-center justify-center">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Cài Đặt Ngưỡng & Lịch Sử
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Tùy biến TDS, phao nước, chu kỳ và truy xuất lịch sử thay đổi
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <button
              onClick={() => setIsMoreSheetOpen(false)}
              className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-200 min-h-[44px]"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </>
  );
};
