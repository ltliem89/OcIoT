import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Save,
  Plus,
  Trash2,
  Eye,
  Check,
  History,
  Layers,
  Cpu,
  Droplets,
  Palette,
  ShieldAlert,
  Camera,
  X,
  ArrowLeft,
  FileText,
  AlertCircle,
  Clock,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import type {
  Project,
  Zone,
  SensorConfig,
  ActuatorConfig,
  AlarmRule,
  ProjectConfigSnapshot,
  ConfigVersion,
  AuditLogItem,
  DisplayType,
  DataType,
  ActuatorType,
  AlarmSeverity,
  AlarmOperator,
} from '../types.ts';
import { checkContrast, autoFixContrast } from '../lib/v4ConfigDefaults.ts';

interface ConfigModeViewProps {
  project: Project;
  zones: Zone[];
  sensors: SensorConfig[];
  actuators: ActuatorConfig[];
  alarmRules: AlarmRule[];
  activeVersion: ConfigVersion;
  versions: ConfigVersion[];
  auditLogs: AuditLogItem[];
  onApplyConfig: (snapshot: ProjectConfigSnapshot, description?: string) => Promise<any>;
  onRollback: (targetVersion: number) => Promise<any>;
  onExitConfigMode: () => void;
  isLoading?: boolean;
}

