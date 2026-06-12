import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const SECRET = process.env.JWT_SECRET;

// Hash giả dùng để chạy bcrypt.compare khi không tìm thấy user — giúp 2 nhánh
// "user not found" và "wrong password" có thời lượng tương đương, chặn username enumeration qua timing.
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.Q9JzKkVm5x.YEt7HHa6Z1pjVCqXm';

export async function POST(request) {
  try {
    if (!SECRET) {
      console.error('[login] JWT_SECRET is not set');
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const { username, password } = await request.json();
    if (typeof username !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Sai tên đăng nhập hoặc mật khẩu' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { username } });

    // Luôn chạy bcrypt.compare một lần dù user tồn tại hay không (constant-ish time).
    const hashToCheck = user?.password?.startsWith('$2') ? user.password : DUMMY_HASH;
    const isValid = await bcrypt.compare(password, hashToCheck);

    if (!user || !isValid) {
      return NextResponse.json({ error: 'Sai tên đăng nhập hoặc mật khẩu' }, { status: 401 });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullname: user.fullname },
      SECRET,
      { expiresIn: '1d' }
    );

    const response = NextResponse.json({
      message: 'Đăng nhập thành công',
      user: { id: user.id, role: user.role, fullname: user.fullname, username: user.username },
    });

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400, // 1 day
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
