import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { BottomNav, type TabId } from './components/BottomNav.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { EcosystemZonesView } from './components/EcosystemZonesView.tsx';
import { AlarmsView } from './components/AlarmsView.tsx';
import { DevicesProvisioningView } from './components/DevicesProvisioningView.tsx';
import { ConfigModeView } from './components/ConfigModeView.tsx';
import { ChartsView } from './components/ChartsView.tsx';
import { HistoryView } from './components/HistoryView.tsx';
import { CameraAIView } from './components/CameraAIView.tsx';
import { GoogleSheetsView } from './components/GoogleSheetsView.tsx';
import { AlertsPanel } from './components/AlertsPanel.tsx';

import {
  fetchIoTStatus,
  sendIoTCommand,
  fetchHistoryData,
  fetchGoogleSheets,
  requestEcosystemAnalysis,
  requestVisionAnalysis,
  fetchV4ProjectConfig,
  applyV4Config,
  fetchV4Versions,
  rollbackV4Config,
  fetchV4Devices,
  provisionV4Device,
  rotateV4DeviceKey,
  revokeV4DeviceKey,
  fetchV4Alerts,
  acknowledgeV4Alert,
  fetchV4AuditLogs,
} from './lib/api.ts';

import {
  generateDemoSensorData,
  generateDemoVision,
  generateDemoHistory,
} from './lib/demoData.ts';

import {
  DEFAULT_PROJECT,
  DEFAULT_ZONES,
  DEFAULT_SENSORS,
  DEFAULT_ACTUATORS,
  DEFAULT_ALARM_RULES,
  DEFAULT_CONFIG_VERSION,
} from './lib/v4ConfigDefaults.ts';

import type {
  IoTStatus,
  SensorData,
  AIVisionResult,
  EcosystemAnalysis,
  GoogleSheetsData,
  AlertItem,
  Project,
  Zone,
  SensorConfig,
  ActuatorConfig,
  AlarmRule,
  ConfigVersion,
  Device,
  ActiveAlarm,
  AuditLogItem,
  ProjectConfigSnapshot,
} from './types.ts';

