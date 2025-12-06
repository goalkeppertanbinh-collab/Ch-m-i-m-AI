import React, { useRef, useEffect, useState, useCallback } from 'react';

interface CameraProps {
  onCapture: (imageData: string) => void;
  onCancel: () => void;
}

const Camera: React.FC<CameraProps> = ({ onCapture, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Prefer back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      // Cleanup: Stop all tracks when component unmounts
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Match canvas size to video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Get base64 data
        const imageData = canvas.toDataURL('image/jpeg', 0.85);
        
        // Stop camera immediately after capture to prevent resource drain
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        
        onCapture(imageData);
      }
    }
  }, [onCapture, stream]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
        {error ? (
          <div className="text-white text-center p-4">
            <p className="mb-4">{error}</p>
            <button 
              onClick={onCancel}
              className="bg-gray-700 px-4 py-2 rounded-lg text-sm"
            >
              Quay lại
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        
        {/* Overlay guides */}
        <div className="absolute inset-8 border-2 border-white/50 rounded-lg pointer-events-none"></div>
        <div className="absolute top-4 left-0 right-0 text-center pointer-events-none">
          <span className="bg-black/50 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
            Canh chỉnh bài làm vào khung
          </span>
        </div>
      </div>

      <div className="h-24 bg-black flex items-center justify-around pb-6 pt-2 px-6">
        <button 
          onClick={onCancel}
          className="text-white/80 text-sm font-medium p-2 hover:text-white"
        >
          Hủy
        </button>

        <button
          onClick={handleCapture}
          className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 flex items-center justify-center active:scale-95 transition-transform"
          aria-label="Chụp ảnh"
        >
          <div className="w-14 h-14 rounded-full border-2 border-black"></div>
        </button>

        <div className="w-10"></div> {/* Spacer for symmetry */}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Camera;
