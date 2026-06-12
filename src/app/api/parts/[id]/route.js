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

export async function PUT(request, context) {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const params = await context.params;

    try {
        const data = await request.json();
        const part = await prisma.part.update({
            where: { id: parseInt(params.id) },
            data: {
                name: data.name,
                category: data.category || null,
                stockQuantity: data.stockQuantity !== undefined ? (parseInt(data.stockQuantity) || 0) : undefined,
                price: parseFloat(data.price)
            }
        });
        return NextResponse.json(part);
    } catch(error) {
        if (error.code === 'P2002') return NextResponse.json({ error: 'Tên phụ tùng đã tồn tại' }, { status: 400 });
        return NextResponse.json({ error: 'Lỗi cập nhật' }, { status: 500 });
    }
}

export async function DELETE(request, context) {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const params = await context.params;

    try {
        // Kiểm tra xem part này đã được dùng ở chứng từ nào chưa
        const count = await prisma.maintenancePart.count({
            where: { partId: parseInt(params.id) }
        });

        if (count > 0) {
            return NextResponse.json({ error: 'Vật tư này đã được sử dụng trong các Hóa đơn lịch sử, không thể xóa để bảo toàn dữ liệu.' }, { status: 400 });
        }

        await prisma.part.delete({
            where: { id: parseInt(params.id) }
        });
        return NextResponse.json({ success: true });
    } catch(error) {
        return NextResponse.json({ error: 'Lỗi xóa vật tư' }, { status: 500 });
    }
}
