import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(request) {
  // Defense-in-depth: chặn ở route ngay cả khi proxy bị cấu hình sai.
  // Endpoint này chỉ phục vụ bootstrap dev/demo, không bao giờ được phép chạy trong production.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const adminPass = await bcrypt.hash('123', 10);
    const techPass  = await bcrypt.hash('123', 10);

    await prisma.user.upsert({
      where:  { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        password: adminPass,
        role:     'ADMIN',
        fullname: 'Quản trị viên',
      },
    });

    await prisma.user.upsert({
      where:  { username: 'tech1' },
      update: {},
      create: {
        username: 'tech1',
        password: techPass,
        role:     'TECHNICIAN',
        fullname: 'Kỹ thuật viên 1',
      },
    });

    return NextResponse.json({ message: 'Database seeded successfully', accounts: ['admin/123', 'tech1/123'] });
  } catch(error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

