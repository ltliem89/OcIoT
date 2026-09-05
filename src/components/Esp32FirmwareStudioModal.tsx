import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Cpu,
  Zap,
  Wifi,
  WifiOff,
  BatteryCharging,
  Sun,
  Shield,
  Layers,
  Terminal,
  Play,
  RotateCcw,
  Sliders,
  ExternalLink,
  Code2,
  AlertCircle,
  HelpCircle,
  Settings2,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Server,
  Activity,
} from 'lucide-react';
import { Device } from '../types';

interface Esp32FirmwareStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: Device[];
  initialDeviceId?: string;
  initialTab?: 'editor' | 'code_guide' | 'pinout' | 'serial' | 'guide';
  onRotateKey?: (deviceId: string) => Promise<void>;
}

type BoardType = 'esp32s3' | 'esp32' | 'esp32c3' | 'esp32_xiao';
type PowerProfile = 'continuous' | 'modem_sleep' | 'solar_sleep';
type RelayTrigger = 'LOW' | 'HIGH';

interface PinoutInfo {
  boardName: string;
  pinTds: number;
  pinMoisture: number;
  pinFloatLow: number;
  pinFloatHigh: number;
  pinPump1: number;
  pinPump2: number;
  pinBuzzer: number;
  supportsDualCore: boolean;
}

