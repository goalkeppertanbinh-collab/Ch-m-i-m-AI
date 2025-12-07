import { Annotation } from "../types";

/**
 * Nén và thay đổi kích thước ảnh để tối ưu hóa tốc độ gửi API.
 * @param base64Str Chuỗi base64 của ảnh gốc.
 * @param maxWidth Chiều rộng tối đa (mặc định 1024px là đủ cho AI đọc văn bản).
 * @param quality Chất lượng nén JPEG (0.0 - 1.0).
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
 * Dùng để chia sẻ qua Navigator Share API.
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
 * Vẽ các dấu chấm (annotations) lên ảnh và trả về base64 mới.
 * Dùng khi Lưu hoặc Chia sẻ để "chốt" kết quả.
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

      // 1. Vẽ ảnh gốc
      ctx.drawImage(img, 0, 0);

      // 2. Vẽ các dấu chấm
      // Thiết lập font và style
      const fontSize = Math.max(20, img.width * 0.05); // Responsive font size
      
      ctx.lineWidth = 3;

      annotations.forEach(ann => {
        const x = (ann.x / 100) * canvas.width;
        const y = (ann.y / 100) * canvas.height;

        // Xử lý căn lề
        if (ann.id === 'auto-score') {
             ctx.textAlign = 'left';
             ctx.textBaseline = 'top';
        } else {
             ctx.textAlign = 'center';
             ctx.textBaseline = 'middle';
        }

        if (ann.type === 'text' && ann.text) {
          // Vẽ Text (Điểm số hoặc ghi chú)
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.fillStyle = '#dc2626'; // Red
          ctx.fillText(ann.text, x, y);
        } else if (ann.type === 'correct') {
          // Vẽ dấu Tick xanh
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.fillStyle = '#16a34a'; // green-600
          ctx.strokeStyle = '#fff';
          ctx.strokeText('✓', x, y);
          ctx.fillText('✓', x, y);
        } else if (ann.type === 'incorrect') {
          // Vẽ dấu X đỏ
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.fillStyle = '#dc2626'; // red-600
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
    // Bỏ crossOrigin="anonymous" vì imageSrc là base64 data URL cục bộ.
    // Việc thêm crossOrigin có thể gây lỗi "tainted canvas" trên một số trình duyệt khi dùng data URI.
    
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error("Không thể tạo canvas context"));
        return;
      }

      // Set width/height to the cropped size
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      // Draw the cropped portion
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

      // Trả về base64
      resolve(canvas.toDataURL('image/jpeg'));
    };
    
    image.onerror = (error) => {
        console.error("Lỗi load ảnh để crop:", error);
        reject(error);
    };
  });
};