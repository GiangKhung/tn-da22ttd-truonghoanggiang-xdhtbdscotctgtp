import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleGenerativeAI } from '@google/generative-ai';

const INTERVALS = [
  {
    key: 'oil',
    name: 'Thay dầu động cơ',
    intervalKm: 5000,
    intervalMonths: 6,
    keywords: ['nhớt', 'dầu động cơ', 'thay dầu', 'thay nhớt', 'oil change', 'engine oil']
  },
  {
    key: 'oil_filter',
    name: 'Lọc dầu/nhớt',
    intervalKm: 10000,
    intervalMonths: 12,
    keywords: ['lọc dầu', 'lọc nhớt', 'loc dau', 'loc nhot', 'oil filter']
  },
  {
    key: 'air_filter',
    name: 'Lọc gió động cơ',
    intervalKm: 20000,
    intervalMonths: 12,
    keywords: ['lọc gió động cơ', 'lọc gió máy', 'loc gio dong co', 'engine air filter']
  },
  {
    key: 'cabin_filter',
    name: 'Lọc gió điều hòa',
    intervalKm: 20000,
    intervalMonths: 12,
    keywords: ['lọc gió cabin', 'lọc gió điều hòa', 'loc gio dieu hoa', 'cabin air filter']
  },
  {
    key: 'coolant',
    name: 'Nước làm mát',
    intervalKm: 40000,
    intervalMonths: 24,
    keywords: ['nước làm mát', 'nuoc lam mat', 'coolant']
  },
  {
    key: 'brake_fluid',
    name: 'Dầu phanh',
    intervalKm: 40000,
    intervalMonths: 24,
    keywords: ['dầu phanh', 'dau phanh', 'brake fluid']
  },
  {
    key: 'spark_plugs',
    name: 'Bugi đánh lửa',
    intervalKm: 40000,
    intervalMonths: 36,
    keywords: ['bugi', 'spark plug', 'bu-gi']
  },
  {
    key: 'brake_pads',
    name: 'Má phanh (Trước/Sau)',
    intervalKm: 30000,
    intervalMonths: 24,
    keywords: ['má phanh', 'má thắng', 'ma phanh', 'ma thang', 'brake pad']
  },
  {
    key: 'tires',
    name: 'Lốp xe (Đảo lốp/Thay lốp)',
    intervalKm: 50000,
    intervalMonths: 48,
    keywords: ['lốp', 'vỏ xe', 'lop xe', 'tire']
  }
];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const carIdStr = searchParams.get('carId');
    if (!carIdStr) {
      return NextResponse.json({ error: 'Thiếu carId' }, { status: 400 });
    }
    const carId = parseInt(carIdStr);

    const car = await prisma.car.findUnique({
      where: { id: carId },
      include: {
        maintenanceRecords: {
          include: {
            maintenanceParts: { include: { part: true } }
          },
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!car) {
      return NextResponse.json({ error: 'Không tìm thấy thông tin xe' }, { status: 404 });
    }

    const currentMileage = car.mileage;
    const recommendations = [];

    // Duyệt qua từng hạng mục để xác định lần gần nhất được thực hiện
    for (const item of INTERVALS) {
      let lastDoneMileage = 0;
      let lastDoneDate = null;

      // Tìm trong lịch sử xem lần gần nhất có khớp keyword nào không
      for (const record of car.maintenanceRecords) {
        let isMatch = false;
        
        // Kiểm tra trong mô tả phiếu sửa chữa
        const descLower = record.description.toLowerCase();
        if (item.keywords.some(kw => descLower.includes(kw))) {
          isMatch = true;
        }

        // Kiểm tra trong danh sách phụ tùng đã dùng
        if (!isMatch) {
          for (const mp of record.maintenanceParts) {
            const partNameLower = mp.part.name.toLowerCase();
            if (item.keywords.some(kw => partNameLower.includes(kw))) {
              isMatch = true;
              break;
            }
          }
        }

        if (isMatch) {
          // Ước lượng số km tại thời điểm làm record
          const daysDiff = Math.max(0, Math.floor((new Date() - new Date(record.date)) / (1000 * 60 * 60 * 24)));
          const estimatedMileage = Math.max(0, currentMileage - (daysDiff * 40));
          
          lastDoneMileage = Math.round(estimatedMileage);
          lastDoneDate = record.date;
          break;
        }
      }

      // Tính toán lần tiếp theo
      const nextMileage = lastDoneMileage > 0 ? lastDoneMileage + item.intervalKm : item.intervalKm;
      const remainingKm = nextMileage - currentMileage;
      
      let nextDate = null;
      let remainingDays = null;
      if (lastDoneDate) {
        nextDate = new Date(lastDoneDate);
        nextDate.setMonth(nextDate.getMonth() + item.intervalMonths);
        remainingDays = Math.floor((nextDate - new Date()) / (1000 * 60 * 60 * 24));
      } else {
        // Chưa bao giờ làm hạng mục này
        remainingDays = -1; // Quá hạn dựa trên thời gian
      }

      // Xác định trạng thái bảo dưỡng
      let status = 'GOOD'; // An toàn
      if (remainingKm <= 0 || (remainingDays !== null && remainingDays <= 0)) {
        status = 'OVERDUE'; // Quá hạn
      } else if (remainingKm <= 1000 || (remainingDays !== null && remainingDays <= 30)) {
        status = 'WARNING'; // Cần lưu ý
      }

      recommendations.push({
        key: item.key,
        name: item.name,
        intervalKm: item.intervalKm,
        intervalMonths: item.intervalMonths,
        lastMileage: lastDoneMileage > 0 ? lastDoneMileage : null,
        lastDate: lastDoneDate,
        nextMileage,
        remainingKm,
        remainingDays,
        status
      });
    }

    // Gửi thông tin sang AI để viết lời khuyên cá nhân hoá
    let aiAnalysis = "";
    const overdueItems = recommendations.filter(r => r.status === 'OVERDUE').map(r => r.name);
    const warningItems = recommendations.filter(r => r.status === 'WARNING').map(r => r.name);

    const promptText = `Bạn là Trợ lý bảo dưỡng thông minh của Gara Trường Phát.
Hãy đưa ra nhận xét chẩn đoán ngắn gọn (khoảng 3-4 câu, tiếng Việt tự nhiên) dựa trên thông tin:
- Xe: ${car.brand} ${car.model} (Đời ${car.year}), ODO hiện tại: ${car.mileage.toLocaleString('vi-VN')} km.
- Các mục quá hạn cần làm ngay: ${overdueItems.length > 0 ? overdueItems.join(', ') : 'Không có'}
- Các mục sắp đến hạn: ${warningItems.length > 0 ? warningItems.join(', ') : 'Không có'}

Nhấn mạnh tầm quan trọng của việc bảo dưỡng đúng định kỳ để bảo vệ động cơ và an toàn khi lái xe. Khuyên khách hàng đặt lịch hẹn ngay.`;

    const geminiKey = process.env.GEMINI_API_KEY || "AIzaSyDy3PBqVbBTGr8DueKzFimXaVyMyShqwuY";
    const freeModelKey = process.env.FREEMODEL_API_KEY;

    let callSuccess = false;

    // Thử gọi Gemini
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(promptText);
        const response = await result.response;
        aiAnalysis = response.text().trim();
        callSuccess = true;
      } catch (geminiError) {
        console.error("Gemini API error in recommend-maintenance:", geminiError.message);
      }
    }

    // Fallback sang FreeModel
    if (!callSuccess && freeModelKey) {
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
            temperature: 0.7
          })
        });
        const data = await response.json();
        if (response.ok && data.choices?.[0]?.message?.content) {
          aiAnalysis = data.choices[0].message.content.trim();
          callSuccess = true;
        }
      } catch (freeModelError) {
        console.error("FreeModel API error in recommend-maintenance:", freeModelError.message);
      }
    }

    // Mock Fallback
    if (!callSuccess) {
      if (overdueItems.length > 0) {
        aiAnalysis = `Dựa trên số ODO ${car.mileage.toLocaleString('vi-VN')} km của chiếc ${car.brand} ${car.model}, hệ thống nhận thấy xe đã quá hạn bảo dưỡng các mục quan trọng như: ${overdueItems.join(', ')}. Việc chậm trễ thay thế có thể gây hao mòn nghiêm trọng đến động cơ và giảm độ an toàn. Quý khách vui lòng đặt lịch hẹn sớm tại Gara Trường Phát để kỹ thuật viên kiểm tra toàn diện và bảo dưỡng kịp thời nhé!`;
      } else if (warningItems.length > 0) {
        aiAnalysis = `Chào quý khách! Chiếc ${car.brand} ${car.model} của bạn hiện có trạng thái hoạt động khá ổn định. Tuy nhiên, các hạng mục ${warningItems.join(', ')} đang tiến gần đến mốc cần bảo dưỡng. Bạn nên sắp xếp thời gian đặt lịch hẹn kiểm tra trong vòng 1.000 km tới để đảm bảo xe luôn hoạt động trong điều kiện tốt nhất.`;
      } else {
        aiAnalysis = `Hệ thống ghi nhận chiếc ${car.brand} ${car.model} của bạn đang ở trạng thái bảo dưỡng rất tốt. Các hạng mục định kỳ đều nằm trong giới hạn an toàn. Xin chúc mừng quý khách đã chăm sóc xe rất cẩn thận! Hãy tiếp tục duy trì lịch trình này và liên hệ Gara Trường Phát khi cần hỗ trợ nhé.`;
      }
    }

    return NextResponse.json({
      car: {
        id: car.id,
        licensePlate: car.licensePlate,
        brand: car.brand,
        model: car.model,
        mileage: car.mileage
      },
      recommendations,
      aiAnalysis
    });

  } catch (error) {
    console.error("RECOMMEND MAINTENANCE API GLOBAL ERROR:", error);
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ khi phân tích gợi ý' }, { status: 500 });
  }
}
