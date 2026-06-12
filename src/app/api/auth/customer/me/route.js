// GET  /api/auth/customer/me  — verify token, trả về customer info
// PATCH /api/auth/customer/me — cập nhật họ tên / biển số xe
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

function getToken(request) {
  const cookieToken = request.cookies.get('token')?.value;
  if (cookieToken) return cookieToken;
  const authHeader = request.headers.get('authorization') ?? '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

function verifyCustomer(token) {
  const decoded = jwt.verify(token, SECRET);
  if (decoded.role !== 'CUSTOMER') throw new Error('Forbidden');
  return decoded;
}

export async function GET(request) {
  if (!SECRET) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const token = getToken(request);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const decoded = verifyCustomer(token);
    // Lấy data mới nhất từ DB thay vì chỉ dùng payload trong token
    const customer = await prisma.customer.findUnique({
      where: { id: decoded.id },
      select: { id: true, phone: true, fullname: true, licensePlate: true },
    });
    if (!customer) return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
    return NextResponse.json({ customer });
  } catch {
    return NextResponse.json({ error: 'Token không hợp lệ hoặc đã hết hạn' }, { status: 401 });
  }
}

export async function PATCH(request) {
  if (!SECRET) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const token = getToken(request);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try {
    decoded = verifyCustomer(token);
  } catch {
    return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { fullname, licensePlate } = body ?? {};

  const data = {};
  if (typeof fullname === 'string') data.fullname = fullname.trim() || null;
  if (typeof licensePlate === 'string') {
    data.licensePlate = licensePlate.trim().replace(/[\s-]/g, '').toUpperCase() || null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Không có trường nào để cập nhật' }, { status: 400 });
  }

  const customer = await prisma.customer.update({
    where: { id: decoded.id },
    data,
    select: { id: true, phone: true, fullname: true, licensePlate: true },
  });

  return NextResponse.json({ customer });
}

