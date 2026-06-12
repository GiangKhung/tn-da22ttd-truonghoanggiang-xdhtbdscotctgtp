// POST /api/auth/customer/change-password
// Body: { currentPassword, newPassword }
// Yêu cầu: cookie token với role CUSTOMER
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

function getToken(request) {
  const cookieToken = request.cookies.get('token')?.value;
  if (cookieToken) return cookieToken;
  const authHeader = request.headers.get('authorization') ?? '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

export async function POST(request) {
  if (!SECRET) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const token = getToken(request);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try {
    decoded = jwt.verify(token, SECRET);
    if (decoded.role !== 'CUSTOMER') throw new Error('Forbidden');
  } catch {
    return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 401 });
  }

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { currentPassword, newPassword } = body ?? {};
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { id: decoded.id } });
  if (!customer) return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });

  const isValid = await bcrypt.compare(currentPassword, customer.password);
  if (!isValid) {
    return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.customer.update({ where: { id: customer.id }, data: { password: hashed } });

  return NextResponse.json({ message: 'Đổi mật khẩu thành công' });
}
