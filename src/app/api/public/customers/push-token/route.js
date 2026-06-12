import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

function normalizePhone(p) {
  return String(p ?? '').replace(/\s+/g, '').trim();
}

export async function POST(request) {
  try {
    const { phone, pushToken } = await request.json();
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone || !pushToken) {
      return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { phone: normalizedPhone }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản khách hàng' }, { status: 404 });
    }

    await prisma.customer.update({
      where: { id: customer.id },
      data: { pushToken }
    });

    console.log(`Đã lưu Expo push token cho SĐT ${normalizedPhone}: ${pushToken}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[push-token] POST error:', error);
    return NextResponse.json({ error: 'Lỗi lưu push token' }, { status: 500 });
  }
}
