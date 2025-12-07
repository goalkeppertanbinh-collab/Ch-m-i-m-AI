import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GradingResult } from "../types";

// Lazy initialization to prevent top-level crashes on mobile/browsers
// where process.env might be undefined during initial load.
let ai: GoogleGenAI | null = null;

const getAIClient = () => {
  if (!ai) {
    // API_KEY is expected to be defined by the build environment (e.g., Vercel)
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key chưa được cấu hình. Vui lòng kiểm tra biến môi trường.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

const gradingSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    score: {
      type: Type.NUMBER,
      description: "Tổng số điểm học sinh đạt được (Số thực, ví dụ: 8.25, 9.5).",
    },
    maxScore: {
      type: Type.NUMBER,
      description: "Tổng điểm tối đa của bài thi dựa trên file đáp án/thang điểm (thường là 10, 20, 40, 50 hoặc 100).",
    },
    letterGrade: {
      type: Type.STRING,
      description: "Điểm chữ quy đổi (A, B, C, D, F)",
    },
    summary: {
      type: Type.STRING,
      description: "Nhận xét tổng quan ngắn gọn về bài làm bằng tiếng Việt.",
    },
    className: {
      type: Type.STRING,
      description: "Tên lớp học trích xuất từ ảnh bài làm (ví dụ: 'Lớp 5A', '9B', '12A1'). Nếu không thấy, để trống.",
      nullable: true
    },
    detectedGradeLevel: {
      type: Type.STRING,
      description: "Trình độ ước lượng của bài làm (Tiểu học / THCS)",
    },
    detectedSubject: {
      type: Type.STRING,
      description: "Môn học ước lượng của bài làm (Toán / Văn / Anh / KHTN / Lịch sử Địa lí...)",
    },
    details: {
      type: Type.ARRAY,
      description: "Danh sách chi tiết các lỗi sai và điểm đúng.",
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING, description: "Nội dung gốc trong ảnh (nếu có lỗi)" },
          correction: { type: Type.STRING, description: "Nội dung sửa lại cho đúng" },
          explanation: { type: Type.STRING, description: "Giải thích ngắn gọn." },
          isCorrect: { type: Type.BOOLEAN, description: "True nếu phần này làm đúng, False nếu sai" },
          x: { type: Type.INTEGER, description: "Ước lượng tọa độ X (0-100). QUAN TRỌNG: Phải đặt ở BÊN PHẢI nội dung và CÁCH RA một khoảng trống." },
          y: { type: Type.INTEGER, description: "Ước lượng tọa độ Y tâm điểm dòng nội dung này (thang 0-100 từ trên xuống dưới)" },
          pageIndex: { type: Type.INTEGER, description: "Chỉ số của trang chứa nội dung này (bắt đầu từ 0 cho ảnh đầu tiên, 1 cho ảnh thứ hai...)" }
        },
        required: ["original", "correction", "explanation", "isCorrect", "x", "y", "pageIndex"]
      }
    }
  },
  required: ["score", "maxScore", "letterGrade", "summary", "details"],
};

