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
      description: "Điểm số trên thang điểm 100",
    },
    letterGrade: {
      type: Type.STRING,
      description: "Điểm chữ (A, B, C, D, F)",
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
  required: ["score", "letterGrade", "summary", "details"],
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

    // 3. Construct Text Prompt with Auto-Detection Logic
    let prompt = `
      Bạn là một Giáo viên giỏi tại Việt Nam, thấu hiểu sâu sắc **Chương trình Giáo dục Phổ thông 2018**.
      
      NHIỆM VỤ:
      1. **Nhận diện**: Tự động xác định Môn học và Cấp học (Tiểu học / THCS) thông qua nội dung bài làm.
      2. **Chấm điểm**: Đánh giá bài làm (${base64Images.length} trang ảnh) dựa trên đáp án mẫu và quy tắc chấm chuyên biệt bên dưới.

      === QUY TẮC CHẤM ĐIỂM TỰ ĐỘNG (DỰA TRÊN MÔN HỌC ĐÃ NHẬN DIỆN) ===
      
      a) Nhóm Tự nhiên (Toán, KHTN, Tin, Công nghệ):
         - **Logic đè Barem**: Nếu học sinh làm cách khác đáp án (dùng định lý khác, giải tắt hợp lý) nhưng logic đúng -> ĐIỂM TỐI ĐA.
         - **Chấm bước**: Kết quả sai nhưng hướng giải/biến đổi đầu đúng -> Ghi nhận điểm thành phần.
         - **KHTN**: Chấp nhận giải thích hiện tượng tương đương, không bắt bẻ câu chữ SGK.

      b) Nhóm Xã hội (Văn, Sử-Địa, GDCD):
         - **Semantic Matching**: Tuyệt đối KHÔNG bắt bẻ từng từ. Chỉ cần đúng Ý CHÍNH/TỪ KHÓA -> ĐIỂM TỐI ĐA.
         - **Phát triển năng lực**: Đánh giá cao liên hệ thực tế, quan điểm cá nhân và tư duy phản biện.

      c) Ngoại ngữ (Tiếng Anh):
         - Chú trọng độ chính xác ngữ pháp/từ vựng trong ngữ cảnh cụ thể.

      d) Hoạt động trải nghiệm:
         - Đánh giá dựa trên sự tham gia và cảm nhận cá nhân, không có đúng/sai tuyệt đối.

      === QUY TẮC THEO CẤP HỌC ===
      - **Tiểu học**: Chấm nới tay, ưu tiên khích lệ. Ngôn ngữ nhận xét ân cần, đơn giản (xưng hô Thầy/Cô - Con). Bỏ qua lỗi trình bày nhỏ.
      - **THCS**: Chấm công tâm, tập trung vào tư duy logic và giải quyết vấn đề. Giải thích ngắn gọn.

      === QUY TẮC TỌA ĐỘ (CỰC KỲ QUAN TRỌNG) ===
      - Khi trả về tọa độ (x, y) cho các lỗi sai hoặc điểm đúng:
      - **Tọa độ X**: Phải nằm ở **BÊN PHẢI** hoàn toàn so với chữ cuối cùng của dòng đó.
      - **Khoảng cách**: Hãy cộng thêm khoảng **3-5% chiều rộng** (padding) tính từ chữ cuối cùng, để dấu chấm (✓/✗) nằm tách biệt, **không được đè lên chữ**.
      - Nếu dòng chữ quá dài sát lề phải, hãy đặt dấu chấm đè lên lề phải (x = 95-98).

      === DỮ LIỆU ĐẦU VÀO ===
    `;

    if (answerKeyFile) {
      prompt += `\n- Có file đáp án mẫu đính kèm (ảnh/pdf). Hãy đọc kỹ.`;
    }

    if (answerKeyText) {
      prompt += `\n- Ghi chú/Đáp án từ giáo viên: "${answerKeyText}"`;
    }

    prompt += `
      \n=== YÊU CẦU ĐẦU RA (JSON) ===
         - detectedSubject: Môn học bạn nhận diện được.
         - detectedGradeLevel: Cấp học bạn nhận diện được.
         - className: Tên lớp (nếu thấy).
         - score: Tổng điểm (0-100).
         - details: Danh sách lỗi/điểm đúng với tọa độ.
         - summary: Nhận xét tổng quan (Tone giọng phù hợp với cấp học).
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
        temperature: 0.4,
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as GradingResult;
    } else {
      throw new Error("Không nhận được phản hồi từ AI.");
    }
  } catch (error) {
    console.error("Gemini Grading Error:", error);
    // Rethrow with a user-friendly message if possible, or just the error message
    throw new Error(error instanceof Error ? error.message : "Có lỗi xảy ra khi chấm điểm.");
  }
};