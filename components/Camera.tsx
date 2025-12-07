import React, { useRef, useEffect, useState, useCallback } from 'react';

interface CameraProps {
  onCapture: (imageData: string) => void;
  onCancel: () => void;
  captureCount: number;
}

const Camera: React.FC<CameraProps> = ({ onCapture, onCancel, captureCount }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

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
        
        // Flash effect
        setFlash(true);
        setTimeout(() => setFlash(false), 150);
        
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
          <>
             <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Flash Overlay */}
            <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 ${flash ? 'opacity-70' : 'opacity-0'}`} />
            
            {/* Scanner Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Guide Frame (Approx A4 Ratio) */}
                <div className="w-[80%] aspect-[1/1.414] border-2 border-white/40 rounded-lg relative shadow-2xl">
                    {/* Corners */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg"></div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg"></div>
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg"></div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-lg"></div>
                    
                    {/* Center Crosshair (Optional) */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4">
                        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-white/30"></div>
                        <div className="absolute left-1/2 top-0 h-full w-[1px] bg-white/30"></div>
                    </div>
                </div>
            </div>

            <div className="absolute top-8 left-0 right-0 text-center pointer-events-none">
              <span className="bg-black/60 text-white text-sm px-4 py-2 rounded-full backdrop-blur-md border border-white/10 font-medium">
                Căn chỉnh tài liệu vào khung
              </span>
            </div>
          </>
        )}
      </div>

      <div className="h-32 bg-black flex items-center justify-around pb-8 pt-4 px-6 relative z-10">
        <button 
          onClick={onCancel}
          className="text-white font-medium px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm w-20"
        >
          {captureCount > 0 ? `Xong (${captureCount})` : 'Hủy'}
        </button>

        <button
          onClick={handleCapture}
          className="w-18 h-18 rounded-full bg-white border-[6px] border-gray-300 flex items-center justify-center active:scale-95 transition-transform shadow-lg"
          aria-label="Chụp ảnh"
        >
          <div className="w-16 h-16 rounded-full border-2 border-black/10 bg-white"></div>
        </button>

        <div className="w-20"></div> {/* Spacer for symmetry */}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default Camera;