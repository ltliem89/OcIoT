import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Cpu,
  Plus,
  Wifi,
  WifiOff,
  Key,
  RotateCw,
  Trash2,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Server,
  Layers,
  Sparkles,
  ExternalLink,
  Code,
  FileCode,
  Terminal,
  Download,
  BookOpen,
} from 'lucide-react';
import type { Device, ProvisioningResult, Template } from '../types.ts';
import { DEFAULT_TEMPLATES } from '../lib/v4ConfigDefaults.ts';

interface DevicesProvisioningViewProps {
  devices: Device[];
  onProvisionDevice: (payload: {
    name: string;
    deviceId?: string;
    templateId?: string;
  }) => Promise<ProvisioningResult>;
  onRotateKey: (deviceId: string) => Promise<{ newDeviceKey: string; keyVersion: number }>;
  onRevokeKey: (deviceId: string) => Promise<any>;
  onRefresh: () => void;
  isLoading?: boolean;
}

export const DevicesProvisioningView: React.FC<DevicesProvisioningViewProps> = ({
  devices,
  onProvisionDevice,
  onRotateKey,
  onRevokeKey,
  onRefresh,
  isLoading,
}) => {
  // Wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);

  const [deviceName, setDeviceName] = useState('');
  const [customDeviceId, setCustomDeviceId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('tmpl_aquaponics_v1');

  const [provisioningResult, setProvisioningResult] = useState<ProvisioningResult | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Key rotate state
  const [rotatedKeyModal, setRotatedKeyModal] = useState<{
    deviceId: string;
    newKey: string;
    keyVersion: number;
  } | null>(null);

  // Firmware & Vision code export modal state
  const [isFirmwareModalOpen, setIsFirmwareModalOpen] = useState(false);
  const [firmwareTab, setFirmwareTab] = useState<'esp32' | 'vision' | 'pinout'>('esp32');
  const [firmwareCode, setFirmwareCode] = useState<string>('');
  const [visionCode, setVisionCode] = useState<string>('');
  const [selectedDeviceForFw, setSelectedDeviceForFw] = useState<string>(
    devices[0]?.id || 'ESP32S3_ECO_01'
  );
  const [isLoadingCode, setIsLoadingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleOpenFirmwareModal = async (targetDeviceId?: string) => {
    const devId = targetDeviceId || selectedDeviceForFw || devices[0]?.id || 'ESP32S3_ECO_01';
    setSelectedDeviceForFw(devId);
    setIsFirmwareModalOpen(true);
    setIsLoadingCode(true);

    try {
      const [sketchRes, visionRes] = await Promise.all([
        fetch(`/api/v1/devices/${devId}/firmware-sketch`).then((r) => r.json()).catch(() => null),
        fetch('/api/v1/vision/python-client').then((r) => r.json()).catch(() => null),
      ]);

      if (sketchRes?.sketch) setFirmwareCode(sketchRes.sketch);
      if (visionRes?.script) setVisionCode(visionRes.script);
    } catch (err) {
      console.error('Failed to load code templates:', err);
    } finally {
      setIsLoadingCode(false);
    }
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generate QR code whenever provisioningResult is available
  useEffect(() => {
    if (provisioningResult?.qrPayload) {
      QRCode.toDataURL(provisioningResult.qrPayload, {
        width: 240,
        margin: 1.5,
        color: { dark: '#0f172a', light: '#ffffff' },
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('QR generation error:', err));
    }
  }, [provisioningResult]);

  const handleStartWizard = () => {
    const randomId = `ESP32S3_NODE_${Math.floor(1000 + Math.random() * 9000)}`;
    setDeviceName('Trạm Vệ Tinh Hồ Nuôi ' + (devices.length + 1));
    setCustomDeviceId(randomId);
    setSelectedTemplate('tmpl_aquaponics_v1');
    setWizardStep(1);
    setProvisioningResult(null);
    setIsWizardOpen(true);
  };

  const handleCompleteStep2 = async () => {
    setIsSubmitting(true);
    try {
      const result = await onProvisionDevice({
        name: deviceName,
        deviceId: customDeviceId,
        templateId: selectedTemplate,
      });
      setProvisioningResult(result);
      setWizardStep(3);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cấp phát thiết bị');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyKey = (keyText: string) => {
    navigator.clipboard.writeText(keyText);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyPayload = (payloadText: string) => {
    navigator.clipboard.writeText(payloadText);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleRotateKeyClick = async (deviceId: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xoay khóa cho thiết bị ${deviceId}? Khóa cũ sẽ bị vô hiệu hóa ngay lập tức!`)) {
      return;
    }
    try {
      const res = await onRotateKey(deviceId);
      setRotatedKeyModal({
        deviceId,
        newKey: res.newDeviceKey,
        keyVersion: res.keyVersion,
      });
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xoay khóa');
    }
  };

  const handleRevokeKeyClick = async (deviceId: string) => {
    if (!confirm(`Bạn có chắc chắn muốn thu hồi toàn bộ khóa của thiết bị ${deviceId}? Thiết bị sẽ bị ngắt kết nối!`)) {
      return;
    }
    try {
      await onRevokeKey(deviceId);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi thu hồi khóa');
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                Quản Trị Thiết Bị & Cấp Khóa ESP32
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Phân phối cấu hình phiên bản Active Config, cấp phát mật mã Device Key và giám sát nhịp tim (Heartbeat)
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleOpenFirmwareModal()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer min-h-[44px]"
            >
              <Code className="w-4 h-4 text-emerald-400" />
              <span>📥 Mã Nạp ESP32 & AI</span>
            </button>

            <button
              onClick={handleStartWizard}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm ESP32 Mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Devices List */}
      <div className="space-y-3">
        {devices.map((device) => {
          const activeCred = device.credentials.find((c) => c.status === 'ACTIVE');
          return (
            <div
              key={device.id}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3"
            >
              {/* Top row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-lg bg-slate-900 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{device.name}</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          device.online
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            device.online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                          }`}
                        />
                        {device.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-mono mt-0.5">
                      <span>{device.id}</span>
                      <span>•</span>
                      <span>{device.type}</span>
                      <span>•</span>
                      <span>FW: {device.firmwareVersion}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleOpenFirmwareModal(device.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer min-h-[36px]"
                    title="Xem mã nguồn firmware nạp sẵn cho thiết bị này"
                  >
                    <Code className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Mã nạp</span>
                  </button>

                  <button
                    onClick={() => handleRotateKeyClick(device.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer min-h-[36px]"
                    title="Xoay khóa bảo mật sang phiên bản mới"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-blue-600" />
                    <span>Xoay Khóa</span>
                  </button>
                  <button
                    onClick={() => handleRevokeKeyClick(device.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer min-h-[36px]"
                    title="Thu hồi toàn bộ khóa kết nối"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Thu Hồi</span>
                  </button>
                </div>
              </div>

              {/* Status and telemetry stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Cấu Hình Active
                  </span>
                  <span className="font-bold text-slate-900">
                    Version v{device.currentConfigVersion}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Tín Hiệu WiFi
                  </span>
                  <span className="font-bold text-slate-900 flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-emerald-600" />
                    {device.rssi} dBm
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Địa Chỉ IP Mạng Lan
                  </span>
                  <span className="font-bold text-slate-900">
                    {device.ipAddress || '192.168.1.108'}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                    Phiên Bản Khóa
                  </span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    v{activeCred?.keyVersion ?? 1} (Hash: {activeCred?.keyHash.slice(7, 15) ?? 'active'})
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* PROVISIONING WIZARD MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  {wizardStep}
                </div>
                <h3 className="text-base font-black text-slate-900">
                  {wizardStep === 1 && 'Bước 1: Khai Báo Trạm ESP32'}
                  {wizardStep === 2 && 'Bước 2: Chọn Bản Mẫu Cấu Hình'}
                  {wizardStep === 3 && 'Bước 3: Cấp Phát Mật Mã & QR'}
                  {wizardStep === 4 && 'Bước 4: Hoàn Tất Cấp Phát'}
                </h3>
              </div>
              <button
                onClick={() => setIsWizardOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Step 1: Name & ID */}
            {wizardStep === 1 && (
              <div className="py-4 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tên Trạm / Thiết Bị *
                  </label>
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    placeholder="VD: Trạm Vệ Tinh Bể Ốc 02"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Mã Thiết Bị (Device ID) *
                  </label>
                  <input
                    type="text"
                    value={customDeviceId}
                    onChange={(e) => setCustomDeviceId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="ESP32S3_NODE_02"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Được sử dụng làm định danh duy nhất gửi dữ liệu lên Hub.
                  </span>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                  <span className="font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    Bảo mật chuẩn V4.0
                  </span>
                  <p className="text-[11px] text-blue-800">
                    Khóa xác thực sẽ được tạo ngẫu nhiên bằng mật mã mật định dạng{' '}
                    <code className="bg-white px-1 rounded font-mono">dvk_live_...</code>.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsWizardOpen(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer min-h-[44px]"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => setWizardStep(2)}
                    disabled={!deviceName.trim() || !customDeviceId.trim()}
                    className="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer min-h-[44px] disabled:opacity-50"
                  >
                    <span>Tiếp Tục</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Template Selection */}
            {wizardStep === 2 && (
              <div className="py-4 space-y-4">
                <span className="text-xs font-bold text-slate-700 block">
                  Chọn Bản Mẫu Kế Thừa Cấu Hình (Template):
                </span>

                <div className="space-y-2.5">
                  {DEFAULT_TEMPLATES.map((tmpl) => (
                    <label
                      key={tmpl.id}
                      onClick={() => setSelectedTemplate(tmpl.id)}
                      className={`block p-3.5 rounded-xl border transition-all cursor-pointer ${
                        selectedTemplate === tmpl.id
                          ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{tmpl.name}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                          {tmpl.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{tmpl.description}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-slate-600">
                        <span>{tmpl.sensorCount} Cảm biến</span>
                        <span>•</span>
                        <span>{tmpl.actuatorCount} Chấp hành</span>
                        <span>•</span>
                        <span>{tmpl.defaultAlarmCount} Cảnh báo</span>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center gap-1 cursor-pointer min-h-[44px]"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Quay lại</span>
                  </button>
                  <button
                    onClick={handleCompleteStep2}
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer min-h-[44px] disabled:opacity-50"
                  >
                    <span>Cấp Khóa & Tạo Thiết Bị</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Key Generation, QR Code & Warning */}
            {wizardStep === 3 && provisioningResult && (
              <div className="py-4 space-y-4">
                {/* Warning Banner */}
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">CHÚ Ý QUAN TRỌNG:</span>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Mã <strong>Device Key</strong> chỉ hiển thị <strong>DUY NHẤT MỘT LẦN</strong> tại bước này. Máy chủ chỉ lưu bản băm SHA-256 để kiểm tra bảo mật.
                    </p>
                  </div>
                </div>

                {/* Device Key box */}
                <div className="p-3 bg-slate-900 text-white rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>DEVICE KEY (MẬT MÃ KẾT NỐI):</span>
                    <button
                      onClick={() => handleCopyKey(provisioningResult.deviceKey)}
                      className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold cursor-pointer"
                    >
                      {copiedKey ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey ? 'Đã sao chép!' : 'Sao chép'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-xs text-emerald-300 break-all select-all p-1.5 bg-slate-800 rounded">
                    {provisioningResult.deviceKey}
                  </div>
                </div>

                {/* QR Code Container */}
                <div className="flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1">
                    <QrCode className="w-3.5 h-3.5 text-slate-600" />
                    Mã QR Cấu Hình Cho Thiết Bị
                  </span>
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="Provisioning QR Code"
                      className="w-44 h-44 border border-slate-200 rounded-lg shadow-xs"
                    />
                  ) : (
                    <div className="w-44 h-44 bg-slate-200 animate-pulse rounded-lg" />
                  )}
                  <span className="text-[10px] text-slate-500 mt-2 text-center">
                    Quét mã bằng app cấu hình ESP32 hoặc nạp JSON trực tiếp qua UART
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setWizardStep(4)}
                    className="w-full py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer min-h-[44px] flex items-center justify-center gap-1"
                  >
                    <span>Tiếp Tục: Xem Gói Cấu Hình JSON</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Full Payload & Finish */}
            {wizardStep === 4 && provisioningResult && (
              <div className="py-4 space-y-4">
                <span className="text-xs font-bold text-slate-700 block">
                  Gói Cấu Hình Hoàn Chỉnh Cho Firmware ESP32:
                </span>

                <div className="relative">
                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                    {JSON.stringify(
                      {
                        device_id: provisioningResult.deviceId,
                        device_key: provisioningResult.deviceKey,
                        token: provisioningResult.token,
                        api_endpoint: provisioningResult.endpoint,
                        protocol_version: provisioningResult.protocolVersion,
                        wifi_fallback_ssid: 'OC_IoT_Setup',
                      },
                      null,
                      2
                    )}
                  </pre>
                  <button
                    onClick={() =>
                      handleCopyPayload(
                        JSON.stringify({
                          device_id: provisioningResult.deviceId,
                          device_key: provisioningResult.deviceKey,
                          token: provisioningResult.token,
                          api_endpoint: provisioningResult.endpoint,
                          protocol_version: provisioningResult.protocolVersion,
                        })
                      )
                    }
                    className="absolute top-2 right-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer border border-slate-700"
                  >
                    {copiedPayload ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPayload ? 'Đã sao chép' : 'Sao chép JSON'}</span>
                  </button>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                  <span className="font-bold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    Cấp phát hoàn tất thành công!
                  </span>
                  <p className="text-[11px] text-emerald-800">
                    Thiết bị đã được thêm vào danh sách quản lý. ESP32 sẽ tự động nhận diện cấu hình ngưỡng khi thực hiện heartbeat đầu tiên.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setIsWizardOpen(false);
                    onRefresh();
                  }}
                  className="w-full py-2.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs cursor-pointer min-h-[44px]"
                >
                  Đóng Wizard & Quay Lại Danh Sách
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* ROTATED KEY MODAL */}
      {/* ---------------------------------------------------------------------- */}
      {rotatedKeyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">
                Xoay Khóa Thành Công (v{rotatedKeyModal.keyVersion})
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              Thiết bị <strong>{rotatedKeyModal.deviceId}</strong> đã được cấp khóa mới. Hãy sao chép ngay vì khóa này sẽ không thể hiển thị lại:
            </p>

            <div className="p-3 bg-slate-900 text-emerald-300 font-mono text-xs rounded-xl break-all select-all flex items-center justify-between gap-2">
              <span>{rotatedKeyModal.newKey}</span>
              <button
                onClick={() => handleCopyKey(rotatedKeyModal.newKey)}
                className="px-2 py-1 bg-slate-800 text-white rounded text-[10px] font-bold shrink-0 hover:bg-slate-700 cursor-pointer"
              >
                {copiedKey ? 'Đã sao chép' : 'Sao chép'}
              </button>
            </div>

            <button
              onClick={() => setRotatedKeyModal(null)}
              className="w-full py-2.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 cursor-pointer min-h-[44px]"
            >
              Tôi Đã Lưu Khóa Mới
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* FIRMWARE & CLIENT CODE MODAL (REAL-WORLD DEPLOYMENT READY) */}
      {/* ---------------------------------------------------------------------- */}
      {isFirmwareModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Bộ Mã Nạp Phần Cứng & Client Thực Địa
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sẵn sàng nạp trực tiếp vào vi điều khiển ESP32-S3 hoặc máy tính xử lý AI Vision
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFirmwareModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Device Selector & Navigation Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
                <button
                  onClick={() => setFirmwareTab('esp32')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                    firmwareTab === 'esp32'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>ESP32-S3 (Arduino C++)</span>
                </button>
                <button
                  onClick={() => setFirmwareTab('vision')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                    firmwareTab === 'vision'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>AI Vision (Python)</span>
                </button>
                <button
                  onClick={() => setFirmwareTab('pinout')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                    firmwareTab === 'pinout'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Sơ Đồ Đấu Nối</span>
                </button>
              </div>

              {firmwareTab === 'esp32' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Thiết bị:</span>
                  <select
                    value={selectedDeviceForFw}
                    onChange={(e) => {
                      setSelectedDeviceForFw(e.target.value);
                      handleOpenFirmwareModal(e.target.value);
                    }}
                    className="text-xs font-mono bg-slate-50 border border-slate-300 rounded-md px-2 py-1 focus:ring-1 focus:ring-emerald-500"
                  >
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Tab 1: ESP32-S3 */}
            {firmwareTab === 'esp32' && (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Mã nạp Arduino C++ tương thích 100% phần cứng:</strong> Đã cấu hình sẵn endpoint máy chủ, cơ chế gửi nhịp tim (Heartbeat 30s), Telemetry (5s), tự động kéo lệnh hàng đợi (Commands Queue), gửi ACK xác nhận và tự động ngắt Bơm 1 khi hụt phao đáy (chống cháy bơm).
                  </div>
                </div>

                <div className="relative">
                  <pre className="p-3 bg-slate-950 text-slate-200 font-mono text-xs rounded-xl overflow-x-auto max-h-[340px] leading-relaxed select-all">
                    {isLoadingCode ? 'Đang tạo mã nguồn nạp...' : firmwareCode}
                  </pre>
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyCode(firmwareCode)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition shadow-xs"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Đã sao chép!' : 'Sao chép'}</span>
                    </button>
                    <button
                      onClick={() => handleDownloadFile(firmwareCode, `firmware_${selectedDeviceForFw}.ino`)}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải .ino</span>
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                  <p className="font-semibold text-slate-700">Các bước nạp thực tế vào mạch ESP32-S3:</p>
                  <p>1. Cài đặt Arduino IDE 2.x và gói bo mạch <code className="text-emerald-700 font-mono">esp32 by Espressif</code>.</p>
                  <p>2. Cài thư viện <code className="text-emerald-700 font-mono">ArduinoJson</code> (phiên bản 6.x trở lên).</p>
                  <p>3. Thay <code className="font-mono text-slate-800">WIFI_SSID</code>, <code className="font-mono text-slate-800">WIFI_PASSWORD</code> và điền <code className="font-mono text-slate-800">DEVICE_KEY</code> đã cấp.</p>
                  <p>4. Cắm cáp USB Type-C, chọn cổng COM và bấm <strong>Upload</strong>.</p>
                </div>
              </div>
            )}

            {/* Tab 2: AI Vision */}
            {firmwareTab === 'vision' && (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
                  <Terminal className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Client AI Vision chạy trên PC hoặc máy trạm mini (Raspberry Pi/Jetson):</strong> Kết nối camera qua USB/RTSP, liên tục bóc tách màu HSV để tính độ phủ bèo hoa dâu và phát hiện các ổ trứng ốc bươu đen trên bờ giá thể theo chu kỳ 30 giây rồi đẩy trực tiếp lên Hub.
                  </div>
                </div>

                <div className="relative">
                  <pre className="p-3 bg-slate-950 text-slate-200 font-mono text-xs rounded-xl overflow-x-auto max-h-[340px] leading-relaxed select-all">
                    {isLoadingCode ? 'Đang tạo script AI Vision...' : visionCode}
                  </pre>
                  <div className="absolute top-2 right-2 flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyCode(visionCode)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition shadow-xs"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Đã sao chép!' : 'Sao chép'}</span>
                    </button>
                    <button
                      onClick={() => handleDownloadFile(visionCode, 'ai_vision_client.py')}
                      className="px-2.5 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải .py</span>
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                  <p className="font-semibold text-slate-700">Lệnh chạy nhanh trong Terminal/CMD:</p>
                  <code className="block bg-slate-900 text-emerald-400 p-2 rounded text-xs font-mono select-all">
                    pip install opencv-python numpy requests && python ai_vision_client.py
                  </code>
                </div>
              </div>
            )}

            {/* Tab 3: Pinout Hardware */}
            {firmwareTab === 'pinout' && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                  <p className="font-bold text-slate-900 mb-1">Bảng Sơ Đồ Đấu Nối Phần Cứng Chuẩn Thực Địa:</p>
                  <p>Mạch điều khiển trung tâm: <strong>ESP32-S3 WROOM 1 / N16R8</strong>. Cấp nguồn ngoài 5V/2A ổn định cho Relay và cảm biến.</p>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-2.5">Linh Kiện / Ngoại Vi</th>
                        <th className="p-2.5">Loại Tín Hiệu</th>
                        <th className="p-2.5">Chân GPIO ESP32-S3</th>
                        <th className="p-2.5">Nguồn Nuôi</th>
                        <th className="p-2.5">Ghi Chú Đấu Dây</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      <tr className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold font-sans text-slate-900">Cảm biến TDS nước</td>
                        <td className="p-2.5 text-blue-700">Analog (0 - 3.3V)</td>
                        <td className="p-2.5 font-bold text-emerald-700">GPIO 4 (ADC1_CH3)</td>
                        <td className="p-2.5">3.3V / GND</td>
                        <td className="p-2.5 font-sans text-slate-500">Đặt đầu dò tại bể cá/bể nuôi</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold font-sans text-slate-900">Cảm biến ẩm đất điện dung</td>
                        <td className="p-2.5 text-blue-700">Analog (0 - 3.3V)</td>
                        <td className="p-2.5 font-bold text-emerald-700">GPIO 5 (ADC1_CH4)</td>
                        <td className="p-2.5">3.3V / GND</td>
                        <td className="p-2.5 font-sans text-slate-500">Cắm sâu vào thảm vi sinh/đất</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold font-sans text-slate-900">Phao cạn (Float Low)</td>
                        <td className="p-2.5 text-amber-700">Digital Input</td>
                        <td className="p-2.5 font-bold text-emerald-700">GPIO 21 (PULLUP)</td>
                        <td className="p-2.5">Nối GND khi có nước</td>
                        <td className="p-2.5 font-sans text-slate-500">Khóa an toàn chống cháy Bơm 1</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold font-sans text-slate-900">Phao tràn (Float High)</td>
                        <td className="p-2.5 text-amber-700">Digital Input</td>
                        <td className="p-2.5 font-bold text-emerald-700">GPIO 22 (PULLUP)</td>
                        <td className="p-2.5">Nối GND khi ngập</td>
                        <td className="p-2.5 font-sans text-slate-500">Báo động chống tràn nước</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold font-sans text-slate-900">Relay Bơm 1 (Lọc tuần hoàn)</td>
                        <td className="p-2.5 text-rose-700">Digital Output (Relay)</td>
                        <td className="p-2.5 font-bold text-emerald-700">GPIO 18</td>
                        <td className="p-2.5">5V / GND (Module)</td>
                        <td className="p-2.5 font-sans text-slate-500">Kích High/Low tùy module Relay</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold font-sans text-slate-900">Relay Bơm 2 (Tưới ẩm)</td>
                        <td className="p-2.5 text-rose-700">Digital Output (Relay)</td>
                        <td className="p-2.5 font-bold text-emerald-700">GPIO 19</td>
                        <td className="p-2.5">5V / GND (Module)</td>
                        <td className="p-2.5 font-sans text-slate-500">Bơm tưới phun sương thảm ẩm</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold font-sans text-slate-900">Còi báo động Buzzer</td>
                        <td className="p-2.5 text-purple-700">Digital Output</td>
                        <td className="p-2.5 font-bold text-emerald-700">GPIO 23</td>
                        <td className="p-2.5">5V / GND</td>
                        <td className="p-2.5 font-sans text-slate-500">Kêu ngắt quãng khi cảnh báo CRITICAL</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setIsFirmwareModalOpen(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition cursor-pointer min-h-[44px]"
              >
                Đóng Cửa Sổ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
