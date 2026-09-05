import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Scan,
  Sparkles,
  Upload,
  Video,
  AlertTriangle,
  Egg,
} from 'lucide-react';
import type { AIVisionResult } from '../types.ts';

interface CameraAIViewProps {
  visionResult: AIVisionResult | null;
  onAnalyzeImage: (imageBase64?: string) => Promise<void>;
  isAnalyzing: boolean;
}

export const CameraAIView: React.FC<CameraAIViewProps> = ({
  visionResult,
  onAnalyzeImage,
  isAnalyzing,
}) => {
  const [cameraMode, setCameraMode] = useState<'simulated' | 'webcam'>('simulated');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop webcam stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Toggle webcam
  const handleToggleWebcam = async () => {
    if (cameraMode === 'webcam') {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setCameraMode('simulated');
      setWebcamError(null);
    } else {
      try {
        setWebcamError(null);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraMode('webcam');
      } catch (err: any) {
        setWebcamError('Không thể mở Webcam trình duyệt. Vui lòng cho phép quyền camera hoặc sử dụng chế độ mô phỏng.');
        setCameraMode('simulated');
      }
    }
  };

  // Capture frame
  const handleCapture = () => {
    if (cameraMode === 'webcam' && videoRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);
      }
    } else {
      // Create representative captured frame from simulated pool
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 420;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Gradient water background
        const grad = ctx.createLinearGradient(0, 0, 640, 420);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(0.5, '#064e3b');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 420);

        // Draw duckweed patches
        ctx.fillStyle = '#10b981';
        for (let i = 0; i < 90; i++) {
          const x = 30 + Math.random() * 580;
          const y = 30 + Math.random() * 360;
          const r = 6 + Math.random() * 12;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw snail egg clusters (pink clusters on pond wall)
        ctx.fillStyle = '#f472b6';
        const clusterPositions = [
          [80, 70],
          [130, 85],
          [520, 110],
          [560, 95],
          [310, 50],
        ];
        clusterPositions.forEach(([cx, cy]) => {
          for (let j = 0; j < 18; j++) {
            const ex = cx + (Math.random() * 20 - 10);
            const ey = cy + (Math.random() * 20 - 10);
            ctx.beginPath();
            ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // Add visual text tag
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px monospace';
        ctx.fillText('ECOSYSTEM_CAMERA_SNAPSHOT: ' + new Date().toISOString(), 20, 400);

        setCapturedImage(canvas.toDataURL('image/jpeg'));
      }
    }
  };

  // Upload custom image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCapturedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    await onAnalyzeImage(capturedImage || undefined);
  };

  return (
    <div className="space-y-6 pb-20 sm:pb-6 max-w-5xl mx-auto">
      {/* Title Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-700">
            <Camera className="w-5 h-5 text-slate-800" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900">
              CAMERA AI - AI VISION PC
            </h2>
            <p className="text-xs text-slate-500">
              Nhận diện quang học độ che phủ thảm bèo và phát hiện cụm trứng ốc bươu đen
            </p>
          </div>
        </div>

        {/* Source Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleWebcam}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              cameraMode === 'webcam'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-sm'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>{cameraMode === 'webcam' ? 'Tắt Webcam' : 'Bật Webcam'}</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors shadow-sm">
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Tải Ảnh</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>

      {webcamError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{webcamError}</span>
        </div>
      )}

      {/* Viewport & Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Camera Feed Viewport (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Nguồn: {cameraMode === 'webcam' ? 'Webcam Thực' : 'Camera Bể Sinh Thái (Live Feed)'}
            </span>
            <span>1280x720 • 15 FPS</span>
          </div>

          {/* Video / Image Display Canvas */}
          <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-slate-950 border border-slate-200 flex items-center justify-center group">
            {cameraMode === 'webcam' ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : capturedImage ? (
              <img
                src={capturedImage}
                alt="Captured ecosystem"
                className="w-full h-full object-cover"
              />
            ) : (
              /* Simulated High-Res Pool View */
              <div className="w-full h-full bg-slate-900 relative overflow-hidden flex flex-col items-center justify-center p-6">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_2px,transparent_2px)] [background-size:16px_16px]" />
                
                {/* Floating duckweed simulation clusters */}
                <div className="relative z-10 text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-medium">
                    <Scan className="w-3.5 h-3.5 animate-pulse" />
                    AI Vision PC Online: Giám sát vùng mặt nước
                  </div>
                  <p className="text-xs text-slate-300 max-w-sm">
                    Khung hình phát hiện: Thảm bèo tấm phủ 76% mặt bể. Phát hiện 5 cụm trứng ốc bươu đen trên thành bể.
                  </p>
                </div>

                {/* Target boxes overlay simulation */}
                <div className="absolute top-12 left-16 border border-dashed border-emerald-400 bg-emerald-500/20 rounded p-1.5 text-[10px] text-emerald-300 font-mono">
                  [Thảm Bèo: 76%]
                </div>
                <div className="absolute bottom-16 right-16 border border-dashed border-pink-400 bg-pink-500/20 rounded p-1.5 text-[10px] text-pink-300 font-mono">
                  [Trứng Ốc: 5 Cụm]
                </div>
              </div>
            )}

            {/* Target Crosshairs Overlay */}
            <div className="absolute inset-0 pointer-events-none border border-white/20 m-3 rounded flex flex-col justify-between p-2">
              <div className="flex justify-between text-[10px] font-mono text-white/70">
                <span>+ VISION_AI_FEED</span>
                <span>LIVE ●</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-white/70">
                <span>SYS: NORMAL</span>
                <span>FPS: 15.0</span>
              </div>
            </div>
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {/* Action Buttons: CAPTURE & ANALYZE */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={handleCapture}
              className="py-2.5 px-4 rounded-lg bg-white hover:bg-slate-50 text-slate-800 font-medium text-xs border border-slate-200 shadow-sm transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-slate-600" />
              <span>CHỤP ẢNH</span>
            </button>

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className={`w-4 h-4 text-emerald-400 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Đang phân tích...' : 'PHÂN TÍCH AI'}</span>
            </button>
          </div>
        </div>

        {/* Right: AI Vision Detection Results (5 Cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                <Scan className="w-4 h-4 text-slate-700" />
                Kết Quả AI Vision PC Cung Cấp
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                ACTIVE
              </span>
            </div>

            {/* Spec Section 12 Exact Format Example Box 1: Bèo */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-4 space-y-2 mb-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-sm text-slate-900">
                  Bèo
                </span>
                <span className="text-xs text-slate-500">
                  Confidence: <strong className="text-slate-900 font-mono">{visionResult?.duckweed.confidence ?? 89}%</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 font-mono">
                <div>
                  <span className="text-slate-500 font-sans">Detected:</span>{' '}
                  <strong className="text-emerald-700 font-sans">
                    {visionResult?.duckweed.detected ? 'YES' : 'NO'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 font-sans">Coverage:</span>{' '}
                  <strong className="text-slate-900 font-sans">
                    {visionResult?.duckweed.coverage ?? 76}%
                  </strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 font-sans">Status:</span>{' '}
                  <strong
                    className={
                      visionResult?.duckweed.status === 'NORMAL'
                        ? 'text-emerald-700 font-sans'
                        : 'text-amber-700 font-sans'
                    }
                  >
                    {visionResult?.duckweed.status ?? 'NORMAL'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Spec Section 12 Exact Format Example Box 2: Trứng Ốc */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                  <Egg className="w-4 h-4 text-pink-600" />
                  Trứng ốc
                </span>
                <span className="text-xs text-slate-500">
                  Confidence: <strong className="text-slate-900 font-mono">{visionResult?.snail_eggs.confidence ?? 84}%</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 font-mono">
                <div>
                  <span className="text-slate-500 font-sans">Detected:</span>{' '}
                  <strong className="text-pink-700 font-sans">
                    {visionResult?.snail_eggs.detected ? 'YES' : 'NO'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 font-sans">Egg clusters:</span>{' '}
                  <strong className="text-slate-900 font-sans">
                    {visionResult?.snail_eggs.egg_clusters ?? 5}
                  </strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 font-sans">Hatching:</span>{' '}
                  <strong className="text-amber-700 font-sans">
                    {visionResult?.snail_eggs.hatching ?? 'POSSIBLE'}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Notes & Timestamp */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="text-slate-800 font-medium">Ghi chú AI:</p>
            <p className="italic leading-relaxed">{visionResult?.notes || 'Chưa có ghi chú'}</p>
            <p className="text-[11px] text-slate-400 pt-1">
              Thời gian phân tích:{' '}
              {visionResult?.timestamp
                ? new Date(visionResult.timestamp).toLocaleString('vi-VN')
                : '--'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