export const ConfigModeView: React.FC<ConfigModeViewProps> = ({
  project,
  zones: initialZones,
  sensors: initialSensors,
  actuators: initialActuators,
  alarmRules: initialRules,
  activeVersion,
  versions,
  auditLogs,
  onApplyConfig,
  onRollback,
  onExitConfigMode,
  isLoading,
}) => {
  // Working draft state
  const [draftSensors, setDraftSensors] = useState<SensorConfig[]>(initialSensors);
  const [draftActuators, setDraftActuators] = useState<ActuatorConfig[]>(initialActuators);
  const [draftRules, setDraftRules] = useState<AlarmRule[]>(initialRules);
  const [draftZones, setDraftZones] = useState<Zone[]>(initialZones);

  const [hasChanges, setHasChanges] = useState(false);
  const [selectedSubTab, setSelectedSubTab] = useState<
    'display' | 'sensors' | 'actuators' | 'zones' | 'alarms' | 'versions' | 'audit'
  >('display');

  // Display Builder selection
  const [editingSensorId, setEditingSensorId] = useState<string>(draftSensors[0]?.id || 'sens_tds');
  const activeEditingSensor = draftSensors.find((s) => s.id === editingSensorId) || draftSensors[0];

  // Validation modal state
  const [validationResult, setValidationResult] = useState<{
    isOpen: boolean;
    valid: boolean;
    errors: string[];
    warnings: string[];
  }>({ isOpen: false, valid: true, errors: [], warnings: [] });

  // Apply dialog state
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [applyDescription, setApplyDescription] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  // Rollback confirmation dialog
  const [rollbackTarget, setRollbackTarget] = useState<number | null>(null);

  // Unsaved changes confirmation dialog
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Track changes
  const markChanged = () => {
    setHasChanges(true);
  };

  // Contrast calculation for editing sensor
  const contrastInfo = activeEditingSensor
    ? checkContrast(activeEditingSensor.textColor, activeEditingSensor.bgColor)
    : { ratio: 5, isAccessible: true, score: 'AA' as const };

  const handleUpdateEditingSensor = (updates: Partial<SensorConfig>) => {
    setDraftSensors((prev) =>
      prev.map((s) => (s.id === editingSensorId ? { ...s, ...updates } : s))
    );
    markChanged();
  };

  const handleAutoFixContrast = () => {
    if (!activeEditingSensor) return;
    const fixed = autoFixContrast(activeEditingSensor.bgColor);
    handleUpdateEditingSensor({ textColor: fixed.textColor });
  };

  // Run validation
  const handleValidate = () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check unique dataKey in sensors
    const sensorKeys = new Set<string>();
    draftSensors.forEach((s) => {
      if (!s.dataKey) errors.push(`Cảm biến "${s.name}" thiếu dataKey`);
      else if (sensorKeys.has(s.dataKey)) errors.push(`Trùng lặp dataKey cảm biến: "${s.dataKey}"`);
      else sensorKeys.add(s.dataKey);

      if (s.min >= s.max) errors.push(`Cảm biến "${s.name}": Ngưỡng min (${s.min}) phải nhỏ hơn max (${s.max})`);

      const contrast = checkContrast(s.textColor, s.bgColor);
      if (!contrast.isAccessible) {
        warnings.push(`Cảm biến "${s.name}": Độ tương phản (${contrast.ratio}:1) chưa đạt chuẩn WCAG AA 4.5:1`);
      }
    });

    // Check actuators
    const actKeys = new Set<string>();
    draftActuators.forEach((a) => {
      if (!a.dataKey) errors.push(`Chấp hành "${a.name}" thiếu dataKey`);
      else if (actKeys.has(a.dataKey)) errors.push(`Trùng lặp dataKey chấp hành: "${a.dataKey}"`);
      else actKeys.add(a.dataKey);
    });

    setValidationResult({
      isOpen: true,
      valid: errors.length === 0,
      errors,
      warnings,
    });
  };

  // Execute Save & Apply
  const handleConfirmApply = async () => {
    setIsApplying(true);
    try {
      const snapshot: ProjectConfigSnapshot = {
        project: { ...project, activeConfigVersion: project.activeConfigVersion + 1 },
        zones: draftZones,
        sensors: draftSensors,
        actuators: draftActuators,
        alarmRules: draftRules,
        aiConfig: activeVersion.snapshot?.aiConfig || {
          cameraStreamUrl: '',
          detectionScheduleSec: 30,
          roi: { x: 10, y: 15, width: 80, height: 70 },
          duckweedCoverageTarget: 75,
          snailEggsMinWarning: 2,
          sensitivity: 'medium',
        },
        esp32Config: activeVersion.snapshot?.esp32Config || {
          samplingRateSec: 2,
          reportIntervalSec: 5,
          waterFloatDebounceSec: 3,
          floatLowCutoffPump1: true,
          pump1MaxMinutes: 30,
          pump2DurationSec: 45,
          pump2RestMinutes: 15,
        },
      };

      await onApplyConfig(snapshot, applyDescription.trim() || undefined);
      setHasChanges(false);
      setIsApplyDialogOpen(false);
      setApplyDescription('');
      alert('Đã lưu & áp dụng cấu hình mới thành công! Hệ thống đang chạy theo ACTIVE CONFIG mới.');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi áp dụng cấu hình');
    } finally {
      setIsApplying(false);
    }
  };

  const handleRollbackConfirm = async (targetVer: number) => {
    try {
      await onRollback(targetVer);
      setRollbackTarget(null);
      alert(`Đã rollback thành công về cấu hình phiên bản v${targetVer}!`);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi rollback');
    }
  };

  const handleDiscardChanges = () => {
    if (confirm('Bạn có chắc muốn hủy tất cả các thay đổi trong bản nháp này?')) {
      setDraftSensors(initialSensors);
      setDraftActuators(initialActuators);
      setDraftRules(initialRules);
      setDraftZones(initialZones);
      setHasChanges(false);
    }
  };

  const handleAttemptExit = () => {
    if (hasChanges) {
      setShowExitConfirm(true);
    } else {
      onExitConfigMode();
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Configuration Mode Top Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                <Settings className="w-5 h-5 text-amber-400" />
                <span>CHẾ ĐỘ CẤU HÌNH (CONFIGURATION MODE)</span>
              </h2>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-300 font-mono">
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                ACTIVE CONFIG: v{project.activeConfigVersion}
              </span>
              {hasChanges ? (
                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold flex items-center gap-1 animate-pulse">
                  ● DRAFT (Có thay đổi chưa áp dụng)
                </span>
              ) : (
                <span className="text-slate-400">Không có thay đổi tồn đọng</span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleValidate}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 cursor-pointer min-h-[44px]"
            >
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Kiểm Tra (Validate)</span>
            </button>

            {hasChanges && (
              <button
                onClick={handleDiscardChanges}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer min-h-[44px]"
              >
                Hủy nháp
              </button>
            )}

            <button
              onClick={() => setIsApplyDialogOpen(true)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              <span>Lưu & Áp Dụng (Apply)</span>
            </button>

            <button
              onClick={handleAttemptExit}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 cursor-pointer min-h-[44px] flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Thoát Cấu Hình</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-800 overflow-x-auto no-scrollbar text-xs font-bold">
          <button
            onClick={() => setSelectedSubTab('display')}
            className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors cursor-pointer min-h-[36px] flex items-center gap-1.5 ${
              selectedSubTab === 'display'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Trình Tạo Hiển Thị (Display Builder)</span>
          </button>
          <button
            onClick={() => setSelectedSubTab('sensors')}
            className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors cursor-pointer min-h-[36px] flex items-center gap-1.5 ${
              selectedSubTab === 'sensors'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>Cảm Biến ({draftSensors.length})</span>
          </button>
          <button
            onClick={() => setSelectedSubTab('actuators')}
            className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors cursor-pointer min-h-[36px] flex items-center gap-1.5 ${
              selectedSubTab === 'actuators'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Cơ Cấu Chấp Hành ({draftActuators.length})</span>
          </button>
          <button
            onClick={() => setSelectedSubTab('zones')}
            className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors cursor-pointer min-h-[36px] flex items-center gap-1.5 ${
              selectedSubTab === 'zones'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Vùng Sinh Thái (5)</span>
          </button>
          <button
            onClick={() => setSelectedSubTab('alarms')}
            className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors cursor-pointer min-h-[36px] flex items-center gap-1.5 ${
              selectedSubTab === 'alarms'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Quy Tắc Cảnh Báo ({draftRules.length})</span>
          </button>
          <button
            onClick={() => setSelectedSubTab('versions')}
            className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors cursor-pointer min-h-[36px] flex items-center gap-1.5 ${
              selectedSubTab === 'versions'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Phiên Bản & Rollback ({versions.length})</span>
          </button>
          <button
            onClick={() => setSelectedSubTab('audit')}
            className={`px-3 py-2 rounded-lg whitespace-nowrap transition-colors cursor-pointer min-h-[36px] flex items-center gap-1.5 ${
              selectedSubTab === 'audit'
                ? 'bg-amber-500 text-slate-950 font-black'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Nhật Ký Kiểm Toán (Audit)</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 1. DISPLAY BUILDER WITH LIVE PREVIEW & CONTRAST CHECK */}
      {/* ---------------------------------------------------------------------- */}
      {selectedSubTab === 'display' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Controls Left Column */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-500" />
                <span>Tùy Biến Thẻ Đo & Trực Quan Hóa (Display Builder)</span>
              </h3>
              <select
                value={editingSensorId}
                onChange={(e) => setEditingSensorId(e.target.value)}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-800 cursor-pointer"
              >
                {draftSensors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.dataKey})
                  </option>
                ))}
              </select>
            </div>

            {activeEditingSensor && (
              <div className="space-y-3.5 text-xs">
                {/* Name & Unit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tên Hiển Thị</label>
                    <input
                      type="text"
                      value={activeEditingSensor.name}
                      onChange={(e) => handleUpdateEditingSensor({ name: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Đơn Vị Đo (Unit)</label>
                    <input
                      type="text"
                      value={activeEditingSensor.unit}
                      onChange={(e) => handleUpdateEditingSensor({ unit: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium font-mono"
                    />
                  </div>
                </div>

                {/* Display Type */}
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Kiểu Hiển Thị (Display Type)
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['VALUE', 'STATUS', 'PROGRESS', 'ICON_VALUE'] as DisplayType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleUpdateEditingSensor({ displayType: type })}
                        className={`py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          activeEditingSensor.displayType === type
                            ? 'bg-amber-500 text-slate-900 border-amber-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Typography: Font size (12-64px) & Weight */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between font-bold text-slate-700 mb-1">
                      <span>Cỡ Chữ (Font Size)</span>
                      <span className="font-mono text-amber-600">{activeEditingSensor.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={14}
                      max={48}
                      value={activeEditingSensor.fontSize}
                      onChange={(e) => handleUpdateEditingSensor({ fontSize: Number(e.target.value) })}
                      className="w-full cursor-pointer accent-amber-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Độ Đậm Chữ (Weight)</label>
                    <select
                      value={activeEditingSensor.fontWeight}
                      onChange={(e) => handleUpdateEditingSensor({ fontWeight: e.target.value as any })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 font-medium"
                    >
                      <option value="normal">Normal</option>
                      <option value="medium">Medium</option>
                      <option value="semibold">Semibold</option>
                      <option value="bold">Bold</option>
                      <option value="black">Black (Siêu đậm)</option>
                    </select>
                  </div>
                </div>

                {/* Color Palette & WCAG Contrast Check */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Màu Chữ (Text Color)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={activeEditingSensor.textColor}
                        onChange={(e) => handleUpdateEditingSensor({ textColor: e.target.value })}
                        className="w-9 h-9 rounded border border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={activeEditingSensor.textColor}
                        onChange={(e) => handleUpdateEditingSensor({ textColor: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Màu Nền (Background)</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={activeEditingSensor.bgColor}
                        onChange={(e) => handleUpdateEditingSensor({ bgColor: e.target.value })}
                        className="w-9 h-9 rounded border border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={activeEditingSensor.bgColor}
                        onChange={(e) => handleUpdateEditingSensor({ bgColor: e.target.value })}
                        className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Contrast Warning & Auto-Fix */}
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                    contrastInfo.isAccessible
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {contrastInfo.isAccessible ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold block">
                        Độ tương phản WCAG: {contrastInfo.ratio}:1 ({contrastInfo.score})
                      </span>
                      <span className="text-[11px]">
                        {contrastInfo.isAccessible
                          ? 'Đạt chuẩn tiếp cận WCAG AA (≥ 4.5:1), mắt người đọc rõ ràng.'
                          : '⚠ Độ tương phản quá thấp, khó đọc trên màn hình điện thoại!'}
                      </span>
                    </div>
                  </div>

                  {!contrastInfo.isAccessible && (
                    <button
                      type="button"
                      onClick={handleAutoFixContrast}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer shadow-xs"
                    >
                      Tự sửa màu
                    </button>
                  )}
                </div>

                {/* Visibility Toggles */}
                <div className="flex items-center gap-4 pt-1 font-semibold text-slate-700">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeEditingSensor.showOnOverview}
                      onChange={(e) =>
                        handleUpdateEditingSensor({ showOnOverview: e.target.checked })
                      }
                      className="rounded accent-amber-500 w-4 h-4"
                    />
                    <span>Hiện trên Tổng quan</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeEditingSensor.showOnMobile}
                      onChange={(e) =>
                        handleUpdateEditingSensor({ showOnMobile: e.target.checked })
                      }
                      className="rounded accent-amber-500 w-4 h-4"
                    />
                    <span>Tối ưu Mobile 360-430px</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Live Preview Right Column */}
          <div className="lg:col-span-5 bg-slate-100 border border-slate-300 rounded-xl p-4 shadow-inner flex flex-col items-center justify-center min-h-[300px]">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>Xem Trước Trực Tiếp (Live Card Preview)</span>
            </span>

            {/* Simulated Live Card */}
            {activeEditingSensor && (
              <div
                className="w-full max-w-xs rounded-xl p-5 border shadow-sm transition-all"
                style={{
                  backgroundColor: activeEditingSensor.bgColor,
                  color: activeEditingSensor.textColor,
                  borderColor: activeEditingSensor.textColor + '33',
                }}
              >
                <div className="flex items-center justify-between mb-2 opacity-80">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {activeEditingSensor.name}
                  </span>
                  <Droplets className="w-5 h-5" />
                </div>

                <div
                  className="font-mono tracking-tight my-1"
                  style={{
                    fontSize: `${activeEditingSensor.fontSize}px`,
                    fontWeight:
                      activeEditingSensor.fontWeight === 'black'
                        ? 900
                        : activeEditingSensor.fontWeight === 'bold'
                        ? 700
                        : activeEditingSensor.fontWeight === 'semibold'
                        ? 600
                        : 400,
                  }}
                >
                  {activeEditingSensor.dataKey === 'tds'
                    ? '450'
                    : activeEditingSensor.dataKey === 'soil_moisture'
                    ? '68'
                    : activeEditingSensor.dataKey === 'duckweed_coverage'
                    ? '76'
                    : '5'}{' '}
                  <span className="text-sm font-sans font-bold opacity-75">
                    {activeEditingSensor.unit}
                  </span>
                </div>

                {activeEditingSensor.displayType === 'PROGRESS' && (
                  <div className="w-full bg-black/10 rounded-full h-2.5 mt-3 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        backgroundColor: activeEditingSensor.textColor,
                        width: '68%',
                      }}
                    />
                  </div>
                )}

                <div className="mt-3 pt-2 border-t border-black/10 flex items-center justify-between text-[10px] opacity-75">
                  <span>Khoảng: {activeEditingSensor.min} - {activeEditingSensor.max}</span>
                  <span className="font-bold">Độ tương phản: {contrastInfo.ratio}:1</span>
                </div>
              </div>
            )}

            <span className="text-[11px] text-slate-400 mt-3 text-center">
              Mọi thay đổi sẽ được áp dụng ngay trên thẻ Tổng Quan sau khi nhấn <strong>Lưu & Áp Dụng</strong>.
            </span>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 2. SENSORS BUILDER */}
      {/* ---------------------------------------------------------------------- */}
      {selectedSubTab === 'sensors' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Danh Mục Cảm Biến Hệ Sinh Thái</h3>
              <p className="text-xs text-slate-500">Khai báo dataKey, kiểu dữ liệu và gán vùng sinh thái</p>
            </div>
            <button
              onClick={() => {
                const newSensor: SensorConfig = {
                  id: `sens_${Date.now()}`,
                  projectId: project.id,
                  name: 'Cảm Biến Mới',
                  dataKey: `sensor_${draftSensors.length + 1}`,
                  dataType: 'number',
                  unit: 'ppm',
                  displayType: 'VALUE',
                  icon: 'Droplets',
                  textColor: '#0f172a',
                  bgColor: '#f8fafc',
                  fontSize: 26,
                  fontWeight: 'bold',
                  decimalPlaces: 0,
                  min: 0,
                  max: 1000,
                  zoneId: 'zone_water',
                  visible: true,
                  showOnOverview: true,
                  showOnMobile: true,
                  order: draftSensors.length + 1,
                };
                setDraftSensors([...draftSensors, newSensor]);
                markChanged();
              }}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Cảm Biến</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Tên Hiển Thị</th>
                  <th className="py-2.5 px-3">dataKey</th>
                  <th className="py-2.5 px-3">Kiểu Dữ Liệu</th>
                  <th className="py-2.5 px-3">Đơn Vị</th>
                  <th className="py-2.5 px-3">Vùng</th>
                  <th className="py-2.5 px-3 text-right">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {draftSensors.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{s.name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{s.dataKey}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">{s.dataType}</td>
                    <td className="py-2.5 px-3">{s.unit || '--'}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-600">{s.zoneId}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => {
                          setDraftSensors(draftSensors.filter((x) => x.id !== s.id));
                          markChanged();
                        }}
                        className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                        title="Xóa cảm biến"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 3. ACTUATORS BUILDER */}
      {/* ---------------------------------------------------------------------- */}
      {selectedSubTab === 'actuators' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Cơ Cấu Chấp Hành (Actuators)</h3>
              <p className="text-xs text-slate-500">
                Rơ-le máy bơm, còi và thời gian ngắt an toàn tự động (Safe State & Cutoff)
              </p>
            </div>
            <button
              onClick={() => {
                const newAct: ActuatorConfig = {
                  id: `act_${Date.now()}`,
                  projectId: project.id,
                  deviceId: 'ESP32S3_ECO_01',
                  zoneId: 'zone_water',
                  name: 'Chấp Hành Mới',
                  dataKey: `relay_${draftActuators.length + 1}`,
                  type: 'relay',
                  activeState: true,
                  safeState: false,
                  maxRuntimeSec: 600,
                  visible: true,
                  order: draftActuators.length + 1,
                };
                setDraftActuators([...draftActuators, newAct]);
                markChanged();
              }}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Chấp Hành</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {draftActuators.map((act) => (
              <div
                key={act.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{act.name}</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                      key: {act.dataKey}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      {act.type}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Vùng: {act.zoneId} • Giới hạn chạy an toàn tối đa: {act.maxRuntimeSec} giây
                  </span>
                </div>

                <button
                  onClick={() => {
                    setDraftActuators(draftActuators.filter((x) => x.id !== act.id));
                    markChanged();
                  }}
                  className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 4. ZONES BUILDER */}
      {/* ---------------------------------------------------------------------- */}
      {selectedSubTab === 'zones' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">5 Phân Vùng Sinh Thái Tuần Hoàn</h3>
            <p className="text-xs text-slate-500">Mỗi vùng nhóm các cảm biến và máy bơm liên quan</p>
          </div>

          <div className="space-y-2">
            {draftZones.map((z) => (
              <div
                key={z.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center gap-3 text-xs"
              >
                <span className="text-2xl">{z.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{z.name}</span>
                    <span className="font-mono text-[10px] text-slate-500">({z.id})</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{z.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 5. ALARM BUILDER */}
      {/* ---------------------------------------------------------------------- */}
      {selectedSubTab === 'alarms' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Quy Tắc Cảnh Báo Có Hysteresis (Alarm Builder)
              </h3>
              <p className="text-xs text-slate-500">
                Tránh hiện tượng còi hú bật/tắt liên tục khi chỉ số dao động sát ngưỡng
              </p>
            </div>
            <button
              onClick={() => {
                const newRule: AlarmRule = {
                  id: `rule_${Date.now()}`,
                  projectId: project.id,
                  entityId: 'tds',
                  name: 'Quy Tắc Mới',
                  enabled: true,
                  operator: '>',
                  triggerValue: 700,
                  clearOperator: '<',
                  clearValue: 650,
                  durationSec: 10,
                  severity: 'WARNING',
                  message: 'Cảnh báo chỉ số vượt ngưỡng',
                  action: 'SHOW_IN_APP',
                };
                setDraftRules([...draftRules, newRule]);
                markChanged();
              }}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Quy Tắc</span>
            </button>
          </div>

          <div className="space-y-3">
            {draftRules.map((rule) => (
              <div
                key={rule.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/80 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{rule.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      {rule.severity}
                    </span>
                    <button
                      onClick={() => {
                        setDraftRules(draftRules.filter((r) => r.id !== rule.id));
                        markChanged();
                      }}
                      className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded bg-rose-50 text-rose-900 border border-rose-200">
                    <span className="font-bold block uppercase text-[9px] text-rose-600">
                      Điều kiện kích hoạt (Trigger)
                    </span>
                    <span>{rule.entityId} {rule.operator} {rule.triggerValue}</span>
                  </div>
                  <div className="p-2 rounded bg-emerald-50 text-emerald-900 border border-emerald-200">
                    <span className="font-bold block uppercase text-[9px] text-emerald-600">
                      Điều kiện khôi phục (Clear Hysteresis)
                    </span>
                    <span>{rule.entityId} {rule.clearOperator} {rule.clearValue}</span>
                  </div>
                </div>

                <span className="text-[11px] text-slate-600 block">
                  Nội dung thông báo: "{rule.message}" • Lọc nhiễu: {rule.durationSec}s
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 6. VERSIONS & ROLLBACK */}
      {/* ---------------------------------------------------------------------- */}
      {selectedSubTab === 'versions' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Lịch Sử Phiên Bản Cấu Hình & Rollback
            </h3>
            <p className="text-xs text-slate-500">
              Mỗi lần Áp Dụng sẽ tạo một phiên bản snapshot bất biến (Immutable Version)
            </p>
          </div>

          <div className="space-y-3">
            {versions.map((ver) => {
              const isActive = ver.version === project.activeConfigVersion;
              return (
                <div
                  key={ver.version}
                  className={`p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900">
                          Phiên Bản v{ver.version}
                        </span>
                        {isActive ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700">
                            ARCHIVED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{ver.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500 font-mono">
                        <span>Tạo bởi: {ver.createdBy}</span>
                        <span>•</span>
                        <span>{new Date(ver.createdAt).toLocaleString('vi-VN')}</span>
                      </div>
                    </div>

                    {!isActive && (
                      <button
                        onClick={() => setRollbackTarget(ver.version)}
                        className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer min-h-[44px] shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Rollback Về v{ver.version}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 7. AUDIT LOG */}
      {/* ---------------------------------------------------------------------- */}
      {selectedSubTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              Nhật Ký Kiểm Toán Thay Đổi (Audit Trail)
            </h3>
            <p className="text-xs text-slate-500">
              Ghi nhận chi tiết ai làm gì, vào thời gian nào và phiên bản cấu hình tương ứng
            </p>
          </div>

          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg border border-slate-100 bg-slate-50/80 flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{log.who}</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-600">
                      v{log.configVersion}
                    </span>
                  </div>
                  <p className="text-slate-700 mt-1">{log.what}</p>
                </div>

                <span className="text-[11px] text-slate-400 font-mono shrink-0">
                  {new Date(log.when).toLocaleTimeString('vi-VN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* VALIDATION RESULTS MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {validationResult.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {validationResult.valid ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                )}
                <h3 className="text-base font-bold text-slate-900">
                  {validationResult.valid ? 'Kiểm Tra Cấu Hình Hợp Lệ!' : 'Phát Hiện Lỗi Cấu Hình'}
                </h3>
              </div>
              <button
                onClick={() => setValidationResult({ ...validationResult, isOpen: false })}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {validationResult.errors.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-rose-700 block uppercase">
                  Lỗi Bắt Buộc Sửa ({validationResult.errors.length}):
                </span>
                {validationResult.errors.map((err, i) => (
                  <div key={i} className="p-2 rounded bg-rose-50 text-rose-800 text-xs border border-rose-200">
                    • {err}
                  </div>
                ))}
              </div>
            )}

            {validationResult.warnings.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-amber-700 block uppercase">
                  Cảnh Báo Khuyến Nghị ({validationResult.warnings.length}):
                </span>
                {validationResult.warnings.map((warn, i) => (
                  <div key={i} className="p-2 rounded bg-amber-50 text-amber-800 text-xs border border-amber-200">
                    • {warn}
                  </div>
                ))}
              </div>
            )}

            {validationResult.valid && validationResult.warnings.length === 0 && (
              <p className="text-xs text-slate-600">
                Toàn bộ định danh dataKey, giới hạn ngưỡng và độ tương phản màu sắc đều đạt tiêu chuẩn an toàn. Bạn có thể tiến hành <strong>Lưu & Áp Dụng</strong>.
              </p>
            )}

            <button
              onClick={() => setValidationResult({ ...validationResult, isOpen: false })}
              className="w-full py-2.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer min-h-[44px]"
            >
              Đã Hiểu
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* APPLY CONFIG DIALOG */}
      {/* ---------------------------------------------------------------------- */}
      {isApplyDialogOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2">
              <Save className="w-5 h-5 text-emerald-600" />
              <h3 className="text-base font-black text-slate-900">
                Lưu & Kích Hoạt Phiên Bản v{project.activeConfigVersion + 1}
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              Cấu hình mới sẽ trở thành <strong>ACTIVE CONFIG</strong> và được tự động đồng bộ xuống phần cứng ESP32-S3 và camera AI Vision.
            </p>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Ghi chú mô tả thay đổi (Tùy chọn):
              </label>
              <textarea
                rows={2}
                value={applyDescription}
                onChange={(e) => setApplyDescription(e.target.value)}
                placeholder="VD: Điều chỉnh font thẻ TDS, tăng ngưỡng độ ẩm giá thể lên 50%..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsApplyDialogOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer min-h-[44px]"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmApply}
                disabled={isApplying}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer min-h-[44px] flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Xác Nhận Áp Dụng Ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* ROLLBACK CONFIRMATION MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {rollbackTarget !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <RotateCcw className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">
                Xác Nhận Rollback Về Phiên Bản v{rollbackTarget}
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              Hệ thống sẽ tạo phiên bản mới v{project.activeConfigVersion + 1} với nội dung phục hồi hoàn toàn từ snapshot của phiên bản v{rollbackTarget}. ESP32 sẽ lập tức tải lại cấu hình này.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRollbackTarget(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer min-h-[44px]"
              >
                Hủy
              </button>
              <button
                onClick={() => handleRollbackConfirm(rollbackTarget)}
                className="px-5 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer min-h-[44px]"
              >
                Tiến Hành Rollback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* EXIT WITHOUT SAVING CONFIRMATION */}
      {/* ---------------------------------------------------------------------- */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">
                Bạn Có Thay Đổi Bản Nháp Chưa Áp Dụng!
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              Nếu thoát ngay bây giờ mà không Lưu & Áp Dụng, các thay đổi trong phiên làm việc này sẽ bị hủy bỏ và hệ thống tiếp tục chạy theo phiên bản Active cũ.
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  setIsApplyDialogOpen(true);
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer min-h-[44px]"
              >
                Lưu & Áp Dụng Ngay
              </button>
              <button
                onClick={() => {
                  setShowExitConfirm(false);
                  onExitConfigMode();
                }}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 cursor-pointer min-h-[44px]"
              >
                Hủy Bỏ Thay Đổi & Thoát
              </button>
              <button
                onClick={() => setShowExitConfirm(false)}
                className="w-full py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Tiếp Tục Chỉnh Sửa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
