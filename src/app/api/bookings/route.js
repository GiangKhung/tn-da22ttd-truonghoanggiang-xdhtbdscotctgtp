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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    if (!dateStr) return NextResponse.json({ error: 'Thiếu tham số ngày' }, { status: 400 });

    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: { not: 'CANCELLED' }
      },
      select: { appointmentDate: true }
    });

    // Gom nhóm theo giờ
    const occupancy = {};
    appointments.forEach(appt => {
      const hour = new Date(appt.appointmentDate).getHours();
      occupancy[hour] = (occupancy[hour] || 0) + 1;
    });

    return NextResponse.json({ occupancy });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi lấy dữ liệu khung giờ' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    // 1. Kiểm tra Token Đăng nhập của Khách hàng
    const cookieToken = request.cookies.get('token')?.value;
    const authHeader = request.headers.get('authorization') ?? '';
    const token = cookieToken || (authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null);

    if (!token) {
      return NextResponse.json({ error: 'Vui lòng đăng nhập tài khoản khách hàng để đặt lịch bảo dưỡng.' }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, SECRET);
    } catch (err) {
      return NextResponse.json({ error: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.' }, { status: 401 });
    }

    if (!decoded || !decoded.phone) {
      return NextResponse.json({ error: 'Tài khoản không hợp lệ.' }, { status: 403 });
    }

    // Kiểm tra xem số điện thoại trong token có bị khóa không
    const normTokenPhone = normalizePhone(decoded.phone);
    const tokenCustomer = await prisma.customer.findUnique({ where: { phone: normTokenPhone } });
    if (tokenCustomer && tokenCustomer.isLocked) {
      return NextResponse.json({
        error: 'Tài khoản của bạn đã bị khóa do tự hủy lịch quá 5 lần. Vui lòng đến trực tiếp gara để được quản trị viên hỗ trợ mở khóa.'
      }, { status: 403 });
    }

    const body = await request.json();
    const { customerName, phoneNumber, licensePlate, serviceType, appointmentDate, note } = body;

    if (!customerName || !phoneNumber || !licensePlate || !serviceType || !appointmentDate) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ các thông tin bắt buộc' }, { status: 400 });
    }

    const normPhone = normalizePhone(phoneNumber);
    const customer = await prisma.customer.findUnique({ where: { phone: normPhone } });
    if (customer && customer.isLocked) {
      return NextResponse.json({
        error: 'Tài khoản của bạn đã bị khóa do tự hủy lịch quá 5 lần. Vui lòng đến trực tiếp gara để được quản trị viên hỗ trợ mở khóa.'
      }, { status: 403 });
    }

    const date = new Date(appointmentDate);
    // Chuẩn hóa về đầu giờ (ví dụ: 09:30 -> 09:00)
    date.setMinutes(0, 0, 0);

    if (date.getTime() <= Date.now()) {
      return NextResponse.json({
        error: 'Không thể đặt lịch hẹn trong quá khứ. Vui lòng chọn khung giờ khác.'
      }, { status: 400 });
    }

    const startHour = new Date(date);
    const endHour = new Date(date);
    endHour.setHours(date.getHours() + 1);

    // Kiểm tra số lượng lượt đặt trong khung giờ này
    const count = await prisma.appointment.count({
      where: {
        appointmentDate: {
          gte: startHour,
          lt: endHour
        },
        status: {
          not: 'CANCELLED'
        }
      }
    });

    if (count >= 10) {
      return NextResponse.json({ 
        error: `Khung giờ ${date.getHours()}:00 đã đầy (tối đa 10 xe). Vui lòng chọn khung giờ khác.` 
      }, { status: 400 });
    }

    // Kiểm tra xem xe này đã có lịch hẹn nào trong ngày này chưa (chống trùng xe cùng ngày)
    const normPlate = normalizePlate(licensePlate);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        appointmentDate: {
          gte: startOfDay,
          lte: endOfDay
        },
        status: { not: 'CANCELLED' }
      }
    });

    const isPlateBooked = existingAppointments.some(appt => 
      normalizePlate(appt.licensePlate) === normPlate
    );

    if (isPlateBooked) {
      return NextResponse.json({
        error: `Xe biển số ${licensePlate} đã được đặt lịch vào ngày ${date.toLocaleDateString('vi-VN')} rồi. Mỗi xe chỉ được đặt lịch 1 lần duy nhất trong ngày.`
      }, { status: 400 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        customerName,
        phoneNumber,
        licensePlate,
        serviceType,
        appointmentDate: date,
        note,
        status: 'PENDING'
      }
    });

    return NextResponse.json({ message: 'Đặt lịch thành công!', appointment }, { status: 201 });

  } catch (error) {
    console.error('Booking error:', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi khi đặt lịch' }, { status: 500 });
  }
}
