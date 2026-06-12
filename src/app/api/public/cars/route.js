import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;

function getToken(request) {
  const cookieToken = request.cookies.get('token')?.value;
  if (cookieToken) return cookieToken;
  const authHeader = request.headers.get('authorization') ?? '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

function verifyCustomer(token) {
  const decoded = jwt.verify(token, SECRET);
  if (decoded.role !== 'CUSTOMER') throw new Error('Forbidden');
  return decoded;
}

export async function GET(request) {
  if (!SECRET) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  const token = getToken(request);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const decoded = verifyCustomer(token);
    const customer = await prisma.customer.findUnique({ where: { id: decoded.id } });
    if (!customer) return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });

    const cars = await prisma.car.findMany({
      where: {
        ownerPhone: customer.phone
      },
      orderBy: { id: 'desc' }
    });

    return NextResponse.json({ cars });
  } catch (err) {
    return NextResponse.json({ error: 'Token không hợp lệ hoặc đã hết hạn' }, { status: 401 });
  }
}

export async function POST(request) {
  if (!SECRET) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  const token = getToken(request);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const decoded = verifyCustomer(token);
    const customer = await prisma.customer.findUnique({ where: { id: decoded.id } });
    if (!customer) return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });

    const body = await request.json();
    const { licensePlate, brand, model, year, mileage, vin, engineNumber, color } = body;

    if (!licensePlate || !brand || !model) {
      return NextResponse.json({ error: 'Thiếu thông tin xe bắt buộc' }, { status: 400 });
    }

    const normPlate = licensePlate.trim().replace(/[\s-]/g, '').toUpperCase();
    if (normPlate.length < 5) {
      return NextResponse.json({ error: 'Biển số xe không hợp lệ' }, { status: 400 });
    }

    // Check if plate exists
    const existing = await prisma.car.findUnique({ where: { licensePlate: normPlate } });
    if (existing) {
      if (existing.ownerPhone && existing.ownerPhone.replace(/\s+/g, '') !== customer.phone.replace(/\s+/g, '')) {
        return NextResponse.json({ error: 'Biển số xe này đã được đăng ký bởi tài khoản khác.' }, { status: 400 });
      }
      
      // Update existing car to associate with this user
      const updatedCar = await prisma.car.update({
        where: { id: existing.id },
        data: {
          brand,
          model,
          year: parseInt(year) || existing.year,
          mileage: parseFloat(mileage) || existing.mileage,
          ownerName: customer.fullname || existing.ownerName || 'Chủ xe',
          ownerPhone: customer.phone,
          vin: vin || existing.vin,
          engineNumber: engineNumber || existing.engineNumber,
          color: color || existing.color,
        }
      });

      // Update customer default plate if not set
      if (!customer.licensePlate) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { licensePlate: normPlate }
        });
      }

      return NextResponse.json({ car: updatedCar });
    }

    // Create new car
    const newCar = await prisma.car.create({
      data: {
        licensePlate: normPlate,
        brand,
        model,
        year: parseInt(year) || new Date().getFullYear(),
        mileage: parseFloat(mileage) || 0,
        ownerName: customer.fullname || 'Chủ xe',
        ownerPhone: customer.phone,
        vin: vin || null,
        engineNumber: engineNumber || null,
        color: color || null,
      }
    });

    // Update customer default plate if not set
    if (!customer.licensePlate) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { licensePlate: normPlate }
      });
    }

    return NextResponse.json({ car: newCar }, { status: 201 });
  } catch (err) {
    console.error('Error adding car:', err);
    return NextResponse.json({ error: err.message || 'Lỗi thêm xe' }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!SECRET) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  const token = getToken(request);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const decoded = verifyCustomer(token);
    const customer = await prisma.customer.findUnique({ where: { id: decoded.id } });
    if (!customer) return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const carId = parseInt(searchParams.get('id'));
    if (!carId) return NextResponse.json({ error: 'Thiếu mã xe' }, { status: 400 });

    const car = await prisma.car.findUnique({ where: { id: carId } });
    if (!car) return NextResponse.json({ error: 'Không tìm thấy xe' }, { status: 404 });

    if (car.ownerPhone.replace(/\s+/g, '') !== customer.phone.replace(/\s+/g, '')) {
      return NextResponse.json({ error: 'Bạn không có quyền gỡ xe này' }, { status: 403 });
    }

    // Unassociate the car
    await prisma.car.update({
      where: { id: carId },
      data: { ownerPhone: null }
    });

    // If it was the default plate for customer, clear or set to another car
    if (customer.licensePlate === car.licensePlate) {
      const remainingCars = await prisma.car.findFirst({
        where: { ownerPhone: customer.phone, id: { not: carId } }
      });
      await prisma.customer.update({
        where: { id: customer.id },
        data: { licensePlate: remainingCars?.licensePlate || null }
      });
    }

    return NextResponse.json({ message: 'Đã gỡ xe thành công' });
  } catch (err) {
    return NextResponse.json({ error: 'Lỗi gỡ xe' }, { status: 500 });
  }
}
