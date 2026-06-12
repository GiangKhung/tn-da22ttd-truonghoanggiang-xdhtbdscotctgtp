import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

function normalizePhone(p) {
  return String(p ?? '').replace(/\s+/g, '').trim();
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = normalizePhone(searchParams.get('phone'));

    if (!phone) {
      return NextResponse.json({ error: 'Thiếu số điện thoại' }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { phone }
    });

    if (!customer) {
      return NextResponse.json({ notifications: [] });
    }

    const notifications = await prisma.notification.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('[public/notifications] GET error:', error);
    return NextResponse.json({ error: 'Lỗi lấy danh sách thông báo' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { phone } = await request.json();
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      return NextResponse.json({ error: 'Thiếu số điện thoại' }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { phone: normalizedPhone }
    });

    if (customer) {
      await prisma.notification.updateMany({
        where: { customerId: customer.id, isRead: false },
        data: { isRead: true }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[public/notifications] PATCH error:', error);
    return NextResponse.json({ error: 'Lỗi cập nhật trạng thái thông báo' }, { status: 500 });
  }
}
