import { Annotation } from "../types";

/**
 * Nén và thay đổi kích thước ảnh để tối ưu hóa tốc độ gửi API.
 */
export const compressImage = (base64Str: string, maxWidth = 1024, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    // Không set crossOrigin cho data URL để tránh lỗi trên một số trình duyệt mobile
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Tính toán kích thước mới giữ nguyên tỷ lệ khung hình
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error("Không thể khởi tạo Canvas context"));
        return;
      }

      // Vẽ ảnh lên canvas với kích thước mới
      ctx.drawImage(img, 0, 0, width, height);

      // Xuất ra base64 mới với định dạng JPEG và chất lượng nén
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = (error) => {
      reject(error);
    };
  });
};

/**
 * Chuyển đổi chuỗi Base64 thành đối tượng File.
 */
export const base64ToFile = (base64: string, filename: string): File => {
  const arr = base64.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

/**
 * Vẽ các dấu chấm (annotations) lên ảnh.
 */
export const drawAnnotationsOnImage = (base64Image: string, annotations: Annotation[]): Promise<string> => {
  return new Promise((resolve) => {
    if (annotations.length === 0) {
      resolve(base64Image);
      return;
    }

    const img = new Image();
    img.src = base64Image;
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(base64Image);
        return;
      }

      ctx.drawImage(img, 0, 0);

      const fontSize = Math.max(20, img.width * 0.05); 
      
      ctx.lineWidth = 3;

      annotations.forEach(ann => {
        const x = (ann.x / 100) * canvas.width;
        const y = (ann.y / 100) * canvas.height;

        if (ann.id === 'auto-score') {
             ctx.textAlign = 'left';
             ctx.textBaseline = 'top';
        } else {
             ctx.textAlign = 'center';
             ctx.textBaseline = 'middle';
        }

        if (ann.type === 'text' && ann.text) {
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.fillStyle = '#dc2626'; 
          ctx.fillText(ann.text, x, y);
        } else if (ann.type === 'correct') {
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.fillStyle = '#16a34a'; 
          ctx.strokeStyle = '#fff';
          ctx.strokeText('✓', x, y);
          ctx.fillText('✓', x, y);
        } else if (ann.type === 'incorrect') {
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.fillStyle = '#dc2626'; 
          ctx.strokeStyle = '#fff';
          ctx.strokeText('✗', x, y);
          ctx.fillText('✗', x, y);
        }
      });

      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    
    img.onerror = () => resolve(base64Image);
  });
};

/**
 * Cắt ảnh dựa trên vùng chọn.
 */
export const getCroppedImg = (imageSrc: string, pixelCrop: { x: number, y: number, width: number, height: number }): Promise<string> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.src = imageSrc;
    
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error("Không thể tạo canvas context"));
        return;
      }

      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );

      resolve(canvas.toDataURL('image/jpeg'));
    };
    
    image.onerror = (error) => {
        console.error("Lỗi load ảnh để crop:", error);
        reject(error);
    };
  });
};

/**
 * Phát hiện vùng nội dung giấy (màu sáng) trên nền tối.
 * Trả về rect {x, y, width, height} (đơn vị pixel trên ảnh gốc)
 */
export const detectPaperBounds = (imageSrc: string): Promise<{x: number, y: number, width: number, height: number} | null> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = imageSrc;
        img.onload = () => {
            try {
                // Resize xuống canvas nhỏ để xử lý nhanh (ví dụ: max 200px)
                const scaleSize = 200;
                const canvas = document.createElement('canvas');
                const scale = Math.min(scaleSize / img.width, scaleSize / img.height);
                canvas.width = img.width * scale;
                canvas.height = img.height * scale;
                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve(null); return; }
                
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const { data, width, height } = imageData;
                
                // Thuật toán đơn giản:
                // Quét từ 4 phía vào trung tâm. Tìm dòng/cột đầu tiên có độ sáng trung bình vượt ngưỡng.
                // Giả định giấy trắng (sáng) trên nền tối.
                
                const getBrightness = (idx: number) => (data[idx] * 0.299 + data[idx+1] * 0.587 + data[idx+2] * 0.114);
                const threshold = 100; // Ngưỡng độ sáng (0-255). Điều chỉnh nếu cần.
                
                let minX = 0, minY = 0, maxX = width, maxY = height;
                
                // Scan Top down
                for (let y = 0; y < height / 2; y++) {
                    let brightCount = 0;
                    for (let x = width * 0.25; x < width * 0.75; x++) { // Check middle 50% horizontally
                        const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
                        if (getBrightness(idx) > threshold) brightCount++;
                    }
                    if (brightCount > (width * 0.5 * 0.3)) { // Nếu > 30% dòng là sáng
                        minY = y;
                        break;
                    }
                }
                
                // Scan Bottom up
                for (let y = height - 1; y > height / 2; y--) {
                    let brightCount = 0;
                    for (let x = width * 0.25; x < width * 0.75; x++) {
                        const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
                        if (getBrightness(idx) > threshold) brightCount++;
                    }
                    if (brightCount > (width * 0.5 * 0.3)) {
                        maxY = y;
                        break;
                    }
                }

                // Scan Left to Right
                for (let x = 0; x < width / 2; x++) {
                    let brightCount = 0;
                    for (let y = height * 0.25; y < height * 0.75; y++) {
                         const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
                         if (getBrightness(idx) > threshold) brightCount++;
                    }
                    if (brightCount > (height * 0.5 * 0.3)) {
                        minX = x;
                        break;
                    }
                }

                // Scan Right to Left
                for (let x = width - 1; x > width / 2; x--) {
                    let brightCount = 0;
                    for (let y = height * 0.25; y < height * 0.75; y++) {
                         const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
                         if (getBrightness(idx) > threshold) brightCount++;
                    }
                    if (brightCount > (height * 0.5 * 0.3)) {
                        maxX = x;
                        break;
                    }
                }
                
                // Scale back to original size
                const detectedRect = {
                    x: minX / scale,
                    y: minY / scale,
                    width: (maxX - minX) / scale,
                    height: (maxY - minY) / scale
                };
                
                // Sanity check: nếu vùng chọn quá nhỏ (< 20% ảnh), trả về null (dùng mặc định)
                if (detectedRect.width < img.width * 0.2 || detectedRect.height < img.height * 0.2) {
                    resolve(null);
                } else {
                    resolve(detectedRect);
                }

            } catch (e) {
                console.warn("Auto detect failed", e);
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
    });
}