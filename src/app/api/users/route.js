import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

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

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, fullname: true, role: true } // Không lấy password
    });
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const data = await request.json();
    if (!data.username || !data.password || !data.fullname) {
        return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        username: data.username,
        password: hashedPassword,
        fullname: data.fullname,
        role: data.role || 'TECHNICIAN'
      }
    });

    return NextResponse.json({ id: user.id, username: user.username }, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Tên đăng nhập đã tồn tại' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Lỗi tạo user' }, { status: 500 });
  }
}
