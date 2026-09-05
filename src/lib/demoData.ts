import type { SensorData, AIVisionResult, EcosystemAnalysis } from '../types.ts';

export function generateDemoSensorData(prev?: SensorData | null): SensorData {
  const now = new Date().toISOString();
  
  // Base realistic fluctuations
  const prevTds = prev?.tds ?? 420;
  const deltaTds = Math.floor(Math.random() * 11) - 5;
  const newTds = Math.max(150, Math.min(850, prevTds + deltaTds));

  const prevMoist = prev?.soil_moisture ?? 65;
  const deltaMoist = (Math.random() * 2 - 1);
  const newMoist = Math.round(Math.max(30, Math.min(95, prevMoist + deltaMoist)));

  // Random rare water level changes
  const floatLow = prev?.float_low ?? true;
  const floatHigh = prev?.float_high ?? false;

  return {
    device_id: 'ESP32S3_ECO_DEMO',
    timestamp: now,
    tds: newTds,
    soil_moisture: newMoist,
    float_low: floatLow,
    float_high: floatHigh,
    pump1: prev?.pump1 ?? true,
    pump2: prev?.pump2 ?? false,
    buzzer: prev?.buzzer ?? false,
    wifi_rssi: -58 + Math.floor(Math.random() * 8),
    mode: prev?.mode ?? 'AUTO',
  };
}

export function generateDemoVision(): AIVisionResult {
  const coverage = Math.round(72 + (Math.random() * 10 - 5));
  const clusters = Math.round(5 + (Math.random() * 2 - 1));
  return {
    timestamp: new Date().toISOString(),
    duckweed: {
      detected: true,
      coverage,
      status: coverage > 85 ? 'WARNING' : 'NORMAL',
      confidence: 91,
    },
    snail_eggs: {
      detected: true,
      egg_clusters: clusters,
      hatching: 'POSSIBLE',
      confidence: 86,
    },
    notes: 'Mô phỏng Demo: Thảm bèo sinh học lọc nước phát triển tốt, quan sát 5 ổ trứng ốc màu hồng nhạt bám bờ.',
  };
}

export function generateDemoHistory(hours: number = 24): SensorData[] {
  const list: SensorData[] = [];
  const now = Date.now();
  const stepMs = (hours * 3600 * 1000) / 24;

  for (let i = 24; i >= 0; i--) {
    const t = new Date(now - i * stepMs).toISOString();
    const tds = Math.round(410 + Math.sin(i / 2.5) * 50 + (Math.random() * 15 - 7));
    const moist = Math.round(68 + Math.cos(i / 3) * 10 + (Math.random() * 4 - 2));
    list.push({
      device_id: 'ESP32S3_ECO_DEMO',
      timestamp: t,
      tds,
      soil_moisture: moist,
      float_low: true,
      float_high: i % 12 === 0,
      pump1: i % 4 === 0,
      pump2: i % 6 === 0,
      buzzer: false,
      wifi_rssi: -60 + Math.floor(Math.random() * 6),
      mode: 'AUTO',
    });
  }
  return list;
}
