import { Annotation } from "../types";

/**
 * Nén và thay đổi kích thước ảnh để tối ưu hóa tốc độ gửi API.
 */
export const compressImage = (base64Str: string, maxWidth = 1024, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    
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

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = (error) => {
      reject(error);
    };
  });
};

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
 * Phát hiện biên giấy bằng thuật toán dò cạnh (Simple Edge Detection).
 * Thay vì chỉ tìm độ sáng, ta tìm sự thay đổi độ tương phản.
 */
export const detectPaperBounds = (imageSrc: string): Promise<{x: number, y: number, width: number, height: number} | null> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = imageSrc;
        img.onload = () => {
            try {
                // 1. Resize xuống kích thước nhỏ để xử lý nhanh (ví dụ: chiều rộng 400px)
                const processingWidth = 400;
                const scale = processingWidth / img.width;
                const processingHeight = Math.round(img.height * scale);

                const canvas = document.createElement('canvas');
                canvas.width = processingWidth;
                canvas.height = processingHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve(null); return; }
                
                // Vẽ ảnh lên canvas nhỏ
                ctx.drawImage(img, 0, 0, processingWidth, processingHeight);
                const imageData = ctx.getImageData(0, 0, processingWidth, processingHeight);
                const { data, width, height } = imageData;
                
                // 2. Dò cạnh (Edge Detection) đơn giản
                // Duyệt qua pixel, nếu sự chênh lệch màu với pixel bên cạnh > ngưỡng -> Đó là cạnh
                const edgePointsX: number[] = [];
                const edgePointsY: number[] = [];
                const threshold = 30; // Ngưỡng chênh lệch màu sắc (0-255)

                // Hàm lấy giá trị Grayscale của pixel
                const getGray = (i: number) => 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

                // Quét để tìm các điểm biên
                // Bước nhảy (step) = 4 để tăng tốc độ
                for (let y = 5; y < height - 5; y += 4) {
                    for (let x = 5; x < width - 5; x += 4) {
                        const i = (y * width + x) * 4;
                        const gray = getGray(i);

                        // So sánh với pixel bên phải (x+2) và bên dưới (y+2)
                        const iRight = (y * width + (x + 2)) * 4;
                        const iDown = ((y + 2) * width + x) * 4;
                        
                        const diffRight = Math.abs(gray - getGray(iRight));
                        const diffDown = Math.abs(gray - getGray(iDown));

                        // Nếu chênh lệch lớn -> Đây là cạnh
                        if (diffRight > threshold || diffDown > threshold) {
                            edgePointsX.push(x);
                            edgePointsY.push(y);
                        }
                    }
                }

                if (edgePointsX.length < 50) { // Không tìm thấy đủ cạnh
                    resolve(null);
                    return;
                }

                // 3. Tìm vùng bao quanh các điểm cạnh (Bounding Box)
                // Loại bỏ nhiễu bằng cách lấy percentile (bỏ 5% ngoại lai ở mỗi phía)
                edgePointsX.sort((a, b) => a - b);
                edgePointsY.sort((a, b) => a - b);

                const cropMinX = edgePointsX[Math.floor(edgePointsX.length * 0.05)];
                const cropMaxX = edgePointsX[Math.floor(edgePointsX.length * 0.95)];
                const cropMinY = edgePointsY[Math.floor(edgePointsY.length * 0.05)];
                const cropMaxY = edgePointsY[Math.floor(edgePointsY.length * 0.95)];

                let detectedRect = {
                    x: cropMinX,
                    y: cropMinY,
                    width: cropMaxX - cropMinX,
                    height: cropMaxY - cropMinY
                };

                // Kiểm tra sanity: Nếu vùng chọn quá nhỏ hoặc quá to (gần bằng ảnh gốc), có thể là nhiễu hoặc không cần crop
                // Tuy nhiên, với camscan, nếu không tìm thấy rõ, ta thường crop vào khoảng 10% lề.
                
                // Nếu detect quá nhỏ (< 30% diện tích), fallback về crop mặc định an toàn (inset 10%)
                const areaRatio = (detectedRect.width * detectedRect.height) / (width * height);
                if (areaRatio < 0.2) {
                     detectedRect = {
                         x: width * 0.1,
                         y: height * 0.1,
                         width: width * 0.8,
                         height: height * 0.8
                     };
                }

                // 4. Scale ngược lại kích thước gốc
                resolve({
                    x: detectedRect.x / scale,
                    y: detectedRect.y / scale,
                    width: detectedRect.width / scale,
                    height: detectedRect.height / scale
                });

            } catch (e) {
                console.warn("Auto detect failed", e);
                resolve(null);
            }
        };
        img.onerror = () => resolve(null);
    });
}