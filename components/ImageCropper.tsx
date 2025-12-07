import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/imageUtils';

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

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteCallback = useCallback(
    (croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

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
          objectFit="contain"
        />
      </div>

      <div className="bg-black p-6 pb-8 border-t border-gray-800">
        <div className="flex flex-col gap-4">
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