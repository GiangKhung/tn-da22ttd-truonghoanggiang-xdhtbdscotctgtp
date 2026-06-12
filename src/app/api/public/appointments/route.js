import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

function normalizePhone(p) {
  return String(p ?? '').replace(/\s+/g, '').trim();
}

function normalizePlate(p) {
  return String(p ?? '').replace(/[\s-]/g, '').toUpperCase().trim();
}

// Liệt kê lịch hẹn của khách theo (phone, licensePlate).
// Nếu có TOKEN hợp lệ khớp với SĐT (hoặc staff) thì cho phép xem toàn bộ xe của SĐT đó.
// Nếu là truy cập công cộng (không đăng nhập) thì bắt buộc khớp cả biển số xe để bảo mật.
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = normalizePhone(searchParams.get('phone'));
    const licensePlate = normalizePlate(searchParams.get('licensePlate'));

    if (!phone) {
      return NextResponse.json({ error: 'Thiếu số điện thoại' }, { status: 400 });
    }

    // Kiểm tra token để xác minh quyền truy cập
    const cookieToken = request.cookies.get('token')?.value;
    const authHeader = request.headers.get('authorization') ?? '';
    const token = cookieToken || (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null);

    let isAuthorized = false;
    if (token && SECRET) {
      try {
        const decoded = jwt.verify(token, SECRET);
        if (
          normalizePhone(decoded.phone) === phone ||
          decoded.role === 'ADMIN' ||
          decoded.role === 'TECHNICIAN'
        ) {
          isAuthorized = true;
        }
      } catch (err) {
        // Token không hợp lệ
      }
    }

    if (!isAuthorized && !licensePlate) {
      return NextResponse.json(
        { error: 'Thiếu biển số xe xác thực' },
        { status: 400 }
      );
    }

    // SQLite không có cách filter sau khi normalize trong query, nên fetch
    // candidate theo phone rồi so khớp plate trong app code.
    const candidates = await prisma.appointment.findMany({
      where: { phoneNumber: { contains: phone.slice(-9) } },
      orderBy: { appointmentDate: 'desc' },
      take: 100,
    });

    const matches = candidates
      .filter((a) => {
        const isPhoneMatch = normalizePhone(a.phoneNumber) === phone;
        if (isAuthorized) return isPhoneMatch;
        return isPhoneMatch && normalizePlate(a.licensePlate) === licensePlate;
      })
      .slice(0, 20)
      .map((a) => ({
        id: a.id,
        serviceType: a.serviceType,
        appointmentDate: a.appointmentDate,
        status: a.status,
        note: a.note,
        licensePlate: a.licensePlate,
        phoneNumber: a.phoneNumber,
        cancelReason: a.cancelReason,
        createdAt: a.createdAt,
      }));

    return NextResponse.json({ appointments: matches });
  } catch (error) {
    console.error('[public/appointments GET]', error);
    return NextResponse.json({ error: 'Lỗi tra cứu lịch hẹn' }, { status: 500 });
  }
}
