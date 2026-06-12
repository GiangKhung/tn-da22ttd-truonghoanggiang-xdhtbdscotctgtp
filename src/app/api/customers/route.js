// GET  /api/customers       — danh sách (ADMIN)
// DELETE /api/customers/[id] — xóa tài khoản khách hàng (ADMIN)
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const SECRET = process.env.JWT_SECRET;

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return false;
  try {
    const d = jwt.verify(token, SECRET);
    return d.role === 'ADMIN';
  } catch { return false; }
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const customers = await prisma.customer.findMany({
    select: { id: true, phone: true, fullname: true, licensePlate: true, isLocked: true, cancellationCount: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(customers);
}