export const gradeSubmission = async (
  base64Images: string[],
  answerKeyText: string,
  answerKeyFile: { mimeType: string, data: string } | undefined
): Promise<GradingResult> => {
  try {
    const client = getAIClient();
    const parts = [];

    // 1. Add Student Work Images (Clean base64)
    base64Images.forEach(img => {
        const cleanStudentImage = img.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, "");
        parts.push({ inlineData: { mimeType: "image/jpeg", data: cleanStudentImage } });
    });

    // 2. Add Answer Key File if provided
    if (answerKeyFile) {
      // Clean base64 header from answer key file
      const cleanKeyData = answerKeyFile.data.replace(/^data:(.*);base64,/, "");
      parts.push({ inlineData: { mimeType: answerKeyFile.mimeType, data: cleanKeyData } });
    }

    // 3. Construct Text Prompt with Advanced Logic
    let prompt = `
      Bạn là một Giám khảo chấm thi chuyên nghiệp và tỉ mỉ.
      
      NHIỆM VỤ CHÍNH:
      1. **Phân tích File Đáp án/Tiêu chí (Nếu có):**
         - Hãy phân biệt rõ đâu là **ĐỀ BÀI** (Câu hỏi) và đâu là **HƯỚNG DẪN CHẤM/THANG ĐIỂM**.
         - **Xác định Max Score (Tổng điểm tối đa):** Cộng tổng tất cả điểm số trong thang điểm. Đừng mặc định là 10. Nếu thang điểm là 20 câu trắc nghiệm (mỗi câu 0.2) -> Tổng là 4. Nếu thang 100 -> Tổng là 100.
      
      2. **Quy tắc Số học & Điểm lẻ:**
         - **Nhận diện số thập phân:** Hiểu rằng "0,25" và "0.25" là như nhau.
         - **Cộng điểm chính xác:** Khi chấm, hãy cộng điểm từng phần nhỏ (0.25, 0.5, 0.75). Tuyệt đối không làm tròn bừa bãi. 
         - Ví dụ: Câu 1 đúng nửa ý (0.5đ), câu 2 sai, câu 3 đúng (1đ) => Tổng 1.5.

      3. **Đối chiếu Bài làm & Đáp án:**
         - So sánh nội dung bài làm của học sinh với đáp án mẫu.
         - Nếu học sinh chỉ làm 1 bài trong file ảnh, chỉ chấm bài đó dựa trên phần điểm tương ứng trong thang điểm.
      
      === QUY TẮC CHẤM THEO MÔN HỌC ===
      - **Tự nhiên (Toán, Lý, Hóa):** Chấm theo bước (step-by-step). Kết quả sai nhưng hướng đúng vẫn có thể có điểm thành phần (nếu thang điểm cho phép). Logic đúng khác đáp án vẫn trọn điểm.
      - **Xã hội (Văn, Sử, Địa):** Chấm theo ý (Key ideas). Không bắt bẻ từng từ.
      - **Trắc nghiệm:** So khớp chính xác đáp án (A, B, C, D).

      === QUY TẮC TRẢ VỀ TỌA ĐỘ (VISUAL FEEDBACK) ===
      - Khi trả về tọa độ (x, y) cho các lỗi sai hoặc điểm đúng:
      - **Tọa độ X**: Phải nằm ở **BÊN PHẢI** hoàn toàn so với chữ cuối cùng của dòng đó.
      - **Khoảng cách**: Hãy cộng thêm khoảng **3-5% chiều rộng** (padding) tính từ chữ cuối cùng, để dấu chấm (✓/✗) nằm tách biệt, **không được đè lên chữ**.
      - Nếu dòng chữ quá dài sát lề phải, hãy đặt dấu chấm đè lên lề phải (x = 95-98).

      === DỮ LIỆU ĐẦU VÀO ===
    `;

    if (answerKeyFile) {
      prompt += `\n- Có file đính kèm (chứa Đề/Đáp án/Thang điểm). Hãy đọc kỹ cấu trúc của nó.`;
    }

    if (answerKeyText) {
      prompt += `\n- Ghi chú/Đáp án bổ sung từ giáo viên: "${answerKeyText}"`;
    }

    prompt += `
      \n=== YÊU CẦU ĐẦU RA (JSON) ===
         - detectedSubject: Môn học.
         - detectedGradeLevel: Cấp học.
         - className: Tên lớp.
         - maxScore: Tổng điểm tối đa của đề thi (VD: 10, 20, 100).
         - score: Tổng điểm học sinh đạt được (VD: 7.25, 8.5).
         - details: Chi tiết lỗi/đúng kèm tọa độ.
         - summary: Nhận xét.
    `;

    parts.push({ text: prompt });

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: parts,
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: gradingSchema,
        temperature: 0.2, // Giảm temperature để tính toán số học chính xác hơn
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as GradingResult;
    } else {
      throw new Error("Không nhận được phản hồi từ AI.");
    }
  } catch (error) {
    console.error("Gemini Grading Error:", error);
    throw new Error(error instanceof Error ? error.message : "Có lỗi xảy ra khi chấm điểm.");
  }
};