export const Esp32FirmwareStudioModal: React.FC<Esp32FirmwareStudioModalProps> = ({
  isOpen,
  onClose,
  devices,
  initialDeviceId,
  initialTab = 'editor',
  onRotateKey,
}) => {
  const espDevices = devices.filter((d) => d.type === 'ESP32_S3' || d.type === 'GENERIC_IOT');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(
    initialDeviceId || espDevices[0]?.id || 'ESP32S3_ECO_01'
  );

  const [board, setBoard] = useState<BoardType>('esp32s3');
  const [powerProfile, setPowerProfile] = useState<PowerProfile>('continuous');
  const [relayTrigger, setRelayTrigger] = useState<RelayTrigger>('LOW');
  const [wifiSsid, setWifiSsid] = useState<string>('Nha_Mang_EcoFarm');
  const [wifiPassword, setWifiPassword] = useState<string>('EcoFarm@2026');
  const [telemetryInterval, setTelemetryInterval] = useState<number>(5);
  const [heartbeatInterval, setHeartbeatInterval] = useState<number>(30);
  const [customServerUrl, setCustomServerUrl] = useState<string>('');

  const [code, setCode] = useState<string>('');
  const [originalCode, setOriginalCode] = useState<string>('');
  const [activeKey, setActiveKey] = useState<string>('');
  const [pinout, setPinout] = useState<PinoutInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);

  // Server health test state
  const [serverHealth, setServerHealth] = useState<{
    status: 'idle' | 'checking' | 'healthy' | 'error';
    latencyMs?: number;
    message?: string;
  }>({ status: 'idle' });

  // Web Serial states
  const [isSerialSupported, setIsSerialSupported] = useState<boolean>(false);
  const [isSerialConnected, setIsSerialConnected] = useState<boolean>(false);
  const [serialLogs, setSerialLogs] = useState<string[]>([]);
  const [serialCommand, setSerialCommand] = useState<string>('');
  const portRef = useRef<any>(null);
  const readerRef = useRef<any>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Active tab inside modal
  const [activeTab, setActiveTab] = useState<'editor' | 'code_guide' | 'serial' | 'pinout' | 'guide'>(initialTab);

  // Update active tab when initialTab changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Check Web Serial support
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'serial' in navigator) {
      setIsSerialSupported(true);
    }
  }, []);

  // Set initial device ID if prop changes
  useEffect(() => {
    if (initialDeviceId) {
      setSelectedDeviceId(initialDeviceId);
    } else if (espDevices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(espDevices[0].id);
    }
  }, [initialDeviceId, espDevices]);

  // Health check for Hub endpoint
  const checkHubHealth = async () => {
    setServerHealth({ status: 'checking' });
    const startTime = performance.now();
    try {
      const endpoint = customServerUrl.trim() || window.location.origin;
      const res = await fetch(`${endpoint}/api/v1/devices`);
      const latency = Math.round(performance.now() - startTime);
      if (res.ok) {
        setServerHealth({
          status: 'healthy',
          latencyMs: latency,
          message: `Máy chủ Hub hoạt động tốt (HTTP 200) - Phản hồi trong ${latency}ms`,
        });
      } else {
        setServerHealth({
          status: 'error',
          message: `Máy chủ phản hồi mã lỗi HTTP ${res.status}`,
        });
      }
    } catch (err: any) {
      setServerHealth({
        status: 'error',
        message: `Không kết nối được: ${err?.message || 'Kiểm tra lại IP và cổng mạng'}`,
      });
    }
  };

  // Load code from server whenever parameters change
  const fetchFirmwareSketch = async () => {
    if (!selectedDeviceId) return;
    setIsLoading(true);
    try {
      const endpoint = customServerUrl.trim() || window.location.origin;
      const params = new URLSearchParams({
        board,
        powerProfile,
        relayTrigger,
        wifiSsid,
        wifiPassword,
        telemetryInterval: String(telemetryInterval),
        heartbeatInterval: String(heartbeatInterval),
        serverEndpoint: endpoint,
      });

      const res = await fetch(`/api/v1/devices/${selectedDeviceId}/firmware-sketch?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCode(data.sketch);
        setOriginalCode(data.sketch);
        setActiveKey(data.activeKey || '');
        setPinout(data.pinout || null);
      }
    } catch (err) {
      console.error('Lỗi khi tải mã nạp ESP32:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && selectedDeviceId) {
      fetchFirmwareSketch();
    }
  }, [isOpen, selectedDeviceId, board, powerProfile, relayTrigger, telemetryInterval, heartbeatInterval]);

  // Copy code handler
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Copy key handler
  const handleCopyKey = () => {
    if (!activeKey) return;
    navigator.clipboard.writeText(activeKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Download .ino file
  const handleDownloadIno = () => {
    const blob = new Blob([code], { type: 'text/x-c;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `oc_iot_${selectedDeviceId.toLowerCase()}_firmware.ino`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download config.h file
  const handleDownloadConfigHeader = () => {
    const configContent = `// OC IoT Hardware Configuration Header
#ifndef OC_IOT_CONFIG_H
#define OC_IOT_CONFIG_H

#define OC_IOT_DEVICE_ID     "${selectedDeviceId}"
#define OC_IOT_DEVICE_KEY    "${activeKey}"
#define OC_IOT_SERVER_URL    "${customServerUrl.trim() || window.location.origin}/api/v1"
#define OC_IOT_WIFI_SSID     "${wifiSsid}"
#define OC_IOT_WIFI_PASS     "${wifiPassword}"

#define RELAY_ON_LEVEL       ${relayTrigger}
#define RELAY_OFF_LEVEL      (${relayTrigger} == LOW ? HIGH : LOW)

#define PIN_TDS_ADC          ${pinout?.pinTds ?? 4}
#define PIN_MOISTURE_ADC     ${pinout?.pinMoisture ?? 5}
#define PIN_FLOAT_LOW        ${pinout?.pinFloatLow ?? 21}
#define PIN_FLOAT_HIGH       ${pinout?.pinFloatHigh ?? 22}
#define PIN_RELAY_PUMP1      ${pinout?.pinPump1 ?? 18}
#define PIN_RELAY_PUMP2      ${pinout?.pinPump2 ?? 19}
#define PIN_BUZZER           ${pinout?.pinBuzzer ?? 23}

#endif // OC_IOT_CONFIG_H
`;
    const blob = new Blob([configContent], { type: 'text/x-c;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `config_${selectedDeviceId.toLowerCase()}.h`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Web Serial: Connect
  const handleConnectSerial = async () => {
    if (!isSerialSupported) {
      alert('Trình duyệt của bạn chưa hỗ trợ Web Serial. Hãy sử dụng Google Chrome hoặc Microsoft Edge!');
      return;
    }
    try {
      const nav: any = navigator;
      const port = await nav.serial.requestPort();
      await port.open({ baudRate: 115200 });
      portRef.current = port;
      setIsSerialConnected(true);
      setSerialLogs((prev) => [
        ...prev,
        `[HỆ THỐNG] Đã mở cổng USB thành công (Baudrate: 115200). Đang đọc dữ liệu từ ESP32...`,
      ]);

      const textDecoder = new TextDecoderStream();
      const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      readerRef.current = reader;

      readSerialLoop(reader);
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        console.error('Lỗi mở Serial:', err);
        setSerialLogs((prev) => [...prev, `[LỖI CỔNG USB]: ${err.message || err}`]);
      }
    }
  };

  // Read serial loop
  const readSerialLoop = async (reader: any) => {
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          reader.releaseLock();
          break;
        }
        if (value) {
          setSerialLogs((prev) => {
            const next = [...prev, value];
            if (next.length > 500) return next.slice(-400);
            return next;
          });
          if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
          }
        }
      }
    } catch (err) {
      console.log('Đã dừng đọc Serial:', err);
    }
  };

  // Web Serial: Disconnect
  const handleDisconnectSerial = async () => {
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current = null;
      }
      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }
      setIsSerialConnected(false);
      setSerialLogs((prev) => [...prev, `[HỆ THỐNG] Đã ngắt kết nối cổng USB.`]);
    } catch (err) {
      console.error('Lỗi khi ngắt Serial:', err);
    }
  };

  // Web Serial: Send Command
  const handleSendSerialCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialCommand.trim() || !portRef.current || !portRef.current.writable) return;

    try {
      const textEncoder = new TextEncoderStream();
      const writableStreamClosed = textEncoder.readable.pipeTo(portRef.current.writable);
      const writer = textEncoder.writable.getWriter();
      await writer.write(serialCommand + '\n');
      writer.releaseLock();

      setSerialLogs((prev) => [...prev, `> ${serialCommand}`]);
      setSerialCommand('');
    } catch (err: any) {
      setSerialLogs((prev) => [...prev, `[LỖI GỬI LỆNH]: ${err.message}`]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  ESP32 Firmware Studio & Nạp Bo Mạch
                </h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  C++ v4.2.2
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Mã nguồn C++ tối ưu mạng, đệm offline, tự trị chống cháy bơm & có chú thích từng dòng chỉnh sửa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              id="btn_close_esp_modal"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Device & Key Context Bar */}
        <div className="px-4 py-2.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Thiết bị:</span>
            <select
              id="select_esp_target_device"
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            >
              {espDevices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.id})
                </option>
              ))}
            </select>

            <span className="text-xs text-slate-400">|</span>

            {/* Active Device Key Display */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80">
              <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[11px] font-medium text-emerald-900 dark:text-emerald-300">
                Key đã nạp trong mã:
              </span>
              <code className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-300 max-w-[140px] sm:max-w-none truncate">
                {activeKey || 'Đang tạo key...'}
              </code>
              <button
                id="btn_copy_active_key"
                onClick={handleCopyKey}
                title="Sao chép Device Key"
                className="p-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded transition-colors cursor-pointer"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn_refresh_code"
              onClick={fetchFirmwareSketch}
              disabled={isLoading}
              className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới mã C++
            </button>
          </div>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Hardware & Power Profile Settings Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Board Selector */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-indigo-500" /> Chọn Bo Mạch ESP32
                </span>
                <span className="text-[11px] text-slate-500">Tự động cấu hình GPIO pinout</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    id: 'esp32s3',
                    label: 'ESP32-S3 DevKit',
                    desc: 'WROOM-1 / N16R8 (Khuyên dùng)',
                    badge: 'Dual-Core',
                  },
                  {
                    id: 'esp32',
                    label: 'ESP32 WROOM-32',
                    desc: 'NodeMCU 30/38 Pin Phổ biến',
                    badge: 'Standard',
                  },
                  {
                    id: 'esp32c3',
                    label: 'ESP32-C3 SuperMini',
                    desc: 'RISC-V Siêu Tiết Kiệm Điện',
                    badge: 'Low Power',
                  },
                  {
                    id: 'esp32_xiao',
                    label: 'Seeed XIAO S3',
                    desc: 'Kích thước siêu nhỏ',
                    badge: 'Compact',
                  },
                ].map((b) => (
                  <button
                    key={b.id}
                    id={`btn_board_${b.id}`}
                    type="button"
                    onClick={() => setBoard(b.id as BoardType)}
                    className={`p-2.5 rounded-lg border text-left transition-all relative cursor-pointer ${
                      board === b.id
                        ? 'border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 dark:border-indigo-600 ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {b.label}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                        {b.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{b.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Power & Performance Profile */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" /> Chế Độ Năng Lượng & Mạng
                </span>
                <span className="text-[11px] text-slate-500">Tối ưu hiệu suất & pin</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    id: 'continuous',
                    label: 'Điện Lưới 220V',
                    desc: 'Dual-core, phản hồi tức thì',
                    icon: Zap,
                    color: 'text-amber-500',
                  },
                  {
                    id: 'modem_sleep',
                    label: 'Modem Sleep',
                    desc: 'Tiết kiệm 60% điện, mát chip',
                    icon: BatteryCharging,
                    color: 'text-emerald-500',
                  },
                  {
                    id: 'solar_sleep',
                    label: 'Solar / Pin',
                    desc: 'Light sleep & ngắt phao',
                    icon: Sun,
                    color: 'text-orange-500',
                  },
                ].map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.id}
                      id={`btn_power_${p.id}`}
                      type="button"
                      onClick={() => setPowerProfile(p.id as PowerProfile)}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        powerProfile === p.id
                          ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 dark:border-amber-600 ring-1 ring-amber-500'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className={`w-3.5 h-3.5 ${p.color}`} />
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {p.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight">
                        {p.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Customization Row (WiFi, Relay trigger, Intervals, LAN Hub) */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-emerald-500" /> Tùy Biến Nhanh Trước Khi Nạp
              </span>
              <span className="text-[11px] text-slate-500">Mã C++ bên dưới tự động cập nhật ngay khi bạn sửa</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Tên WiFi (2.4GHz):
                </label>
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  placeholder="Tên mạng WiFi..."
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Mật khẩu WiFi:
                </label>
                <input
                  type="text"
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                  placeholder="Mật khẩu WiFi..."
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Mức Kích Relay Bơm:
                </label>
                <select
                  value={relayTrigger}
                  onChange={(e) => setRelayTrigger(e.target.value as RelayTrigger)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="LOW">Active LOW (Đa số mạch Relay 5V)</option>
                  <option value="HIGH">Active HIGH (Mạch quang kích dương)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  Chu kỳ Telemetry:
                </label>
                <select
                  value={telemetryInterval}
                  onChange={(e) => setTelemetryInterval(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={3}>3 giây (Test nhanh)</option>
                  <option value={5}>5 giây (Tiêu chuẩn V4)</option>
                  <option value={10}>10 giây (Tối ưu pin)</option>
                  <option value={30}>30 giây (Rất tiết kiệm)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                  IP LAN Hub (nếu chạy local):
                </label>
                <input
                  type="text"
                  value={customServerUrl}
                  onChange={(e) => setCustomServerUrl(e.target.value)}
                  placeholder="http://192.168.1.15:3000"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                id="tab_btn_editor"
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'editor'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Code2 className="w-4 h-4" /> Trình Soạn Thảo C++
              </button>

              <button
                type="button"
                id="tab_btn_code_guide"
                onClick={() => setActiveTab('code_guide')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'code_guide'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Chỗ Chỉnh Trong Code (1/6 - 6/6)</span>
              </button>

              <button
                type="button"
                id="tab_btn_pinout"
                onClick={() => setActiveTab('pinout')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'pinout'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Layers className="w-4 h-4" /> Sơ Đồ Chân (Pinout)
              </button>

              <button
                type="button"
                id="tab_btn_serial"
                onClick={() => setActiveTab('serial')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'serial'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Terminal className="w-4 h-4" /> Web Serial USB Monitor
                {isSerialConnected && (
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                )}
              </button>

              <button
                type="button"
                id="tab_btn_guide"
                onClick={() => setActiveTab('guide')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  activeTab === 'guide'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <HelpCircle className="w-4 h-4" /> Các Bước Nạp Bo
              </button>
            </div>

            {/* Quick action buttons on the right */}
            <div className="flex items-center gap-2">
              <button
                id="btn_copy_full_sketch"
                onClick={handleCopyCode}
                className="px-3 py-1 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Đã sao chép!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Sao chép C++
                  </>
                )}
              </button>

              <button
                id="btn_download_ino"
                onClick={handleDownloadIno}
                className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Tải .ino
              </button>
            </div>
          </div>

          {/* TAB 1: CODE EDITOR */}
          {activeTab === 'editor' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 flex-wrap gap-2">
                <span>Bạn có thể chỉnh sửa trực tiếp mã nguồn C++ ngay trong khung bên dưới:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCode(originalCode)}
                    className="text-slate-500 hover:text-slate-900 dark:hover:text-white underline text-[11px] cursor-pointer"
                  >
                    Khôi phục mẫu gốc
                  </button>
                  <button
                    onClick={handleDownloadConfigHeader}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" /> Tải config.h
                  </button>
                </div>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#0d1117] shadow-inner">
                <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-slate-800 text-slate-400 text-xs">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="ml-2 font-semibold text-slate-200">
                      oc_iot_{selectedDeviceId.toLowerCase()}.ino
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {code.split('\n').length} dòng | Arduino C++ (ESP32)
                  </span>
                </div>

                <textarea
                  id="textarea_esp_sketch"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  spellCheck={false}
                  className="w-full h-96 p-4 font-mono text-xs leading-relaxed text-emerald-400 bg-transparent resize-y focus:outline-none selection:bg-emerald-900 selection:text-white"
                />
              </div>
            </div>
          )}

          {/* TAB 2: DETAILED CODE INSTRUCTION (CHỖ NÀO CHỈNH & CHỈNH RA SAO) */}
          {activeTab === 'code_guide' && (
            <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
              {/* Alert note */}
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-amber-900 dark:text-amber-300 text-xs">
                    Tại Sao App Không Nhận Được Dữ Liệu Hoặc ESP32 Không Kết Nối Được?
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                    Hơn 95% trường hợp app không chạy được bắt nguồn từ 3 lý do: (1) Nhập sai tên WiFi hoặc phát sóng 5GHz; (2) Để địa chỉ <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded font-mono">http://localhost:3000</code> thay vì IP thật của máy tính trong mạng LAN; (3) Mạch relay bị đảo ngược mức kích (Active LOW). Hãy xem 6 điểm dưới đây để chỉnh chính xác:
                  </p>
                </div>
              </div>

              {/* 6 Config Locations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                
                {/* 1. WiFi */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px]">1</span>
                      Tên & Mật Khẩu WiFi (Dòng 53 - 54)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-semibold">Bắt Buộc Đúng</span>
                  </div>
                  <pre className="p-2 bg-slate-950 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto">
{`const char* WIFI_SSID     = "Tên_WiFi_Của_Bạn";
const char* WIFI_PASSWORD = "Mật_Khẩu_WiFi";`}
                  </pre>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                    <li><strong>Chỉnh ra sao:</strong> Thay bằng tên WiFi và mật khẩu thực tế tại vị trí đặt bể.</li>
                    <li><strong>Lưu ý chí mạng:</strong> ESP32 chỉ bắt được băng tần <strong>2.4GHz</strong>, tuyệt đối không dùng WiFi 5GHz!</li>
                    <li><strong>Mẹo thực tế:</strong> Khi mang ra vườn/bể chưa có WiFi, hãy mở "Điểm phát sóng di động (Hotspot)" 2.4GHz từ điện thoại.</li>
                  </ul>
                </div>

                {/* 2. Hub Base URL */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px]">2</span>
                      Địa Chỉ Hub HUB_BASE_URL (Dòng 61)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-semibold">Cực Kỳ Quan Trọng</span>
                  </div>
                  <pre className="p-2 bg-slate-950 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto">
{`// Nếu chạy máy tính Local: Dùng IP LAN (VD: 192.168.1.15)
const char* HUB_BASE_URL = "http://192.168.1.15:3000/api/v1";

// Nếu chạy đám mây Cloud:
const char* HUB_BASE_URL = "${window.location.origin}/api/v1";`}
                  </pre>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                    <li><strong>Lỗi phổ biến nhất:</strong> Để <code className="text-rose-500">localhost:3000</code> khiến ESP32 không thể kết nối (báo lỗi HTTP -1).</li>
                    <li><strong>Cách lấy IP máy tính:</strong> Trên Windows mở Command Prompt gõ <code className="bg-slate-100 dark:bg-slate-900 px-1 rounded font-mono">ipconfig</code> tìm dòng IPv4 (ví dụ 192.168.1.15). Trên Mac/Linux gõ <code className="bg-slate-100 dark:bg-slate-900 px-1 rounded font-mono">ifconfig</code>.</li>
                  </ul>
                </div>

                {/* 3. GPIO Pinout */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px]">3</span>
                      Sơ Đồ Chân Nối Dây GPIO (Dòng 69 - 75)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold">Phần Cứng</span>
                  </div>
                  <pre className="p-2 bg-slate-950 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto">
{`#define PIN_TDS_ADC        ${pinout?.pinTds ?? 4}    // Cảm biến TDS
#define PIN_MOISTURE_ADC   ${pinout?.pinMoisture ?? 5}    // Cảm biến độ ẩm đất
#define PIN_FLOAT_LOW      ${pinout?.pinFloatLow ?? 21}   // Phao cạn (chống cháy bơm)
#define PIN_RELAY_PUMP1    ${pinout?.pinPump1 ?? 18}   // Relay Bơm tuần hoàn 1`}
                  </pre>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                    <li><strong>Chỉnh ra sao:</strong> Đổi số chân nếu cắm dây vào vị trí khác trên bo mạch.</li>
                    <li><strong>Lưu ý kỹ thuật:</strong> Cảm biến Analog (TDS, độ ẩm đất) bắt buộc phải cắm vào cụm <strong>ADC1</strong> để không bị xung đột với modem WiFi!</li>
                  </ul>
                </div>

                {/* 4. Relay Trigger Level */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px]">4</span>
                      Mức Kích Rơ-le Relay (Dòng 81 - 82)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-semibold">Chống Kích Ngược</span>
                  </div>
                  <pre className="p-2 bg-slate-950 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto">
{`#define RELAY_ON_LEVEL     LOW   // LOW nếu kích âm (đa số mạch 5V)
#define RELAY_OFF_LEVEL    HIGH  // HIGH nếu tắt`}
                  </pre>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                    <li><strong>Hiện tượng lỗi:</strong> Vừa cắm nguồn vào là máy bơm tự động chạy vù vù dù chưa có lệnh bật từ App.</li>
                    <li><strong>Cách xử lý:</strong> Đổi <code className="bg-slate-100 dark:bg-slate-900 px-1 rounded font-mono">RELAY_ON_LEVEL</code> từ <code className="text-emerald-500">LOW</code> sang <code className="text-amber-500">HIGH</code> (hoặc ngược lại) trong ô dropdown Tùy Biến Nhanh ở trên.</li>
                  </ul>
                </div>

                {/* 5. Sensor Calibration */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px]">5</span>
                      Cân Chỉnh Cảm Biến TDS & Độ Ẩm (Dòng 137, 154)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 font-semibold">Độ Chính Xác</span>
                  </div>
                  <pre className="p-2 bg-slate-950 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto">
{`// Trong hàm readTDS():
float kFactor = 1.0; // Tăng lên 1.1 hoặc giảm 0.9 để khớp bút đo thật

// Trong hàm readSoilMoisture():
const int RAW_AIR = 3000;   // Giá trị ADC khi cảm biến để ngoài không khí
const int RAW_WATER = 1200; // Giá trị ADC khi nhúng ngập vào nước`}
                  </pre>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                    <li><strong>Cách chỉnh:</strong> Lấy bút đo TDS chuẩn đo nước bể, nếu bút đo 600 ppm mà ESP32 đo 500 ppm thì tăng <code className="font-mono">kFactor = 1.2</code>.</li>
                  </ul>
                </div>

                {/* 6. Intervals & Fail-Safe */}
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px]">6</span>
                      Chu Kỳ Gửi Tin & Tự Trị An Toàn (Dòng 87 - 88)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">Tự Động</span>
                  </div>
                  <pre className="p-2 bg-slate-950 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto">
{`const unsigned long TELEMETRY_INTERVAL_MS = 5000;  // 5 giây gửi 1 lần
const unsigned long HEARTBEAT_INTERVAL_MS = 30000; // 30 giây gửi nhịp tim`}
                  </pre>
                  <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-300 text-[11px]">
                    <li><strong>Cơ chế đệm ngoại tuyến (Ring Buffer):</strong> Khi mất mạng WiFi, ESP32 sẽ tự lưu đệm 30 mẫu đo vào bộ nhớ RAM. Khi có mạng lại, ESP32 tự động đẩy bù toàn bộ dữ liệu lên Hub.</li>
                    <li><strong>Bảo vệ chống cháy máy bơm:</strong> Hàm <code className="font-mono">evaluateLocalSafety()</code> sẽ tự ngắt Bơm 1 ngay lập tức khi phao đáy báo cạn nước, không cần chờ mạng!</li>
                  </ul>
                </div>

              </div>

              {/* Server Connection Test Tool */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      Công Cụ Kiểm Tra Trực Tiếp Kết Nối Tới Máy Chủ Hub
                    </span>
                  </div>
                  <button
                    onClick={checkHubHealth}
                    disabled={serverHealth.status === 'checking'}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Activity className={`w-3.5 h-3.5 ${serverHealth.status === 'checking' ? 'animate-spin' : ''}`} />
                    <span>{serverHealth.status === 'checking' ? 'Đang kiểm tra...' : 'Kiểm Tra Kết Nối Ngay'}</span>
                  </button>
                </div>

                {serverHealth.status !== 'idle' && (
                  <div
                    className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                      serverHealth.status === 'healthy'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : serverHealth.status === 'error'
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {serverHealth.status === 'healthy' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {serverHealth.status === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                    <span>{serverHealth.message}</span>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 3: PINOUT SPECIFICATION */}
          {activeTab === 'pinout' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900 dark:text-white">
                  Bảng Sơ Đồ Chân Chi Tiết Cho Bo Mạch: <span className="text-indigo-600 dark:text-indigo-400">{pinout?.boardName}</span>
                </span>
                <span className="text-slate-500 font-mono text-[11px]">
                  ADC 12-bit (0 - 4095) | 3.3V Logic Level
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] uppercase">
                    <tr>
                      <th className="p-2.5">Thiết Bị Cảm Biến / Chấp Hành</th>
                      <th className="p-2.5">Chân GPIO</th>
                      <th className="p-2.5">Chế Độ (PinMode)</th>
                      <th className="p-2.5">Loại Tín Hiệu</th>
                      <th className="p-2.5">Chức Năng An Toàn & Điều Khiển</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-sans font-semibold text-slate-900 dark:text-white">
                        Cảm biến TDS nước dinh dưỡng
                      </td>
                      <td className="p-2.5 font-bold text-indigo-600 dark:text-indigo-400">
                        GPIO {pinout?.pinTds}
                      </td>
                      <td className="p-2.5">INPUT (ADC1)</td>
                      <td className="p-2.5">Analog 0 - 3.3V</td>
                      <td className="p-2.5 font-sans text-slate-500">
                        Đo tổng chất rắn hòa tan (ppm) trong bể nuôi
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-sans font-semibold text-slate-900 dark:text-white">
                        Cảm biến độ ẩm đất thảm thực vật
                      </td>
                      <td className="p-2.5 font-bold text-indigo-600 dark:text-indigo-400">
                        GPIO {pinout?.pinMoisture}
                      </td>
                      <td className="p-2.5">INPUT (ADC1)</td>
                      <td className="p-2.5">Analog 0 - 3.3V</td>
                      <td className="p-2.5 font-sans text-slate-500">
                        Đo % độ ẩm tầng giá thể trồng vi sinh
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 bg-rose-50/30 dark:bg-rose-950/20">
                      <td className="p-2.5 font-sans font-semibold text-rose-700 dark:text-rose-400">
                        Phao cạn đáy (Bảo vệ Bơm 1)
                      </td>
                      <td className="p-2.5 font-bold text-rose-600 dark:text-rose-400">
                        GPIO {pinout?.pinFloatLow}
                      </td>
                      <td className="p-2.5">INPUT_PULLUP</td>
                      <td className="p-2.5">Digital (LOW = Có nước)</td>
                      <td className="p-2.5 font-sans text-rose-600 dark:text-rose-400 font-medium">
                        Tự động ngắt Bơm 1 tức thì khi cạn nước đáy (chống cháy)
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-sans font-semibold text-slate-900 dark:text-white">
                        Phao tràn đỉnh (Chống tràn bể)
                      </td>
                      <td className="p-2.5 font-bold text-indigo-600 dark:text-indigo-400">
                        GPIO {pinout?.pinFloatHigh}
                      </td>
                      <td className="p-2.5">INPUT_PULLUP</td>
                      <td className="p-2.5">Digital (LOW = Tràn)</td>
                      <td className="p-2.5 font-sans text-slate-500">
                        Cảnh báo mức nước chạm ngưỡng nguy hiểm
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-sans font-semibold text-slate-900 dark:text-white">
                        Relay Bơm 1 (Tuần hoàn lọc bèo)
                      </td>
                      <td className="p-2.5 font-bold text-emerald-600 dark:text-emerald-400">
                        GPIO {pinout?.pinPump1}
                      </td>
                      <td className="p-2.5">OUTPUT</td>
                      <td className="p-2.5">Digital ({relayTrigger === 'LOW' ? 'Active LOW' : 'Active HIGH'})</td>
                      <td className="p-2.5 font-sans text-slate-500">
                        Bơm luân chuyển sinh học bể cá sang bể lọc bèo
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-sans font-semibold text-slate-900 dark:text-white">
                        Relay Bơm 2 (Tưới ẩm giá thể)
                      </td>
                      <td className="p-2.5 font-bold text-emerald-600 dark:text-emerald-400">
                        GPIO {pinout?.pinPump2}
                      </td>
                      <td className="p-2.5">OUTPUT</td>
                      <td className="p-2.5">Digital ({relayTrigger === 'LOW' ? 'Active LOW' : 'Active HIGH'})</td>
                      <td className="p-2.5 font-sans text-slate-500">
                        Bơm phun sương định kỳ duy trì ẩm vi sinh
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5 font-sans font-semibold text-slate-900 dark:text-white">
                        Còi báo động Buzzer
                      </td>
                      <td className="p-2.5 font-bold text-amber-600 dark:text-amber-400">
                        GPIO {pinout?.pinBuzzer}
                      </td>
                      <td className="p-2.5">OUTPUT</td>
                      <td className="p-2.5">Digital</td>
                      <td className="p-2.5 font-sans text-slate-500">
                        Phát âm thanh cảnh báo khi có sự cố khẩn cấp
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: WEB SERIAL USB TERMINAL */}
          {activeTab === 'serial' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isSerialConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Trạng thái cổng USB: {isSerialConnected ? 'Đã Kết Nối (115200 Baud)' : 'Chưa Kết Nối'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Cắm cáp USB nối ESP32 với máy tính và bấm kết nối để đọc trực tiếp log UART từ bo mạch.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isSerialConnected ? (
                    <button
                      id="btn_connect_web_serial"
                      onClick={handleConnectSerial}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Kết Nối USB (Web Serial)
                    </button>
                  ) : (
                    <button
                      id="btn_disconnect_web_serial"
                      onClick={handleDisconnectSerial}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Ngắt Kết Nối
                    </button>
                  )}

                  <button
                    onClick={() => setSerialLogs([])}
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    Xóa Log
                  </button>
                </div>
              </div>

              {/* Log Window */}
              <div
                ref={logContainerRef}
                className="h-80 p-3 bg-black rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-y-auto space-y-1 shadow-inner"
              >
                {serialLogs.length === 0 ? (
                  <div className="text-slate-500 text-center py-24 select-none">
                    Chưa có dữ liệu Serial... Nhấn [Kết Nối USB] phía trên để mở cổng COM.
                  </div>
                ) : (
                  serialLogs.map((log, idx) => (
                    <div key={idx} className="whitespace-pre-wrap break-all leading-tight">
                      {log}
                    </div>
                  ))
                )}
              </div>

              {/* Input command */}
              <form onSubmit={handleSendSerialCommand} className="flex gap-2">
                <input
                  type="text"
                  value={serialCommand}
                  onChange={(e) => setSerialCommand(e.target.value)}
                  disabled={!isSerialConnected}
                  placeholder={
                    isSerialConnected
                      ? "Gõ lệnh kiểm tra (VD: help, status, reboot)..."
                      : "Hãy kết nối cổng USB trước khi gửi lệnh"
                  }
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!isSerialConnected || !serialCommand.trim()}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 cursor-pointer"
                >
                  Gửi
                </button>
              </form>
            </div>
          )}

          {/* TAB 5: FLASHING GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <h4 className="font-bold text-emerald-900 dark:text-emerald-300 text-sm mb-1.5 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" /> Cách 1: Nạp Bằng Arduino IDE 2.x (Chuẩn Nhất)
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600 dark:text-slate-300 ml-1">
                  <li>Cài đặt <strong>Arduino IDE 2.3+</strong> trên máy tính của bạn.</li>
                  <li>Vào <em>File → Preferences</em>, dán URL gói bo mạch ESP32 vào ô <em>Additional boards manager URLs</em>: <br/>
                    <code className="text-[11px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-700 font-mono select-all">
                      https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
                    </code>
                  </li>
                  <li>Vào <em>Tools → Manage Libraries (Ctrl+Shift+I)</em>, tìm và cài đặt thư viện <strong>ArduinoJson</strong> (phiên bản 6.x hoặc 7.x).</li>
                  <li>Nhấn nút <strong>"Tải .ino"</strong> trên thanh công cụ và mở tệp vừa tải bằng Arduino IDE.</li>
                  <li>Chọn bo mạch: <em>Tools → Board → ESP32S3 Dev Module</em> (hoặc loại bo bạn đang dùng).</li>
                  <li>Cắm cáp Type-C vào máy tính, chọn đúng cổng COM và bấm nút <strong>Upload (Ctrl+U)</strong>.</li>
                </ol>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
                <h4 className="font-bold text-indigo-900 dark:text-indigo-300 text-sm mb-1.5 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-indigo-600" /> Cách 2: Nạp Nhanh Trực Tiếp Qua Web (Không Cần Cài IDE)
                </h4>
                <p className="text-slate-600 dark:text-slate-300 mb-2">
                  Bạn có thể biên dịch ra file binary (.bin) và nạp thẳng qua cổng USB của trình duyệt bằng công cụ chuẩn <strong>Espressif ESP Web Tools</strong>:
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href="https://web.esphome.io/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Mở ESP Web Flasher Tool
                  </a>
                  <span className="text-slate-500 text-[11px]">Hỗ trợ Google Chrome & Microsoft Edge</span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer info & CTA */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>
              Device Key <strong className="text-slate-900 dark:text-white">{activeKey}</strong> được mã hóa SHA-256 an toàn trên Hub.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadConfigHeader}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              Tải config.h
            </button>
            <button
              onClick={handleDownloadIno}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" /> Tải Tệp .INO Nạp Ngay
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
