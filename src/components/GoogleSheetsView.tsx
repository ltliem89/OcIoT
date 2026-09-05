import React, { useState } from 'react';
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
} from 'lucide-react';
import type { GoogleSheetsData } from '../types.ts';

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

  return (
    <div className="space-y-6 pb-20 sm:pb-6 max-w-5xl mx-auto">
      {/* Title Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-700">
            <FileSpreadsheet className="w-5 h-5 text-slate-800" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">
              Đồng Bộ Dữ Liệu Google Sheets
            </h2>
            <p className="text-xs text-slate-500">
              Tự động trích xuất Spreadsheet ID, kết nối dữ liệu đám mây và lưu trữ ngoại vi
            </p>
          </div>
        </div>

        <button
          onClick={handleUseDemoUrl}
          className="text-xs text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1 self-start sm:self-auto bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm cursor-pointer transition-colors"
        >
          <span>Dùng URL Sheet mẫu</span>
        </button>
      </div>

      {/* Connection Form: Exact Specification Layout */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
          Google Sheets
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="[ Paste Google Sheets URL ]"
                className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-400 transition-colors font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>[ CONNECT ] KẾT NỐI</span>
            </button>
          </div>
        </form>

        {/* Error notification */}
        {sheetsData?.error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{sheetsData.error}</span>
          </div>
        )}
      </div>

      {/* Connection Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Connected Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
              sheetsData?.connected
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-slate-100 text-slate-400'
            }`}
          >
            {sheetsData?.connected ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <XCircle className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Trạng Thái</p>
            <p className="text-sm font-semibold text-slate-900">
              {sheetsData?.connected ? 'Connected' : 'Disconnected'}
            </p>
          </div>
        </div>

        {/* Rows Count Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Số Hàng (Rows)</p>
            <p className="text-sm font-semibold text-slate-900 font-mono">
              {sheetsData?.rowsCount ?? 0} dòng
            </p>
          </div>
        </div>

        {/* Last Update Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cập Nhật Lần Cuối</p>
            <p className="text-sm font-semibold text-slate-900">
              {sheetsData?.lastUpdate
                ? new Date(sheetsData.lastUpdate).toLocaleTimeString('vi-VN')
                : 'Chưa cập nhật'}
            </p>
          </div>
        </div>
      </div>

      {/* Spreadsheet ID & Schema Info */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs text-slate-600">
            <span>Tự động trích xuất Spreadsheet ID: </span>
            <span className="font-mono text-slate-900 font-bold">
              {sheetsData?.spreadsheetId || 'Chưa có ID'}
            </span>
          </div>

          {sheetsData?.spreadsheetId && (
            <a
              href={`https://docs.google.com/spreadsheets/d/${sheetsData.spreadsheetId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-800 hover:text-slate-600 flex items-center gap-1 font-semibold"
            >
              Mở trên Google Sheets <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Suggested Header Spec */}
        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600">
          <p className="font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
            Định Dạng Tiêu Đề Cột Đề Xuất (Header Schema):
          </p>
          <code className="text-slate-900 font-mono text-[11px] block overflow-x-auto py-1">
            timestamp, tds, soil_moisture, float_low, float_high, pump1, pump2, buzzer
          </code>
          <p className="text-[11px] text-slate-500 mt-1">
            Hệ thống tự động lọc và xử lý: dữ liệu bị thiếu (missing data), định dạng số sai (invalid number), thời gian không hợp lệ (invalid timestamp) và ô trống (empty cells).
          </p>
        </div>
      </div>

      {/* Google Sheets Data Table Preview */}
      {sheetsData?.records && sheetsData.records.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Bản Xem Trước Dữ Liệu Google Sheets (Mới nhất)
            </h4>
            <span className="text-xs text-slate-500 font-mono">
              Hiển thị {sheetsData.records.length} dòng
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">timestamp</th>
                  <th className="py-2.5 px-3">tds</th>
                  <th className="py-2.5 px-3">soil_moisture</th>
                  <th className="py-2.5 px-3">float_low</th>
                  <th className="py-2.5 px-3">float_high</th>
                  <th className="py-2.5 px-3">pump1</th>
                  <th className="py-2.5 px-3">pump2</th>
                  <th className="py-2.5 px-3">buzzer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {sheetsData.records.slice(-10).map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-500 font-sans">
                      {new Date(r.timestamp).toLocaleTimeString('vi-VN')}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900">{r.tds ?? '--'}</td>
                    <td className="py-2 px-3 font-semibold text-emerald-700">{r.soil_moisture ?? '--'}%</td>
                    <td className="py-2 px-3">{r.float_low ? 'TRUE' : 'FALSE'}</td>
                    <td className="py-2 px-3">{r.float_high ? 'TRUE' : 'FALSE'}</td>
                    <td className="py-2 px-3">{r.pump1 ? 'ON' : 'OFF'}</td>
                    <td className="py-2 px-3">{r.pump2 ? 'ON' : 'OFF'}</td>
                    <td className="py-2 px-3">{r.buzzer ? 'ON' : 'OFF'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
