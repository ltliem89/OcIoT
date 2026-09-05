import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  LineChart as ChartIcon,
  Droplets,
  Sprout,
  Waves,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import type { SensorData } from '../types.ts';

interface ChartsViewProps {
  historyData: SensorData[];
  selectedRange: string;
  onSelectRange: (range: string) => void;
  isLoading: boolean;
}

export const ChartsView: React.FC<ChartsViewProps> = ({
  historyData,
  selectedRange,
  onSelectRange,
  isLoading,
}) => {
  // Format chart data
  const formattedData = historyData.map((d) => {
    const date = new Date(d.timestamp);
    const timeLabel =
      selectedRange === '7d' || selectedRange === '30d'
        ? `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:00`
        : date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    return {
      time: timeLabel,
      fullTime: date.toLocaleString('vi-VN'),
      tds: d.tds ?? 0,
      soil_moisture: d.soil_moisture ?? 0,
      float_low: d.float_low ? 1 : 0,
      float_high: d.float_high ? 1 : 0,
      pump1: d.pump1 ? 1 : 0,
      pump2: d.pump2 ? 1 : 0,
      buzzer: d.buzzer ? 1 : 0,
    };
  });

  // Calculate statistics for TDS
  const tdsValues = formattedData.map((d) => d.tds).filter((v) => v > 0);
  const tdsMin = tdsValues.length > 0 ? Math.min(...tdsValues) : 0;
  const tdsMax = tdsValues.length > 0 ? Math.max(...tdsValues) : 0;
  const tdsAvg = tdsValues.length > 0 ? Math.round(tdsValues.reduce((a, b) => a + b, 0) / tdsValues.length) : 0;

  let tdsTrend: 'up' | 'down' | 'stable' = 'stable';
  if (tdsValues.length >= 4) {
    const firstHalf = tdsValues.slice(0, Math.floor(tdsValues.length / 2));
    const secondHalf = tdsValues.slice(Math.floor(tdsValues.length / 2));
    const avg1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avg2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    if (avg2 - avg1 > 15) tdsTrend = 'up';
    else if (avg1 - avg2 > 15) tdsTrend = 'down';
  }

  // Calculate statistics for Soil Moisture
  const moistValues = formattedData.map((d) => d.soil_moisture).filter((v) => v > 0);
  const moistMin = moistValues.length > 0 ? Math.min(...moistValues) : 0;
  const moistMax = moistValues.length > 0 ? Math.max(...moistValues) : 0;
  const moistAvg = moistValues.length > 0 ? Math.round(moistValues.reduce((a, b) => a + b, 0) / moistValues.length) : 0;

  let moistTrend: 'up' | 'down' | 'stable' = 'stable';
  if (moistValues.length >= 4) {
    const firstHalf = moistValues.slice(0, Math.floor(moistValues.length / 2));
    const secondHalf = moistValues.slice(Math.floor(moistValues.length / 2));
    const avg1 = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avg2 = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    if (avg2 - avg1 > 3) moistTrend = 'up';
    else if (avg1 - avg2 > 3) moistTrend = 'down';
  }

  const RANGES = [
    { id: '1h', label: '1 Giờ' },
    { id: '6h', label: '6 Giờ' },
    { id: '24h', label: '24 Giờ' },
    { id: '7d', label: '7 Ngày' },
    { id: '30d', label: '30 Ngày' },
  ];

  return (
    <div className="space-y-6 pb-20 sm:pb-6">
      {/* Top Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-700">
            <ChartIcon className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">
              Biểu Đồ Quan Trắc Sinh Thái
            </h2>
            <p className="text-xs text-slate-500">
              Theo dõi biến thiên chất lượng nước, độ ẩm và tần suất bơm
            </p>
          </div>
        </div>

        {/* Time range tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto overflow-x-auto">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelectRange(r.id)}
              disabled={isLoading}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                selectedRange === r.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart 1: TDS (ppm) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">
              <Droplets className="w-3.5 h-3.5 text-cyan-600" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
              1. Biến Thiên Cảm Biến TDS (ppm)
            </h3>
          </div>

          {/* Min, Max, Avg, Trend stats */}
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-500">
              Min: <strong className="text-slate-900">{tdsMin}</strong>
            </span>
            <span className="text-slate-500">
              Max: <strong className="text-slate-900">{tdsMax}</strong>
            </span>
            <span className="text-slate-500">
              Trung bình: <strong className="text-slate-900">{tdsAvg} ppm</strong>
            </span>
            <span className="flex items-center gap-1 font-semibold">
              Xu hướng:
              {tdsTrend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-amber-600" />}
              {tdsTrend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-cyan-600" />}
              {tdsTrend === 'stable' && <Minus className="w-3.5 h-3.5 text-emerald-600" />}
              <span
                className={
                  tdsTrend === 'up'
                    ? 'text-amber-700'
                    : tdsTrend === 'down'
                    ? 'text-cyan-700'
                    : 'text-emerald-700'
                }
              >
                {tdsTrend === 'up' ? 'Tăng' : tdsTrend === 'down' ? 'Giảm' : 'Ổn định'}
              </span>
            </span>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tdsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} domain={['dataMin - 50', 'dataMax + 50']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  color: '#0f172a',
                }}
                formatter={(val: any) => [`${val} ppm`, 'TDS']}
              />
              <Area
                type="monotone"
                dataKey="tds"
                stroke="#0284c7"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#tdsGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Soil Moisture (%) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">
              <Sprout className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
              2. Độ Ẩm Đất Sinh Học (%)
            </h3>
          </div>

          {/* Min, Max, Avg, Trend stats */}
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-500">
              Min: <strong className="text-slate-900">{moistMin}%</strong>
            </span>
            <span className="text-slate-500">
              Max: <strong className="text-slate-900">{moistMax}%</strong>
            </span>
            <span className="text-slate-500">
              Trung bình: <strong className="text-slate-900">{moistAvg}%</strong>
            </span>
            <span className="flex items-center gap-1 font-semibold">
              Xu hướng:
              {moistTrend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />}
              {moistTrend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-amber-600" />}
              {moistTrend === 'stable' && <Minus className="w-3.5 h-3.5 text-cyan-600" />}
              <span
                className={
                  moistTrend === 'up'
                    ? 'text-emerald-700'
                    : moistTrend === 'down'
                    ? 'text-amber-700'
                    : 'text-cyan-700'
                }
              >
                {moistTrend === 'up' ? 'Tăng' : moistTrend === 'down' ? 'Giảm' : 'Ổn định'}
              </span>
            </span>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="moistGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#e2e8f0',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  color: '#0f172a',
                }}
                formatter={(val: any) => [`${val} %`, 'Độ ẩm']}
              />
              <Area
                type="monotone"
                dataKey="soil_moisture"
                stroke="#059669"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#moistGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Chart 3 (Water Level Sensors) & Chart 4 (Pump Activity) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 3: Water Status (Float LOW & HIGH) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
            <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">
              <Waves className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">
              3. Trạng Thái Phao Mực Nước (Float Low / High)
            </h3>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 1.2]} ticks={[0, 1]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    color: '#0f172a',
                  }}
                  formatter={(val: any, name: any) => [
                    val === 1 ? 'KÍCH HOẠT (1)' : 'NGẮT (0)',
                    name === 'float_low' ? 'Phao LOW' : 'Phao HIGH',
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Line
                  type="stepAfter"
                  dataKey="float_low"
                  name="Phao LOW (Nước đủ)"
                  stroke="#0284c7"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="stepAfter"
                  dataKey="float_high"
                  name="Phao HIGH (Nước đầy)"
                  stroke="#e11d48"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Pump Activity (Pump 1 & Pump 2) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100">
            <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-slate-800" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">
              4. Nhật Ký Hoạt Động Bơm (Pump 1 & Pump 2)
            </h3>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 1]} ticks={[0, 1]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    color: '#0f172a',
                  }}
                  formatter={(val: any, name: any) => [
                    val === 1 ? 'BẬT (ON)' : 'TẮT (OFF)',
                    name === 'pump1' ? 'Bơm 1 (Lọc bèo)' : 'Bơm 2 (Tưới đất)',
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="pump1" name="Bơm 1" fill="#0f172a" />
                <Bar dataKey="pump2" name="Bơm 2" fill="#0284c7" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
