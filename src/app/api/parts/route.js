import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const SECRET = process.env.JWT_SECRET;

const isAdmin = async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return false;
    try {
        const decoded = jwt.verify(token, SECRET);
        return decoded.role === 'ADMIN';
    } catch {
        return false;
    }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('q') || '';
  
  try {
    const parts = await prisma.part.findMany({
      where: {
        name: { contains: search }
      },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(parts);
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi tải danh mục phụ tùng' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const data = await request.json();
    if (!data.name || data.price === undefined) {
        return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const part = await prisma.part.create({
      data: {
        name: data.name,
        category: data.category || null,
        stockQuantity: parseInt(data.stockQuantity) || 0,
        price: parseFloat(data.price),
      }
    });

    return NextResponse.json(part, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Tên phụ tùng đã tồn tại' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Lỗi tạo phụ tùng' }, { status: 500 });
  }
}
