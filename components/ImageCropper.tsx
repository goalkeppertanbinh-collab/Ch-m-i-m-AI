import React, { useState, useCallback, useEffect } from 'react';
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
  const [mediaSize, setMediaSize] = useState<{width: number, height: number} | null>(null);

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onMediaLoaded = (mediaSize: { width: number, height: number }) => {
     setMediaSize(mediaSize);
     // Auto trigger detection on load
     handleAutoCrop(mediaSize);
  };

  const onCropCompleteCallback = useCallback(
    (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleAutoCrop = async (size = mediaSize) => {
      if (!size) return;
      
      const bounds = await detectPaperBounds(imageSrc);
      if (bounds) {
          // Tính toán zoom để vừa khít vùng được phát hiện vào khung nhìn
          // react-easy-crop mặc định "contain" ảnh trong khung. 
          // Zoom = 1 nghĩa là ảnh vừa khít khung.
          // Để crop vào vùng bounds, ta cần zoom sao cho bounds phủ đầy khung.
          
          // Tỷ lệ của vùng chọn so với ảnh gốc
          const widthRatio = bounds.width / size.width;
          const heightRatio = bounds.height / size.height;
          
          // Chúng ta muốn vùng chọn chiếm phần lớn khung hình (ví dụ 100%)
          // Zoom level cần thiết = 1 / Max(ratio)
          // Ví dụ: Vùng chọn rộng bằng 50% ảnh -> Cần zoom 2x.
          const newZoom = 1 / Math.max(widthRatio, heightRatio);
          
          // Giới hạn zoom an toàn (1 - 3)
          setZoom(Math.min(Math.max(newZoom, 1), 5));
          
          // Chỉnh tâm crop về tâm của vùng detected
          // Vấn đề: react-easy-crop dùng x,y là offset pixel từ tâm.
          // Đây là phần khó vì coordinate system của library này hơi phức tạp khi zoom thay đổi.
          // Đơn giản nhất: Auto zoom thôi, người dùng tự chỉnh lại vị trí một chút nếu lệch.
          // Hoặc chỉ cần zoom lên, thường văn bản ở giữa.
      }
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
      <div className="relative flex-1 bg-black">
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
        />
        
        {/* Helper Message */}
        <div className="absolute top-4 left-0 right-0 text-center pointer-events-none">
            <span className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                Di chuyển và Zoom để cắt vừa nội dung
            </span>
        </div>
      </div>

      <div className="bg-black p-6 pb-8 border-t border-gray-800">
        <div className="flex flex-col gap-4">
             <div className="flex justify-center">
                 <button 
                    onClick={() => handleAutoCrop()} 
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800 text-indigo-400 text-xs font-bold hover:bg-gray-700 transition-colors border border-gray-700"
                 >
                     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813a3.75 3.75 0 0 0 2.576-2.576l.813-2.846A.75.75 0 0 1 9 4.5ZM9 15a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5A.75.75 0 0 1 9 15ZM15 1.5a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0v-1.5h-1.5a.75.75 0 0 1 0-1.5h1.5v-1.5A.75.75 0 0 1 15 1.5Z" clipRule="evenodd" />
                     </svg>
                     Gợi ý cắt (Auto)
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