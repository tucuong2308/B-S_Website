import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const chatWithAI = async (message: string, history: { role: string; parts: { text: string }[] }[] = []) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      ...history,
      { role: "user", parts: [{ text: message }] }
    ],
    config: {
      systemInstruction: "Bạn là một chuyên gia tư vấn bất động sản tại Việt Nam. Bạn có kiến thức sâu rộng về pháp lý nhà đất, quy hoạch đô thị, thủ tục sang tên sổ đỏ, tính toán lãi suất vay ngân hàng và phân tích thị trường. Hãy trả lời người dùng một cách chuyên nghiệp, tận tâm và dễ hiểu. Nếu người dùng hỏi về quy trình, hãy chia nhỏ thành các bước rõ ràng. Luôn nhắc nhở người dùng kiểm tra lại thông tin pháp lý quan trọng tại cơ quan chức năng."
    }
  });

  return response.text || "Xin lỗi, tôi không thể trả lời lúc này.";
};
