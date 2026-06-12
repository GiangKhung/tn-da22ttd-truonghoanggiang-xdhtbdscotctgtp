import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('q') || '';
  const brand = searchParams.get('brand') || '';
  const model = searchParams.get('model') || '';
  const year = searchParams.get('year') || '';
  const minMileage = searchParams.get('minMileage') || '';
  const maxMileage = searchParams.get('maxMileage') || '';
  
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const skip = (page - 1) * limit;

  try {
    const whereClause = {
      AND: [
        {
          OR: [
            { licensePlate: { contains: search } },
            { ownerName: { contains: search } },
          ]
        },
        brand ? { brand: { contains: brand } } : {},
        model ? { model: { contains: model } } : {},
        year ? { year: parseInt(year) } : {},
        minMileage ? { mileage: { gte: parseFloat(minMileage) } } : {},
        maxMileage ? { mileage: { lte: parseFloat(maxMileage) } } : {},
      ].filter(condition => Object.keys(condition).length > 0)
    };

    const total = await prisma.car.count({ where: whereClause });
    const cars = await prisma.car.findMany({
      where: whereClause,
      orderBy: { id: 'desc' },
      skip,
      take: limit,
      include: {
        _count: {
          select: { maintenanceRecords: true }
        }
      }
    });
    
    return NextResponse.json({
        data: cars,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch cars' }, { status: 500 });
  }
}


export async function POST(request) {
  try {
    const data = await request.json();
    const car = await prisma.car.create({
      data: {
        licensePlate: data.licensePlate,
        brand: data.brand,
        model: data.model,
        year: parseInt(data.year),
        mileage: parseFloat(data.mileage),
        ownerName: data.ownerName,
        ownerPhone: data.ownerPhone || null,
        driverLicenseClass: data.driverLicenseClass || null,
        vin: data.vin || null,
        engineNumber: data.engineNumber || null,
        color: data.color || null,
      }
    });
    return NextResponse.json(car, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Biển số xe đã tồn tại' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create car' }, { status: 500 });
  }
}
