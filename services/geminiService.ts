import { GoogleGenAI, Type, Schema } from "@google/genai";
import { GradingResult } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    details: {
      type: Type.ARRAY,
      description: "Danh sách chi tiết các lỗi sai và điểm đúng.",
      items: {
        type: Type.OBJECT,
        properties: {
          original: { type: Type.STRING, description: "Nội dung gốc trong ảnh (nếu có lỗi)" },
          correction: { type: Type.STRING, description: "Nội dung sửa lại cho đúng" },
          explanation: { type: Type.STRING, description: "Giải thích ngắn gọn tại sao sai hoặc khen ngợi nếu đúng" },
          isCorrect: { type: Type.BOOLEAN, description: "True nếu phần này làm đúng, False nếu sai" }
        },
        required: ["original", "correction", "explanation", "isCorrect"]
      }
    }
  },
  required: ["score", "letterGrade", "summary", "details"],
};

export const gradeSubmission = async (
  base64Image: string,
  answerKeyText: string,
  answerKeyFile?: { mimeType: string, data: string }
): Promise<GradingResult> => {
  try {
    const parts = [];

    // 1. Add Student Work Image (Clean base64)
    const cleanStudentImage = base64Image.replace(/^data:image\/(png|jpg|jpeg|webp);base64,/, "");
    parts.push({ inlineData: { mimeType: "image/jpeg", data: cleanStudentImage } });

    // 2. Add Answer Key File if provided
    if (answerKeyFile) {
      // Clean base64 header from answer key file
      const cleanKeyData = answerKeyFile.data.replace(/^data:(.*);base64,/, "");
      parts.push({ inlineData: { mimeType: answerKeyFile.mimeType, data: cleanKeyData } });
    }

    // 3. Construct Text Prompt
    let prompt = `
      Bạn là một giáo viên người Việt Nam nghiêm khắc nhưng công tâm.
      Nhiệm vụ của bạn là chấm điểm bài làm (hình ảnh thứ nhất) dựa trên đáp án mẫu.
    `;

    if (answerKeyFile) {
      prompt += `\nLƯU Ý: Đáp án mẫu nằm trong file đính kèm thứ 2 (ảnh hoặc PDF). Hãy đọc kỹ file đó để lấy tiêu chí chấm.`;
    }

    if (answerKeyText) {
      prompt += `\n\nĐÁP ÁN MẪU / GHI CHÚ BỔ SUNG TỪ NGƯỜI DÙNG:\n"${answerKeyText}"`;
    }

    prompt += `
      \nYêu cầu:
      1. Phân tích kỹ hình ảnh bài làm của học sinh.
      2. So sánh đối chiếu cẩn thận với đáp án mẫu (từ file đính kèm hoặc văn bản).
      3. Chỉ ra lỗi sai cụ thể (chính tả, ngữ pháp, tính toán, logic).
      4. Chấm điểm trên thang 100.
      5. Phản hồi hoàn toàn bằng Tiếng Việt.
    `;

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
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
    throw new Error("Có lỗi xảy ra khi chấm điểm. Vui lòng thử lại.");
  }
};