import React, { useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg, detectPaperBounds } from '../utils/imageUtils';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedImage: string) => void;
  onCancel: () => void;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ imageSrc, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false); // Trạng thái đang dò tìm biên giấy
  const [hasDetected, setHasDetected] = useState(false); // Đã chạy detect lần đầu chưa

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onMediaLoaded = (mediaSize: { width: number, height: number }) => {
     // Chỉ tự động detect lần đầu tiên khi ảnh load
     if (!hasDetected) {
         handleAutoCrop(mediaSize);
     }
  };

  const onCropCompleteCallback = useCallback(
    (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleAutoCrop = async (size: { width: number, height: number }) => {
      setIsDetecting(true);
      
      // Delay nhẹ để UI render loading state
      await new Promise(r => setTimeout(r, 100));

      const bounds = await detectPaperBounds(imageSrc);
      
      if (bounds) {
          // Tính toán zoom để vùng bounds vừa khít khung nhìn
          // react-easy-crop container mặc định fit ảnh theo chiều dài hoặc rộng.
          // Ta cần tính tỷ lệ giữa kích thước vùng chọn so với kích thước ảnh gốc.
          
          const widthRatio = size.width / bounds.width;
          const heightRatio = size.height / bounds.height;
          
          // Zoom cần thiết để vùng chọn fill màn hình là min của 2 tỉ lệ (để đảm bảo không bị cắt mất phần nào)
          // Tuy nhiên, react-easy-crop zoom=1 là vừa khít toàn bộ ảnh.
          // Nên zoom mới = 1 * tỷ lệ thu phóng của vùng chọn so với ảnh.
          // Ví dụ: Vùng chọn bằng 1/2 ảnh -> Cần zoom 2x.
          let newZoom = Math.min(widthRatio, heightRatio) * 0.9; // 0.9 để chừa chút lề (padding)
          
          // Giới hạn zoom
          newZoom = Math.min(Math.max(newZoom, 1), 10);
          
          setZoom(newZoom);
          
          // Dịch chuyển (pan) để đưa vùng chọn về giữa tâm
          // Crop {x, y} trong thư viện này là độ lệch pixel so với trung tâm.
          // Tâm của ảnh gốc là (size.width/2, size.height/2).
          // Tâm của vùng chọn là (bounds.x + bounds.width/2, bounds.y + bounds.height/2).
          // Cần dịch chuyển ngược lại để tâm vùng chọn trùng tâm màn hình.
          
          const centerX = size.width / 2;
          const centerY = size.height / 2;
          const boundsCenterX = bounds.x + bounds.width / 2;
          const boundsCenterY = bounds.y + bounds.height / 2;
          
          // Logic của react-easy-crop: crop.x positive moves image to right.
          // Nếu tâm vùng chọn nằm bên phải tâm ảnh (boundsCenterX > centerX), ta cần kéo ảnh sang trái -> crop.x âm.
          const offsetX = centerX - boundsCenterX;
          const offsetY = centerY - boundsCenterY;
          
          // Tuy nhiên, giá trị crop x,y bị ảnh hưởng bởi zoom? 
          // react-easy-crop documentation nói crop x/y là "pixels". 
          // Thử nghiệm thực tế: setCrop hoạt động độc lập tương đối.
          setCrop({ x: offsetX, y: offsetY });
      }
      
      setIsDetecting(false);
      setHasDetected(true);
  }

  const handleSave = async () => {
    if (croppedAreaPixels && !isSaving) {
      setIsSaving(true);
      try {
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
        onCropComplete(croppedImage);
      } catch (e) {
        console.error("Lỗi khi cắt ảnh:", e);
        alert("Có lỗi xảy ra khi cắt ảnh. Vui lòng thử lại.");
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="relative flex-1 bg-black overflow-hidden">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={undefined} // Free aspect ratio
          onCropChange={onCropChange}
          onCropComplete={onCropCompleteCallback}
          onZoomChange={onZoomChange}
          onMediaLoaded={onMediaLoaded}
          objectFit="contain"
          showGrid={true}
        />
        
        {/* Helper & Loading Overlay */}
        <div className="absolute top-4 left-0 right-0 pointer-events-none flex flex-col items-center gap-2">
            {isDetecting ? (
                 <span className="bg-indigo-600/90 text-white text-xs px-4 py-2 rounded-full backdrop-blur-md shadow-lg flex items-center gap-2 animate-pulse">
                    <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang tự động căn lề...
                </span>
            ) : (
                <span className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                    Di chuyển và Zoom để cắt vừa nội dung
                </span>
            )}
        </div>
      </div>

      <div className="bg-black p-6 pb-8 border-t border-gray-800 relative z-10">
        <div className="flex flex-col gap-4">
             {/* Detect Button (Manual Trigger) */}
             <div className="flex justify-center">
                 <button 
                    onClick={() => handleAutoCrop({width: croppedAreaPixels?.width || 0, height: croppedAreaPixels?.height || 0})} // Fallback size logic needed if manually triggering, but primarily auto runs
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800 text-indigo-400 text-xs font-bold hover:bg-gray-700 transition-colors border border-gray-700"
                    title="Thử tự động nhận diện lại"
                 >
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813a3.75 3.75 0 0 0 2.576-2.576l.813-2.846A.75.75 0 0 1 9 4.5ZM9 15a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5A.75.75 0 0 1 9 15ZM15 1.5a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5A.75.75 0 0 1 15 1.5Z" clipRule="evenodd" />
                     </svg>
                     Tự động căn lại
                 </button>
             </div>

             {/* Zoom Slider */}
             <div className="flex items-center gap-4 px-2">
                 <span className="text-white text-xs font-bold">Thu nhỏ</span>
                 <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <span className="text-white text-xs font-bold">Phóng to</span>
             </div>

             <div className="flex justify-between gap-4">
                <button
                    onClick={onCancel}
                    disabled={isSaving}
                    className="flex-1 py-3 text-white bg-gray-700 rounded-xl font-medium text-sm disabled:opacity-50"
                >
                    Bỏ qua
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 py-3 text-white bg-indigo-600 rounded-xl font-bold text-sm shadow-lg hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center gap-2"
                >
                    {isSaving ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Đang xử lý...</span>
                        </>
                    ) : (
                        "Xác nhận"
                    )}
                </button>
             </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;