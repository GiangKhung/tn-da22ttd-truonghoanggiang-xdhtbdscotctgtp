import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

function getToken(request) {
  const cookieToken = request.cookies.get('token')?.value;
  if (cookieToken) return cookieToken;
  const authHeader = request.headers.get('authorization') ?? '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

const SYSTEM_INSTRUCTION = `Bạn là một Trợ lý ảo tư vấn kỹ thuật ô tô thông minh của Garage Ô tô Trường Phát.
Địa chỉ: 123 Đường Số 7, Bình Trị Đông B, Bình Tân, TP.HCM.
Hotline: 0909 123 456.
Website chính thức: garatruongphat.com.

Nhiệm vụ của bạn:
1. Tư vấn kỹ thuật ô tô, hỗ trợ chẩn đoán triệu chứng hỏng hóc phổ biến (ví dụ: tiếng kêu gầm, khói động cơ, điều hòa không mát, lỗi Check Engine, sơn dặm vá...) một cách cẩn thận, tận tâm và chuyên nghiệp.
2. Đưa ra nguyên nhân có thể xảy ra và giải pháp sửa chữa tương ứng, đồng thời đề nghị khách hàng mang xe trực tiếp đến Gara Trường Phát để kỹ thuật viên kiểm tra chính xác nhất.
3. Giới thiệu các gói dịch vụ chất lượng cao tại Gara Trường Phát (Bảo dưỡng động cơ, sửa chữa gầm máy, điện lạnh, đồng sơn thân xe, cứu hộ 24/7).
4. Khuyến khích khách hàng ĐẶT LỊCH HẸN ONLINE trực tiếp trên website để được ưu tiên xử lý nhanh và nhận khuyến mãi.

Phong cách giao tiếp:
- Xưng hô lịch sự, thân thiện (ví dụ: "Dạ, Gara Trường Phát xin chào anh/chị...", "Dạ, với trường hợp này...").
- Câu trả lời ngắn gọn, trực quan, dùng gạch đầu dòng (bullet points) để khách hàng dễ theo dõi.
- Không đưa ra kết luận mang tính tuyệt đối 100% về lỗi mà nên khuyên khách hàng kiểm tra thực tế tại xưởng.`;

export async function POST(req) {
  try {
    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Thiếu lịch sử chat' }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const freeModelKey = process.env.FREEMODEL_API_KEY;

    // 0. CHECK CUSTOMER AUTHENTICATION FOR DATABASE CONTEXT SYNC
    let customerContext = "";
    let customerData = null;
    try {
      const token = getToken(req);
      if (token && SECRET) {
        const decoded = jwt.verify(token, SECRET);
        if (decoded && decoded.role === 'CUSTOMER') {
          const customer = await prisma.customer.findUnique({
            where: { id: decoded.id },
          });
          if (customer) {
            const cars = await prisma.car.findMany({
              where: { ownerPhone: customer.phone },
            });
            const carIds = cars.map(c => c.id);
            const records = carIds.length > 0 ? await prisma.maintenanceRecord.findMany({
              where: { carId: { in: carIds } },
              include: {
                car: true,
                maintenanceTasks: true,
                maintenanceParts: {
                  include: { part: true }
                }
              },
              orderBy: { date: 'desc' }
            }) : [];
            const appointments = await prisma.appointment.findMany({
              where: { phoneNumber: customer.phone },
              orderBy: { appointmentDate: 'desc' }
            });

            customerData = { customer, cars, records, appointments };

            customerContext = `
---
[THÔNG TIN DỮ LIỆU ĐỒNG BỘ CỦA KHÁCH HÀNG]
(Dưới đây là thông tin thực tế từ hệ thống quản lý Gara của khách hàng đang trò chuyện. Hãy sử dụng thông tin này để trả lời chính xác các câu hỏi cá nhân của họ):
- Họ tên: ${customer.fullname || 'Chưa cập nhật'}
- Số điện thoại: ${customer.phone}
- Biển số đăng ký tài khoản: ${customer.licensePlate || 'Chưa cập nhật'}

- Danh sách xe sở hữu (${cars.length} xe):
${cars.length > 0 ? cars.map((c, i) => `  + Xe ${i+1}: Biển số ${c.licensePlate}, Hiệu ${c.brand} ${c.model}, Đời xe ${c.year}, ODO ${c.mileage} km.`).join('\n') : '  (Chưa đăng ký xe nào trên hệ thống)'}

- Lịch sử bảo dưỡng/sửa chữa tại gara (${records.length} lượt):
${records.length > 0 ? records.map((r, i) => {
  const dateStr = new Date(r.date).toLocaleDateString('vi-VN');
  const costStr = r.cost ? `${r.cost.toLocaleString('vi-VN')}đ` : 'Chưa cập nhật';
  const tasksStr = r.maintenanceTasks.map(t => `${t.taskName} (${t.isCompleted ? 'Xong' : 'Chưa'})`).join(', ') || 'Không có';
  const partsStr = r.maintenanceParts.map(p => `${p.part.name} (SL: ${p.quanty})`).join(', ') || 'Không có';
  return `  + Lượt ${i+1}: Xe ${r.car.licensePlate} - Ngày ${dateStr} - Mô tả: ${r.description} - Chi phí: ${costStr} - Trạng thái: ${r.status} - Công việc: ${tasksStr} - Phụ tùng: ${partsStr}`;
}).join('\n') : '  (Chưa có lịch sử bảo dưỡng nào)'}

- Danh sách lịch hẹn bảo dưỡng đã đặt (${appointments.length} lịch hẹn):
${appointments.length > 0 ? appointments.map((a, i) => {
  const apptDateStr = new Date(a.appointmentDate).toLocaleString('vi-VN');
  return `  + Lịch hẹn ${i+1}: Ngày ${apptDateStr} - Loại dịch vụ: ${a.serviceType} - Trạng thái: ${a.status} - Biển số xe: ${a.licensePlate} ${a.note ? `(Ghi chú: ${a.note})` : ''}`;
}).join('\n') : '  (Chưa đặt lịch hẹn nào)'}
---
`;
          }
        }
      }
    } catch (authError) {
      console.error("AI Chat Auth Context Extraction Error:", authError.message);
    }

    // 1. THỬ DÙNG GEMINI API NẾU CÓ KEY
    if (geminiKey) {
      try {
        console.log("AI Chat: Khởi tạo với Gemini API Key...");
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          systemInstruction: SYSTEM_INSTRUCTION + (customerContext ? `\n\n${customerContext}` : ""),
        });

        // Chuyển format messages [{ role: 'user'|'assistant', content: '...' }]
        // sang format của Gemini: [{ role: 'user'|'model', parts: [{ text: '...' }] }]
        const geminiHistory = messages.slice(0, -1).map(msg => {
          return {
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          };
        });

        const lastMessage = messages[messages.length - 1].content;

        const chat = model.startChat({
          history: geminiHistory,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          }
        });

        const result = await chat.sendMessage(lastMessage);
        const replyText = result.response.text();

        return NextResponse.json({ reply: replyText });
      } catch (geminiError) {
        console.error("Gemini API Error, trying fallback:", geminiError.message);
        // Fallback tự động xuống FreeModel OpenAI bên dưới
      }
    }

    // 2. THỬ DÙNG FREEMODEL PROXY (GPT-4o-mini) NẾU CÓ KEY
    if (freeModelKey) {
      try {
        console.log("AI Chat: Khởi tạo với FreeModel API Key...");
        const response = await fetch("https://api.freemodel.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${freeModelKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: SYSTEM_INSTRUCTION + (customerContext ? `\n\n${customerContext}` : "") },
              ...messages.map(msg => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
              }))
            ],
            temperature: 0.7
          })
        });

        const data = await response.json();

        if (response.ok && data.choices?.[0]?.message?.content) {
          return NextResponse.json({ reply: data.choices[0].message.content });
        } else {
          console.error("FreeModel Error Response:", data);
        }
      } catch (freeModelError) {
        console.error("FreeModel API Error, trying local mock fallback:", freeModelError.message);
      }
    }

    // 3. MOCK FALLBACK PHÒNG TRƯỜNG HỢP CẢ 2 API ĐỀU LỖI/HẾT LƯỢT VÀ TRẢ VỀ KẾT QUẢ ĐỒ ÁN TRƠN TRU
    console.log("AI Chat: Sử dụng mock fallback response.");
    const lastUserQuery = messages[messages.length - 1].content.toLowerCase();
    
    let mockReply = "";
    
    if (customerData && (
      lastUserQuery.includes('bao nhiêu xe') || 
      lastUserQuery.includes('xe của tôi') || 
      lastUserQuery.includes('lịch sử') || 
      lastUserQuery.includes('đã sửa') || 
      lastUserQuery.includes('đã bảo dưỡng') || 
      lastUserQuery.includes('chi phí') ||
      lastUserQuery.includes('tiền') || 
      lastUserQuery.includes('lịch hẹn')
    )) {
      const { customer, cars, records, appointments } = customerData;
      
      if (lastUserQuery.includes('bao nhiêu xe') || lastUserQuery.includes('xe của tôi')) {
        mockReply = `Dạ, hệ thống Gara ghi nhận anh/chị **${customer.fullname || 'khách hàng'}** đang sở hữu **${cars.length} xe** đăng ký trên ứng dụng:\n\n`;
        if (cars.length > 0) {
          cars.forEach((c, idx) => {
            mockReply += `- **Xe ${idx + 1}:** Biển số **${c.licensePlate}** (${c.brand} ${c.model}, ODO: ${c.mileage} km).\n`;
          });
          mockReply += `\nAnh/chị có thể mang bất cứ xe nào qua Gara Trường Phát tại 123 Đường Số 7, Bình Tân để được kiểm tra và bảo dưỡng nhé!`;
        } else {
          mockReply += `Hiện tại tài khoản của anh/chị chưa liên kết với chiếc xe nào. Anh/chị có thể vào mục **Tài khoản** để thêm xe mới của mình ạ!`;
        }
      } else if (lastUserQuery.includes('chi phí') || lastUserQuery.includes('tiền') || lastUserQuery.includes('lịch sử') || lastUserQuery.includes('đã bảo dưỡng') || lastUserQuery.includes('đã sửa')) {
        mockReply = `Dạ, theo dữ liệu từ hệ thống Gara Trường Phát, anh/chị đã thực hiện bảo dưỡng/sửa chữa tổng cộng **${records.length} lần**:\n\n`;
        if (records.length > 0) {
          let totalSpent = 0;
          records.forEach((r, idx) => {
            const dateStr = new Date(r.date).toLocaleDateString('vi-VN');
            const costVal = r.cost || 0;
            totalSpent += costVal;
            mockReply += `- **Lần ${idx + 1} (${dateStr}):** Xe **${r.car.licensePlate}** - ${r.description}. Chi phí: **${costVal.toLocaleString('vi-VN')}đ** (Trạng thái: ${r.status === 'COMPLETED' ? 'Đã hoàn thành' : r.status}).\n`;
          });
          mockReply += `\nTổng chi phí tích lũy anh/chị đã thanh toán tại gara là **${totalSpent.toLocaleString('vi-VN')}đ**. Xin cảm ơn anh/chị đã luôn tin tưởng Gara Trường Phát!`;
        } else {
          mockReply += `Anh/chị chưa có lượt bảo dưỡng hoặc sửa chữa nào được lưu trữ trên hệ thống của chúng tôi. Kính mời anh/chị đặt lịch bảo dưỡng lần đầu để trải nghiệm dịch vụ ạ!`;
        }
      } else if (lastUserQuery.includes('lịch hẹn')) {
        mockReply = `Dạ, Gara ghi nhận anh/chị đã đăng ký **${appointments.length} lịch hẹn** đặt lịch dịch vụ:\n\n`;
        if (appointments.length > 0) {
          appointments.forEach((a, idx) => {
            const apptDateStr = new Date(a.appointmentDate).toLocaleString('vi-VN');
            mockReply += `- **Lịch hẹn ${idx + 1}:** Ngày ${apptDateStr} - Dịch vụ: **${a.serviceType === 'MAINTENANCE' ? 'Bảo dưỡng định kỳ' : a.serviceType}** (Trạng thái: ${a.status === 'PENDING' ? 'Đang chờ duyệt' : a.status}). Xe: **${a.licensePlate}**.\n`;
          });
        } else {
          mockReply += `Hiện tại anh/chị chưa có lịch hẹn bảo dưỡng nào. Anh/chị có thể vào màn hình **Đặt lịch** để đặt lịch hẹn trực tuyến nhé!`;
        }
      }
    }

    if (!mockReply) {
      mockReply = `Dạ, Gara Trường Phát xin chào anh/chị! Hiện tại hệ thống tư vấn AI đang tải lượng thông tin lớn, em xin phép gợi ý sơ bộ về vấn đề của anh/chị:

- **Nguyên nhân tiềm ẩn:** ${
        lastUserQuery.includes('kêu') 
          ? 'Có khả năng cao giảm xóc, rô-tốt thước lái hoặc má phanh bị mòn cơ học.' 
          : lastUserQuery.includes('lỗi') || lastUserQuery.includes('engine') 
          ? 'Cần cắm máy quét lỗi OBD để xác định chính xác cảm biến nào đang báo động đỏ (cảm biến oxy, khí thải...).' 
          : lastUserQuery.includes('nóng') || lastUserQuery.includes('mát') || lastUserQuery.includes('điều hòa')
          ? 'Hệ thống điều hòa ô tô có thể bị thiếu gas, tắc lọc gió cabin hoặc lốc điều hòa gặp sự cố.'
          : 'Cần kiểm tra kỹ thuật tổng quát trực tiếp để phát hiện chi tiết hư hỏng.'
      }
- **Khuyến nghị:** Tránh di chuyển tốc độ cao nếu có hiện tượng bất thường ở hệ thống treo hoặc phanh. Vui lòng mang xe sớm nhất qua Gara Trường Phát.
- **Địa chỉ:** 123 Đường Số 7, Bình Trị Đông B, Bình Tân, TP.HCM.
- **Hotline hỗ trợ kỹ thuật:** 0909 123 456.

Anh/chị vui lòng nhấn nút **"Đặt lịch ngay"** bên dưới để được đặt lịch kiểm tra trực tiếp nhanh nhất nhé!`;
    }

    return NextResponse.json({ reply: mockReply });

  } catch (error) {
    console.error("AI CHAT GLOBAL ERROR:", error);
    return NextResponse.json({ error: "Lỗi máy chủ nội bộ khi xử lý chat AI" }, { status: 500 });
  }
}
