import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req) {
  try {
    const { carId, symptoms } = await req.json();
    if (!symptoms || !symptoms.trim()) {
      return NextResponse.json({ error: 'Thiếu mô tả triệu chứng' }, { status: 400 });
    }

    let carInfoText = "Không rõ dòng xe cụ thể";
    let car = null;

    if (carId) {
      car = await prisma.car.findUnique({
        where: { id: parseInt(carId) }
      });
      if (car) {
        carInfoText = `Dòng xe: ${car.brand} ${car.model} (Đời ${car.year}), ODO hiện tại: ${car.mileage.toLocaleString('vi-VN')} km`;
      }
    }

    const promptText = `Bạn là Kỹ sư trưởng chẩn đoán kỹ thuật ô tô giàu kinh nghiệm của Gara Trường Phát.
Hãy phân tích triệu chứng xe và đề xuất giải pháp xử lý.
- Thông tin xe: ${carInfoText}
- Triệu chứng ghi nhận: "${symptoms}"

Hãy trả về kết quả chẩn đoán DƯỚI DẠNG MÃ JSON HỢP LỆ có cấu trúc chính xác như sau (không được sai cấu trúc):
{
  "priority": "URGENT",
  "causes": [
    { "name": "Hỏng lốc lạnh (lốc nén điều hòa)", "probability": 75, "explanation": "Lốc lạnh bị hỏng hoặc kẹt pít-tông dẫn đến hệ thống lạnh kêu to khi đóng lốc và không thể nén gas lạnh tạo hơi mát." }
  ],
  "tasks": [
    "Kiểm tra và kiểm thử áp suất hệ thống điều hòa",
    "Thay thế bộ lốc nén máy lạnh mới",
    "Nạp ga lạnh và bổ sung dầu bôi trơn máy nén"
  ],
  "parts": [
    "Lốc lạnh (Block nén)",
    "Ga điều hòa R134a",
    "Dầu bôi trơn lốc lạnh"
  ],
  "estimatedLaborCost": 600000
}

Lưu ý: "priority" nhận giá trị "URGENT" (Khẩn cấp - ảnh hưởng vận hành/an toàn), "MEDIUM" (Trung bình), hoặc "LOW" (Thấp). "estimatedLaborCost" là số nguyên biểu thị tiền công (VNĐ).
Chỉ trả về chuỗi JSON thuần túy, không có thẻ \`\`\`json hay bất kỳ văn bản nào khác ngoài mã JSON.`;

    const geminiKey = process.env.GEMINI_API_KEY || "AIzaSyDy3PBqVbBTGr8DueKzFimXaVyMyShqwuY";
    const freeModelKey = process.env.FREEMODEL_API_KEY;

    let aiDiagnosis = null;

    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          generationConfig: { responseMimeType: "application/json" }
        });
        const result = await model.generateContent(promptText);
        const text = result.response.text().trim();
        aiDiagnosis = JSON.parse(text);
      } catch (e) {
        console.error("Gemini API diagnose error, trying fallback:", e.message);
      }
    }

    if (!aiDiagnosis && freeModelKey) {
      try {
        const response = await fetch("https://api.freemodel.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${freeModelKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: promptText }],
            temperature: 0.1
          })
        });
        const data = await response.json();
        if (response.ok && data.choices?.[0]?.message?.content) {
          const text = data.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
          aiDiagnosis = JSON.parse(text);
        }
      } catch (e) {
        console.error("FreeModel API diagnose error:", e.message);
      }
    }

    // Lập trình fallback cục bộ nếu cả hai AI đều không khả dụng
    if (!aiDiagnosis) {
      const symLower = symptoms.toLowerCase();
      let priority = "MEDIUM";
      let causes = [];
      let tasks = [];
      let parts = [];
      let estimatedLaborCost = 300000;

      if (symLower.includes('kêu') || symLower.includes('gầm') || symLower.includes('cọc')) {
        priority = "URGENT";
        causes = [
          { name: "Hỏng rô-tốt thước lái hoặc rô-tốt cân bằng", probability: 60, explanation: "Các khớp cao su của rô-tốt bị lão hóa, nứt vỡ dẫn đến kim loại va chạm khi xe đi qua đường gập ghềnh tạo tiếng kêu lọc cọc." },
          { name: "Hao mòn giảm xóc (phuộc nhún)", probability: 40, explanation: "Giảm xóc bị chảy dầu, mất khả năng triệt tiêu chấn động gây rung động và tiếng kêu dội vào cabin." }
        ];
        tasks = [
          "Cẩu xe kiểm tra gầm máy tổng quát",
          "Thay thế rô-tốt thước lái hư hỏng",
          "Cân chỉnh độ chụm bánh xe"
        ];
        parts = [
          "Rô-tốt thước lái (cặp)",
          "Rô-tốt cân bằng bánh trước"
        ];
        estimatedLaborCost = 450000;
      } else if (symLower.includes('nóng') || symLower.includes('mát') || symLower.includes('điều hòa') || symLower.includes('lạnh')) {
        priority = "MEDIUM";
        causes = [
          { name: "Nghẹt lọc gió điều hòa (cabin)", probability: 55, explanation: "Lọc gió quá bẩn bám đầy bụi cản trở lưu lượng gió thổi qua giàn lạnh, giảm hiệu suất làm mát sâu." },
          { name: "Hệ thống bị rò rỉ ga lạnh nhẹ", probability: 45, explanation: "Áp suất ga lạnh giảm khiến giàn lạnh không đủ tác nhân làm lạnh, quạt thổi ra gió nhưng không mát." }
        ];
        tasks = [
          "Vệ sinh/thay thế lọc gió điều hòa cabin",
          "Đo áp suất ga và hút chân không nạp ga lạnh mới"
        ];
        parts = [
          "Lọc gió điều hòa cabin",
          "Ga lạnh R134a bổ sung"
        ];
        estimatedLaborCost = 350000;
      } else if (symLower.includes('phanh') || symLower.includes('thắng') || symLower.includes('rít')) {
        priority = "URGENT";
        causes = [
          { name: "Má phanh bị mòn hết (chạm tấm báo mòn)", probability: 70, explanation: "Má phanh mòn quá giới hạn cho phép khiến phần kim loại chạm vào đĩa phanh tạo tiếng rít chói tai và giảm lực phanh." },
          { name: "Đĩa phanh bị xước hoặc cong vênh", probability: 30, explanation: "Bụi bẩn lọt vào kẹp phanh gây trầy xước đĩa phanh, cần láng đĩa để tạo độ phẳng tiếp xúc tốt." }
        ];
        tasks = [
          "Tháo bánh và tháo kẹp phanh kiểm tra độ dày má phanh",
          "Thay má phanh bánh trước/sau mới",
          "Láng đĩa phanh hồi phục tiếp xúc phẳng"
        ];
        parts = [
          "Bộ má phanh trước chính hãng",
          "Mỡ bôi trơn ắc suốt phanh"
        ];
        estimatedLaborCost = 400000;
      } else {
        // Mặc định cho các triệu chứng chung
        priority = "MEDIUM";
        causes = [
          { name: "Cần kiểm tra kỹ thuật trực tiếp", probability: 90, explanation: "Triệu chứng chưa đủ đặc trưng để xác định lỗi ngay. Cần cắm máy quét lỗi OBD hoặc kiểm tra thủ công." }
        ];
        tasks = [
          "Sử dụng máy quét lỗi OBD-II đọc mã lỗi động cơ",
          "Kiểm tra tổng quan khoang máy"
        ];
        parts = [];
        estimatedLaborCost = 200000;
      }

      aiDiagnosis = {
        priority,
        causes,
        tasks,
        parts,
        estimatedLaborCost
      };
    }

    return NextResponse.json(aiDiagnosis);

  } catch (error) {
    console.error("DIAGNOSE API GLOBAL ERROR:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ khi phân tích chẩn đoán' }, { status: 500 });
  }
}
