import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

const SECRET = process.env.JWT_SECRET;

const ALLOWED_ROLES = new Set(['ADMIN', 'TECHNICIAN']);

const getCaller = async () => {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    try {
        return jwt.verify(token, SECRET);
    } catch {
        return null;
    }
}

const isAdmin = async () => {
    const caller = await getCaller();
    return caller?.role === 'ADMIN';
}

export async function PUT(request, context) {
    const caller = await getCaller();
    if (caller?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const params = await context.params;
    const targetId = parseInt(params.id);
    if (!Number.isInteger(targetId)) {
        return NextResponse.json({ error: 'id không hợp lệ' }, { status: 400 });
    }

    try {
        const data = await request.json();
        const updateData = {};

        if (data.fullname !== undefined) {
            updateData.fullname = data.fullname;
        }

        if (data.role !== undefined) {
            if (!ALLOWED_ROLES.has(data.role)) {
                return NextResponse.json({ error: 'Role không hợp lệ' }, { status: 400 });
            }

            // Không cho admin tự đổi role của mình (tránh tự khóa khỏi quyền admin).
            if (targetId === caller.id && data.role !== 'ADMIN') {
                return NextResponse.json({ error: 'Không thể tự thay đổi quyền của chính mình' }, { status: 400 });
            }

            // Không cho phép demote admin cuối cùng còn lại.
            if (data.role !== 'ADMIN') {
                const target = await prisma.user.findUnique({ where: { id: targetId }, select: { role: true } });
                if (target?.role === 'ADMIN') {
                    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
                    if (adminCount <= 1) {
                        return NextResponse.json({ error: 'Không thể demote admin duy nhất còn lại' }, { status: 400 });
                    }
                }
            }

            updateData.role = data.role;
        }

        // Cập nhật password nếu có — luôn hash bằng bcrypt
        if (data.password && data.password.trim() !== '') {
            updateData.password = await bcrypt.hash(data.password.trim(), 10);
        }

        await prisma.user.update({
            where: { id: targetId },
            data: updateData
        });
        return NextResponse.json({ success: true });
    } catch(error) {
        return NextResponse.json({ error: 'Lỗi cập nhật user' }, { status: 500 });
    }
}

export async function DELETE(request, context) {
    if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const params = await context.params;

    try {
        // Kiểm tra xem user này đã từng tham gia sửa chữa nào chưa, 
        // Nếu có thì nên chặn xóa (để toàn vẹn DB) hoặc chuyển techId
        const count = await prisma.maintenanceRecord.count({
            where: { technicianId: parseInt(params.id) }
        });

        if (count > 0) {
            return NextResponse.json({ error: 'Tài khoản này đã có lịch sử sửa chữa trong hệ thống, không thể xóa để bảo đảm toàn vẹn dữ liệu.' }, { status: 400 });
        }

        await prisma.user.delete({
            where: { id: parseInt(params.id) }
        });
        return NextResponse.json({ success: true });
    } catch(error) {
        return NextResponse.json({ error: 'Lỗi xóa user' }, { status: 500 });
    }
}
