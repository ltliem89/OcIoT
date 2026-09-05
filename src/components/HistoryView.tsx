import React, { useState } from 'react';
import {
  History,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
} from 'lucide-react';
import type { SensorData } from '../types.ts';

interface HistoryViewProps {
  historyData: SensorData[];
  selectedRange: string;
  onSelectRange: (range: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  historyData,
  selectedRange,
  onSelectRange,
  onRefresh,
  isLoading,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Filter records based on search term
  const filteredRecords = historyData.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const timeStr = new Date(r.timestamp).toLocaleString('vi-VN').toLowerCase();
    const tdsStr = r.tds?.toString() || '';
    const moistStr = r.soil_moisture?.toString() || '';
    return timeStr.includes(term) || tdsStr.includes(term) || moistStr.includes(term);
  });

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const displayedRecords = filteredRecords
    .slice()
    .reverse()
    .slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Export CSV function
  const handleExportCSV = () => {
    if (historyData.length === 0) return;
    const headers = [
      'timestamp',
      'tds',
      'soil_moisture',
      'float_low',
      'float_high',
      'pump1',
      'pump2',
      'buzzer',
    ];
    const rows = historyData.map((d) => [
      d.timestamp,
      d.tds ?? '',
      d.soil_moisture ?? '',
      d.float_low ? 1 : 0,
      d.float_high ? 1 : 0,
      d.pump1 ? 1 : 0,
      d.pump2 ? 1 : 0,
      d.buzzer ? 1 : 0,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ecosystem_history_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const RANGES = [
    { id: '1h', label: '1 Giờ' },
    { id: '6h', label: '6 Giờ' },
    { id: '24h', label: '24 Giờ' },
    { id: '7d', label: '7 Ngày' },
    { id: '30d', label: '30 Ngày' },
  ];

  return (
    <div className="space-y-5 pb-20 sm:pb-6">
      {/* Top Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-700">
            <History className="w-5 h-5 text-slate-800" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">
              Nhật Ký Lịch Sử Dữ Liệu
            </h2>
            <p className="text-xs text-slate-500">
              Tổng cộng {filteredRecords.length} bản ghi cảm biến IoT và trạng thái thiết bị
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            {RANGES.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  onSelectRange(r.id);
                  setCurrentPage(1);
                }}
                disabled={isLoading}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  selectedRange === r.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 cursor-pointer shadow-sm"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-slate-800' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3.5 py-2 shadow-sm">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm kiếm theo thời gian, chỉ số TDS hoặc độ ẩm..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="bg-transparent border-none text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-full"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Historical Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">TDS (ppm)</th>
                <th className="py-3 px-4">Độ ẩm đất (%)</th>
                <th className="py-3 px-4">Phao LOW</th>
                <th className="py-3 px-4">Phao HIGH</th>
                <th className="py-3 px-4">Bơm 1</th>
                <th className="py-3 px-4">Bơm 2</th>
                <th className="py-3 px-4">Buzzer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {displayedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    Không có bản ghi nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                displayedRecords.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 text-slate-500 font-sans whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {item.tds ?? '--'}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-emerald-700">
                      {item.soil_moisture ?? '--'}%
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-sans font-medium border ${
                          item.float_low
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {item.float_low ? 'ON' : 'OFF'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-sans font-medium border ${
                          item.float_high
                            ? 'bg-sky-50 text-sky-700 border-sky-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                      >
                        {item.float_high ? 'ON' : 'OFF'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-sans font-semibold ${
                          item.pump1
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.pump1 ? 'ON' : 'OFF'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-sans font-semibold ${
                          item.pump2
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.pump2 ? 'ON' : 'OFF'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-sans font-semibold ${
                          item.buzzer
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.buzzer ? 'ON' : 'OFF'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-sans">
          <span>
            Trang {currentPage} / {totalPages} ({filteredRecords.length} bản ghi)
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer shadow-sm"
            >
              <ChevronLeft className="w-4 h-4 text-slate-700" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer shadow-sm"
            >
              <ChevronRight className="w-4 h-4 text-slate-700" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