export default function App() {
  // Navigation & Mode
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [isConfigMode, setIsConfigMode] = useState<boolean>(false);

  // Runtime Telemetry & Hardware State
  const [status, setStatus] = useState<IoTStatus | null>(null);
  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [historyData, setHistoryData] = useState<SensorData[]>([]);
  const [visionResult, setVisionResult] = useState<AIVisionResult | null>(null);
  const [analysis, setAnalysis] = useState<EcosystemAnalysis | null>(null);
  const [sheetsData, setSheetsData] = useState<GoogleSheetsData | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  // V4 Specification Architecture State
  const [project, setProject] = useState<Project>(DEFAULT_PROJECT);
  const [zones, setZones] = useState<Zone[]>(DEFAULT_ZONES);
  const [sensors, setSensors] = useState<SensorConfig[]>(DEFAULT_SENSORS);
  const [actuators, setActuators] = useState<ActuatorConfig[]>(DEFAULT_ACTUATORS);
  const [alarmRules, setAlarmRules] = useState<AlarmRule[]>(DEFAULT_ALARM_RULES);
  const [activeVersion, setActiveVersion] = useState<ConfigVersion>(DEFAULT_CONFIG_VERSION);
  const [versions, setVersions] = useState<ConfigVersion[]>([DEFAULT_CONFIG_VERSION]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [activeAlarms, setActiveAlarms] = useState<ActiveAlarm[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  // UI Loaders
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedRange, setSelectedRange] = useState('24h');

  // Load all V4 data and legacy runtime data
  const loadInitialData = useCallback(async () => {
    try {
      setIsRefreshing(true);

      // 1. Fetch V4 Project Configuration & System State
      const [v4Config, v4Vers, v4Devs, v4AlertsRes, v4Audit, iotStatus, historyRes, sheetRes] =
        await Promise.all([
          fetchV4ProjectConfig().catch(() => null),
          fetchV4Versions().catch(() => null),
          fetchV4Devices().catch(() => null),
          fetchV4Alerts().catch(() => null),
          fetchV4AuditLogs().catch(() => null),
          fetchIoTStatus().catch(() => null),
          fetchHistoryData(selectedRange).catch(() => ({ data: [] })),
          fetchGoogleSheets().catch(() => null),
        ]);

      if (v4Config) {
        if (v4Config.project) setProject(v4Config.project);
        if (v4Config.zones) setZones(v4Config.zones);
        if (v4Config.sensors) setSensors(v4Config.sensors);
        if (v4Config.actuators) setActuators(v4Config.actuators);
        if (v4Config.alarmRules) setAlarmRules(v4Config.alarmRules);
        if (v4Config.activeVersion) setActiveVersion(v4Config.activeVersion);
      }

      if (v4Vers?.versions) setVersions(v4Vers.versions);
      if (v4Devs?.devices) setDevices(v4Devs.devices);
      if (v4AlertsRes?.activeAlarms) setActiveAlarms(v4AlertsRes.activeAlarms);
      if (v4Audit?.logs) setAuditLogs(v4Audit.logs);

      if (iotStatus) {
        setStatus(iotStatus);
        setSensorData(iotStatus.current_data);
      }

      if (historyRes?.data?.length) {
        setHistoryData(historyRes.data);
      } else {
        setHistoryData(generateDemoHistory(24));
      }

      if (sheetRes) setSheetsData(sheetRes);

      setVisionResult({
        timestamp: new Date().toISOString(),
        duckweed: { detected: true, coverage: 76, status: 'NORMAL', confidence: 89 },
        snail_eggs: { detected: true, egg_clusters: 5, hatching: 'POSSIBLE', confidence: 84 },
        notes: 'AI Vision PC trực tuyến. Thảm bèo phủ 76% mặt nước, phát hiện 5 cụm trứng ốc bươu đen bám bờ.',
      });
    } catch (e) {
      console.error('Lỗi khi tải dữ liệu khởi tạo:', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedRange]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Telemetry simulation or Live polling
  useEffect(() => {
    const interval = setInterval(async () => {
      if (isDemoMode) {
        // Dynamic simulated fluctuations
        setSensorData((prev) => {
          const updated = generateDemoSensorData(prev);
          setHistoryData((hist) => {
            const next = [...hist, updated];
            return next.length > 200 ? next.slice(-200) : next;
          });
          return updated;
        });

        // Slight vision variance
        if (Math.random() < 0.15) {
          setVisionResult(generateDemoVision());
        }
      } else {
        // Live polling from backend
        try {
          const [st, alertsRes] = await Promise.all([
            fetchIoTStatus().catch(() => null),
            fetchV4Alerts().catch(() => null),
          ]);
          if (st) {
            setStatus(st);
            if (st.current_data) setSensorData(st.current_data);
          }
          if (alertsRes?.activeAlarms) {
            setActiveAlarms(alertsRes.activeAlarms);
          }
        } catch (err) {
          console.warn('Polling failure:', err);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isDemoMode]);

  // Evaluate alerts & system health
  useEffect(() => {
    const newAlerts: AlertItem[] = [];
    const nowStr = new Date().toISOString();

    if (!isDemoMode && status && !status.online) {
      newAlerts.push({
        id: 'esp32_offline',
        level: 'error',
        title: 'Mất Kết Nối Phần Cứng ESP32-S3',
        message: 'Không nhận được nhịp tim telemetry trong hơn 30 giây.',
        source: 'ESP32',
        timestamp: nowStr,
      });
    }

    if (sensorData) {
      if (!sensorData.float_low) {
        newAlerts.push({
          id: 'water_low',
          level: 'error',
          title: 'Cạn Nước Dưới Phao LOW',
          message: 'Mực nước tụt xuống dưới phao an toàn đáy hồ. Bơm 1 đã tự động ngắt.',
          source: 'WATER',
          timestamp: nowStr,
        });
      }

      if (sensorData.tds !== null && sensorData.tds > 800) {
        newAlerts.push({
          id: 'tds_high',
          level: 'warning',
          title: 'TDS Nước Vượt 800 ppm',
          message: `Chỉ số TDS đạt ${sensorData.tds} ppm. Cần xả bớt nước đáy và bổ sung nước sạch.`,
          source: 'TDS',
          timestamp: nowStr,
        });
      }

      if (sensorData.soil_moisture !== null && sensorData.soil_moisture < 45) {
        newAlerts.push({
          id: 'soil_low',
          level: 'warning',
          title: 'Độ Ẩm Giá Thể Đất Thấp',
          message: `Độ ẩm chỉ đạt ${sensorData.soil_moisture}%. Kích hoạt Bơm 2 tưới phun sương.`,
          source: 'SOIL',
          timestamp: nowStr,
        });
      }
    }

    setAlerts(newAlerts);
  }, [sensorData, status, isDemoMode]);

  // Handle Actuator commands
  const handleSendCommand = async (cmd: any) => {
    setSensorData((prev) => (prev ? { ...prev, ...cmd } : null));
    if (!isDemoMode) {
      await sendIoTCommand(cmd);
    }
  };

  // Handle AI analysis
  const handleTriggerAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await requestEcosystemAnalysis();
      if (res?.analysis) setAnalysis(res.analysis);
    } catch (err) {
      console.error('Error triggering AI analysis:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle vision capture & analysis
  const handleAnalyzeVision = async (imageBase64?: string) => {
    setIsAnalyzing(true);
    try {
      const res = await requestVisionAnalysis(imageBase64);
      if (res?.result) setVisionResult(res.result);
    } catch (err) {
      console.error('Error analyzing vision:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle Apply Config Version (vN+1)
  const handleApplyConfig = async (snapshot: ProjectConfigSnapshot, description?: string) => {
    const res = await applyV4Config(project.id, { snapshot, description });
    if (res.version) {
      setActiveVersion(res.version);
      setProject(res.version.snapshot.project);
      setZones(res.version.snapshot.zones);
      setSensors(res.version.snapshot.sensors);
      setActuators(res.version.snapshot.actuators);
      setAlarmRules(res.version.snapshot.alarmRules);

      // Refresh versions & audit
      const [vRes, aRes] = await Promise.all([
        fetchV4Versions(project.id).catch(() => null),
        fetchV4AuditLogs().catch(() => null),
      ]);
      if (vRes?.versions) setVersions(vRes.versions);
      if (aRes?.logs) setAuditLogs(aRes.logs);
    }
  };

  // Handle Rollback
  const handleRollback = async (targetVersion: number) => {
    const res = await rollbackV4Config(project.id, targetVersion);
    if (res.version) {
      setActiveVersion(res.version);
      setProject(res.version.snapshot.project);
      setZones(res.version.snapshot.zones);
      setSensors(res.version.snapshot.sensors);
      setActuators(res.version.snapshot.actuators);
      setAlarmRules(res.version.snapshot.alarmRules);

      const [vRes, aRes] = await Promise.all([
        fetchV4Versions(project.id).catch(() => null),
        fetchV4AuditLogs().catch(() => null),
      ]);
      if (vRes?.versions) setVersions(vRes.versions);
      if (aRes?.logs) setAuditLogs(aRes.logs);
    }
  };

  // Handle Provisioning
  const handleProvisionDevice = async (payload: {
    name: string;
    deviceId?: string;
    templateId?: string;
  }) => {
    const res = await provisionV4Device(payload);
    // Refresh devices list
    const dRes = await fetchV4Devices();
    if (dRes.devices) setDevices(dRes.devices);
    return res.result;
  };

  // Handle Key Rotate & Revoke
  const handleRotateKey = async (deviceId: string) => {
    const res = await rotateV4DeviceKey(deviceId);
    const dRes = await fetchV4Devices();
    if (dRes.devices) setDevices(dRes.devices);
    return { newDeviceKey: res.newDeviceKey, keyVersion: res.keyVersion };
  };

  const handleRevokeKey = async (deviceId: string) => {
    await revokeV4DeviceKey(deviceId);
    const dRes = await fetchV4Devices();
    if (dRes.devices) setDevices(dRes.devices);
  };

  // Handle Alarm Acknowledge
  const handleAcknowledgeAlert = async (id: string, note?: string) => {
    await acknowledgeV4Alert(id, note, 'Vận hành viên');
    const aRes = await fetchV4Alerts();
    if (aRes?.activeAlarms) setActiveAlarms(aRes.activeAlarms);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      {/* App Header */}
      <Header
        status={status}
        sensorData={sensorData}
        isDemoMode={isDemoMode}
        onToggleDemoMode={() => setIsDemoMode(!isDemoMode)}
        activeAlertCount={activeAlarms.filter((a) => a.state === 'ACTIVE').length + alerts.length}
        onOpenAlerts={() => setActiveTab('alarms')}
        onRefresh={loadInitialData}
        isRefreshing={isRefreshing}
        onOpenConfigMode={() => setIsConfigMode(!isConfigMode)}
        isConfigMode={isConfigMode}
      />

      {/* Navigation (5 Mobile Tabs & Desktop Sub-bar) */}
      {!isConfigMode && (
        <BottomNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          activeAlertCount={activeAlarms.filter((a) => a.state === 'ACTIVE').length}
          onOpenConfigMode={() => setIsConfigMode(true)}
          isConfigMode={isConfigMode}
        />
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3.5 sm:p-6">
        {/* ------------------------------------------------------------------ */}
        {/* CONFIGURATION MODE (Settings / Display Builder / Versions) */}
        {/* ------------------------------------------------------------------ */}
        {isConfigMode ? (
          <ConfigModeView
            project={project}
            zones={zones}
            sensors={sensors}
            actuators={actuators}
            alarmRules={alarmRules}
            activeVersion={activeVersion}
            versions={versions}
            auditLogs={auditLogs}
            onApplyConfig={handleApplyConfig}
            onRollback={handleRollback}
            onExitConfigMode={() => setIsConfigMode(false)}
            isLoading={isRefreshing}
          />
        ) : (
          <>
            {/* ------------------------------------------------------------------ */}
            {/* 1. OVERVIEW TAB (Dashboard runtime summary) */}
            {/* ------------------------------------------------------------------ */}
            {(activeTab === 'overview' || activeTab === 'dashboard') && (
              <DashboardView
                status={status}
                sensorData={sensorData}
                visionResult={visionResult}
                analysis={analysis}
                isAnalyzing={isAnalyzing}
                onTriggerAnalysis={handleTriggerAnalysis}
                onTogglePump1={() => handleSendCommand({ pump1: !sensorData?.pump1 })}
                onTogglePump2={() => handleSendCommand({ pump2: !sensorData?.pump2 })}
                onToggleBuzzer={() => handleSendCommand({ buzzer: !sensorData?.buzzer })}
                onSelectTab={(tab) => {
                  if (tab === 'control') setActiveTab('ecosystem');
                  else setActiveTab(tab);
                }}
                isDemoMode={isDemoMode}
              />
            )}

            {/* ------------------------------------------------------------------ */}
            {/* 2. ECOSYSTEM ZONES TAB (5 Ecological zones & 2-step verification commands) */}
            {/* ------------------------------------------------------------------ */}
            {(activeTab === 'ecosystem' || activeTab === 'control') && (
              <EcosystemZonesView
                status={status}
                sensorData={sensorData}
                visionResult={visionResult}
                zones={zones}
                sensors={sensors}
                actuators={actuators}
                onSendCommand={handleSendCommand}
                isDemoMode={isDemoMode}
              />
            )}

            {/* ------------------------------------------------------------------ */}
            {/* 3. AI VISION TAB (Duckweed % and snail egg clusters) */}
            {/* ------------------------------------------------------------------ */}
            {activeTab === 'vision' && (
              <CameraAIView
                visionResult={visionResult}
                onAnalyzeImage={handleAnalyzeVision}
                isAnalyzing={isAnalyzing}
              />
            )}

            {/* ------------------------------------------------------------------ */}
            {/* 4. ALARMS & HYSTERESIS TAB */}
            {/* ------------------------------------------------------------------ */}
            {activeTab === 'alarms' && (
              <AlarmsView
                alarms={activeAlarms}
                rules={alarmRules}
                onAcknowledge={handleAcknowledgeAlert}
                isLoading={isRefreshing}
              />
            )}

            {/* ------------------------------------------------------------------ */}
            {/* 5. DEVICES & PROVISIONING WIZARD TAB */}
            {/* ------------------------------------------------------------------ */}
            {activeTab === 'devices' && (
              <DevicesProvisioningView
                devices={devices}
                onProvisionDevice={handleProvisionDevice}
                onRotateKey={handleRotateKey}
                onRevokeKey={handleRevokeKey}
                onRefresh={loadInitialData}
                isLoading={isRefreshing}
              />
            )}

            {/* ------------------------------------------------------------------ */}
            {/* SECONDARY SCREENS (Accessible via desktop sub-bar or mobile More) */}
            {/* ------------------------------------------------------------------ */}
            {activeTab === 'charts' && (
              <ChartsView
                historyData={historyData}
                selectedRange={selectedRange}
                onSelectRange={setSelectedRange}
                isLoading={isRefreshing}
              />
            )}

            {activeTab === 'history' && (
              <HistoryView
                historyData={historyData}
                selectedRange={selectedRange}
                onSelectRange={setSelectedRange}
                onRefresh={loadInitialData}
                isLoading={isRefreshing}
              />
            )}

            {activeTab === 'sheets' && (
              <GoogleSheetsView
                sheetsData={sheetsData}
                onConnect={async (url) => {
                  const data = await fetchGoogleSheets(url);
                  setSheetsData(data);
                }}
                isLoading={isRefreshing}
              />
            )}

            {activeTab === 'settings' && (
              <div className="bg-white rounded-xl p-6 border border-slate-200 text-center space-y-3">
                <h3 className="text-base font-bold text-slate-900">
                  Cài Đặt Đã Được Tích Hợp Vào Chế Độ Cấu Hình V4.0
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Theo tiêu chuẩn V4.0, cấu hình hệ thống, ngưỡng cảm biến, Display Builder và phiên bản được quản lý tập trung trong Chế Độ Cấu Hình.
                </p>
                <button
                  onClick={() => setIsConfigMode(true)}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs shadow-xs cursor-pointer min-h-[44px]"
                >
                  Mở Chế Độ Cấu Hình (Configuration Mode)
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Alerts Panel dialog */}
      <AlertsPanel
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        onDismissAlert={(id) => setAlerts((prev) => prev.filter((a) => a.id !== id))}
        onClearAll={() => setAlerts([])}
        onSelectTab={(tab) => {
          setIsAlertsOpen(false);
          setActiveTab(tab);
        }}
      />
    </div>
  );
}
