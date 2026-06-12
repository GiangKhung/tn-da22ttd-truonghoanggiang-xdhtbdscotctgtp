// POST /api/auth/change-password
// Body: { currentPassword, newPassword }
// Yêu cầu: cookie token hợp lệ (staff/admin)
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

export async function POST(request) {
  if (!SECRET) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });

  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let decoded;
  try {
    decoded = jwt.verify(token, SECRET);
  } catch {
    return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 401 });
  }

  // Chỉ dành cho staff (ADMIN/TECHNICIAN)
  if (decoded.role === 'CUSTOMER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { currentPassword, newPassword } = body ?? {};

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.id } });
  if (!user) return NextResponse.json({ error: 'Người dùng không tồn tại' }, { status: 404 });

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) {
    return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

  return NextResponse.json({ message: 'Đổi mật khẩu thành công' });
}
