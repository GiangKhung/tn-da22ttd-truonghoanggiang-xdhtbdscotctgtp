import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const DONE_STATUSES = ['COMPLETED', 'DELIVERED'];

function getSeasonName(month) {
  // 0-indexed month: 0=Jan, 1=Feb, 2=Mar, 3=Apr, 4=May, 5=Jun, 6=Jul, 7=Aug, 8=Sep, 9=Oct, 10=Nov, 11=Dec
  if (month >= 2 && month <= 4) return 'Spring'; // Mar-May
  if (month >= 5 && month <= 7) return 'Summer'; // Jun-Aug
  if (month >= 8 && month <= 10) return 'Autumn'; // Sep-Nov
  return 'Winter'; // Dec-Feb
}

function getSeasonVN(seasonKey) {
  const vn = {
    Spring: 'Mùa Xuân (Tháng 3 - 5)',
    Summer: 'Mùa Hè (Tháng 6 - 8)',
    Autumn: 'Mùa Thu (Tháng 9 - 11)',
    Winter: 'Mùa Đông (Tháng 12 - 2)'
  };
  return vn[seasonKey] || seasonKey;
}

export async function GET(request) {
  try {
    const records = await prisma.maintenanceRecord.findMany({
      where: {
        status: { in: DONE_STATUSES }
      },
      include: {
        maintenanceParts: {
          include: { part: true }
        }
      }
    });

    // Gom dữ liệu theo mùa
    const seasonsData = {
      Spring: { revenue: 0, count: 0, parts: {} },
      Summer: { revenue: 0, count: 0, parts: {} },
      Autumn: { revenue: 0, count: 0, parts: {} },
      Winter: { revenue: 0, count: 0, parts: {} }
    };

    for (const r of records) {
      const date = new Date(r.date);
      const m = date.getMonth();
      const season = getSeasonName(m);
      
      seasonsData[season].revenue += r.cost || 0;
      seasonsData[season].count += 1;

      // Gom nhóm phụ tùng theo danh mục/tên
      for (const mp of r.maintenanceParts) {
        const cat = mp.part.category || 'Khác';
        seasonsData[season].parts[cat] = (seasonsData[season].parts[cat] || 0) + mp.quanty;
      }
    }

    // Xác định mùa tiếp theo từ thời điểm hiện tại
    const currentMonth = new Date().getMonth();
    let nextSeasonKey = 'Spring';
    if (currentMonth >= 11 || currentMonth <= 1) nextSeasonKey = 'Spring'; // Hiện tại Đông -> tiếp theo Xuân
    else if (currentMonth >= 2 && currentMonth <= 4) nextSeasonKey = 'Summer'; // Hiện tại Xuân -> tiếp theo Hè
    else if (currentMonth >= 5 && currentMonth <= 7) nextSeasonKey = 'Autumn'; // Hiện tại Hè -> tiếp theo Thu
    else if (currentMonth >= 8 && currentMonth <= 10) nextSeasonKey = 'Winter'; // Hiện tại Thu -> tiếp theo Đông

    const nextSeasonVN = getSeasonVN(nextSeasonKey);

    // Tính toán dữ liệu gợi ý cơ bản cho prompt
    const historicalSummary = Object.keys(seasonsData).map(key => {
      const data = seasonsData[key];
      const topParts = Object.entries(data.parts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, qty]) => `${name} (SL: ${qty})`)
        .join(', ');
      return `- ${getSeasonVN(key)}: Doanh thu ${data.revenue.toLocaleString('vi-VN')}đ, ${data.count} lượt xe. Nhóm phụ tùng dùng nhiều: ${topParts || 'Không có'}`;
    }).join('\n');

    const promptText = `Bạn là chuyên gia tư vấn quản trị kinh doanh cho Gara Ô tô Trường Phát.
Dưới đây là thống kê doanh thu và lượt xe thực tế phân theo 4 mùa trong cơ sở dữ liệu:
${historicalSummary}

Mùa tiếp theo cần dự báo là: ${nextSeasonVN}.
Hãy phân tích dữ liệu trên và tạo dự báo cho mùa tiếp theo. Hãy trả về kết quả DƯỚI DẠNG MÃ JSON HỢP LỆ, định dạng chính xác như sau:
{
  "predictedRevenueMin": 150000000,
  "predictedRevenueMax": 250000000,
  "predictedVehiclesMin": 45,
  "predictedVehiclesMax": 65,
  "staffingRecommendation": "Mô tả đề xuất nhân sự chi tiết bằng tiếng Việt...",
  "partsToStock": [
    { "name": "Lọc gió điều hòa & Ga lạnh", "reason": "Lý do trữ nhiều..." },
    { "name": "Nước làm mát động cơ", "reason": "Lý do trữ nhiều..." }
  ],
  "strategicAdvice": "Đề xuất chiến lược tăng doanh thu chi tiết..."
}

Lưu ý: Chỉ trả về chuỗi JSON thuần túy, không có thẻ \`\`\`json hay bất kỳ văn bản giải thích nào khác.`;

    const geminiKey = process.env.GEMINI_API_KEY || "AIzaSyDy3PBqVbBTGr8DueKzFimXaVyMyShqwuY";
    const freeModelKey = process.env.FREEMODEL_API_KEY;

    let aiForecast = null;

    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          generationConfig: { responseMimeType: "application/json" }
        });
        const result = await model.generateContent(promptText);
        const text = result.response.text().trim();
        aiForecast = JSON.parse(text);
      } catch (e) {
        console.error("Gemini API seasonal forecast error, checking fallback:", e.message);
      }
    }

    if (!aiForecast && freeModelKey) {
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
            temperature: 0.2
          })
        });
        const data = await response.json();
        if (response.ok && data.choices?.[0]?.message?.content) {
          const text = data.choices[0].message.content.replace(/```json/g, "").replace(/```/g, "").trim();
          aiForecast = JSON.parse(text);
        }
      } catch (e) {
        console.error("FreeModel API seasonal forecast error:", e.message);
      }
    }

    // Thuật toán dự báo fallback thủ công nếu cả 2 AI đều lỗi
    if (!aiForecast) {
      const histData = seasonsData[nextSeasonKey];
      // Ước lượng tăng trưởng nhẹ 10%
      const baseRev = histData.revenue > 0 ? histData.revenue : 120000000;
      const baseCount = histData.count > 0 ? histData.count : 40;

      const predictedRevenueMin = Math.round(baseRev * 0.95);
      const predictedRevenueMax = Math.round(baseRev * 1.2);
      const predictedVehiclesMin = Math.round(baseCount * 0.9);
      const predictedVehiclesMax = Math.round(baseCount * 1.15);

      let staffing = "";
      let parts = [];
      let strategy = "";

      if (nextSeasonKey === 'Summer') {
        staffing = "Bố trí thêm 1 kỹ thuật viên chuyên ngành điện lạnh ô tô. Tăng cường ca trực vào những ngày nắng nóng đỉnh điểm do nhu cầu sửa điều hoà tăng đột biến.";
        parts = [
          { name: "Phin lọc ga & Lọc gió cabin (điều hòa)", reason: "Mùa hè điều hòa hoạt động hết công suất, khách hàng có nhu cầu bảo dưỡng hệ thống lạnh cao." },
          { name: "Nước làm mát động cơ & Ga lạnh R134a", reason: "Phòng ngừa xe bị sôi nước làm mát và nạp thêm ga cho hệ thống điều hòa điều chỉnh nhiệt." }
        ];
        strategy = "Triển khai chiến dịch truyền thông 'Chăm sóc xe đón hè mát lạnh', tặng gói khử mùi cabin miễn phí cho khách hàng đặt lịch bảo dưỡng điều hòa trước qua website.";
      } else if (nextSeasonKey === 'Winter') {
        staffing = "Duy trì đội ngũ hiện tại. Chú trọng đào tạo thợ kiểm tra bình ắc quy và hệ thống khởi động để giải quyết nhanh các ca xe khó nổ máy buổi sáng.";
        parts = [
          { name: "Bình ắc quy 12V", reason: "Nhiệt độ xuống thấp làm giảm hiệu suất ắc quy, khiến lượng xe hỏng bình tăng 30%." },
          { name: "Dầu động cơ độ nhớt loãng (5W-30)", reason: "Hỗ trợ động cơ khởi động mượt mà hơn trong điều kiện thời tiết lạnh." }
        ];
        strategy = "Khuyến mãi giảm giá 15% gói kiểm tra bình điện và thay nhớt mùa đông giúp khách hàng an tâm di chuyển cuối năm.";
      } else if (nextSeasonKey === 'Spring') {
        staffing = "Tăng cường tối đa nhân sự trước Tết Nguyên Đán 2 tuần. Đề xuất thợ làm thêm giờ để giải quyết kịp tiến độ giao xe chơi Tết.";
        parts = [
          { name: "Má phanh & Dầu phanh", reason: "Khách chuẩn bị đi phượt xa đón Tết, yêu cầu kiểm tra hệ thống phanh an toàn cực kỳ cao." },
          { name: "Gạt mưa & Nước rửa kính", reason: "Chuẩn bị cho những cơn mưa xuân ẩm ướt kéo dài gây giảm tầm nhìn." }
        ];
        strategy = "Quảng bá chương trình 'Bảo dưỡng xe đón Tết - Vui xuân an toàn'. Tặng gói rửa xe dọn nội thất miễn phí cho hóa đơn trên 2.000.000đ.";
      } else {
        staffing = "Duy trì lịch trực tiêu chuẩn. Có thể cho nhân viên luân phiên nghỉ bù sau mùa cao điểm để tái tạo sức lao động.";
        parts = [
          { name: "Lọc gió động cơ & Lọc nhớt", reason: "Các chi tiết thay thế cơ bản định kỳ luôn cần sẵn có để phục vụ bảo dưỡng tiêu chuẩn." },
          { name: "Chổi gạt mưa & Cao su gạt mưa", reason: "Mùa mưa thu đòi hỏi hệ thống gạt mưa hoạt động tốt tránh nhòe kính lái." }
        ];
        strategy = "Tập trung đẩy mạnh chăm sóc khách hàng cũ, gửi email nhắc nhở bảo dưỡng định kỳ dựa trên số ODO và km ước tính.";
      }

      aiForecast = {
        predictedRevenueMin,
        predictedRevenueMax,
        predictedVehiclesMin,
        predictedVehiclesMax,
        staffingRecommendation: staffing,
        partsToStock: parts,
        strategicAdvice: strategy
      };
    }

    return NextResponse.json({
      historical: seasonsData,
      nextSeasonKey,
      nextSeasonName: nextSeasonVN,
      forecast: aiForecast
    });

  } catch (error) {
    console.error("FORECAST SEASONAL API GLOBAL ERROR:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ khi phân tích dự báo' }, { status: 500 });
  }
}
