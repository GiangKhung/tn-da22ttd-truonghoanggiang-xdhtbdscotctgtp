// POST /api/auth/customer
// Body: { action: 'register'|'login', phone, password, fullname?, licensePlate? }
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const SECRET = process.env.JWT_SECRET;
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.Q9JzKkVm5x.YEt7HHa6Z1pjVCqXm';

export async function POST(request) {
  if (!SECRET) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { action, phone, password, fullname, licensePlate } = body ?? {};

  if (typeof phone !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });
  }

  const normalizedPhone = phone.trim().replace(/\s+/g, '');
  if (!/^0[0-9]{8,10}$/.test(normalizedPhone)) {
    return NextResponse.json({ error: 'Số điện thoại không hợp lệ' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 });
  }

  // ── ĐĂNG KÝ ──────────────────────────────────────────────────────────────
  if (action === 'register') {
    const exists = await prisma.customer.findUnique({ where: { phone: normalizedPhone } });
    if (exists) {
      return NextResponse.json({ error: 'Số điện thoại đã được đăng ký' }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 10);
    const customer = await prisma.customer.create({
      data: {
        phone: normalizedPhone,
        password: hash,
        fullname: typeof fullname === 'string' ? fullname.trim() || null : null,
        licensePlate: typeof licensePlate === 'string' ? licensePlate.trim() || null : null,
      },
    });

    const token = jwt.sign(
      { id: customer.id, phone: customer.phone, role: 'CUSTOMER', fullname: customer.fullname },
      SECRET,
      { expiresIn: '30d' }
    );

    const response = NextResponse.json({
      message: 'Đăng ký thành công',
      token,
      customer: { id: customer.id, phone: customer.phone, fullname: customer.fullname, licensePlate: customer.licensePlate },
    }, { status: 201 });

    // Thiết lập cookie cho web
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  }

  // ── ĐĂNG NHẬP ────────────────────────────────────────────────────────────
  if (action === 'login') {
    const customer = await prisma.customer.findUnique({ where: { phone: normalizedPhone } });

    const hashToCheck = customer?.password?.startsWith('$2') ? customer.password : DUMMY_HASH;
    const isValid = await bcrypt.compare(password, hashToCheck);

    if (!customer || !isValid) {
      return NextResponse.json({ error: 'Sai số điện thoại hoặc mật khẩu' }, { status: 401 });
    }

    if (customer.isLocked) {
      return NextResponse.json(
        { error: 'Tài khoản của bạn đã bị khóa do tự hủy lịch quá 5 lần. Vui lòng đến trực tiếp gara để được quản trị viên hỗ trợ mở khóa.' },
        { status: 403 }
      );
    }

    const token = jwt.sign(
      { id: customer.id, phone: customer.phone, role: 'CUSTOMER', fullname: customer.fullname },
      SECRET,
      { expiresIn: '30d' }
    );

    const response = NextResponse.json({
      message: 'Đăng nhập thành công',
      token,
      customer: { id: customer.id, phone: customer.phone, fullname: customer.fullname, licensePlate: customer.licensePlate },
    });

    // Thiết lập cookie cho web
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  }

  return NextResponse.json({ error: 'action phải là register hoặc login' }, { status: 400 });
}
