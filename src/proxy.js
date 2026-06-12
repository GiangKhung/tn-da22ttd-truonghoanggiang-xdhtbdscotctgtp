import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// ── Cấu hình route ───────────────────────────────────────────────────────────

// Các trang quản lý dành cho nhân viên (Staff: ADMIN/TECHNICIAN)
const STAFF_PAGES = [
  '/dashboard',
  '/cars',
  '/maintenance',
  '/parts',
  '/reports',
  '/users',
];

// Các trang dành cho khách hàng (Customer) trên web
const CUSTOMER_PAGES = [
  '/customer/profile',
];

// API public — không yêu cầu auth ở middleware (handler tự kiểm tra nếu cần).
const PUBLIC_API_PATHS = new Set([
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/customer',
  '/api/auth/customer/me',
  '/api/auth/customer/change-password',
  '/api/auth/change-password',
  '/api/bookings',
  '/api/ai/scan-car',
  '/api/seed',
]);

const PUBLIC_API_PREFIXES = ['/api/public/'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function isPublicApi(pathname) {
  if (PUBLIC_API_PATHS.has(pathname)) return true;
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function applyDevCors(response) {
  if (process.env.NODE_ENV === 'production') return response;
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

// ── Middleware Logic ─────────────────────────────────────────────────────────

export default async function proxy(request) {
  const { pathname } = request.nextUrl;

  const isStaffPage = STAFF_PAGES.some(p => pathname.startsWith(p));
  const isCustomerPage = CUSTOMER_PAGES.some(p => pathname.startsWith(p));
  const isApi = pathname.startsWith('/api/');

  // 1. Kiểm tra API Public (CORS support cho mobile)
  if (isApi && isPublicApi(pathname)) {
    if (request.method === 'OPTIONS') {
      return applyDevCors(new NextResponse(null, { status: 204 }));
    }
    return applyDevCors(NextResponse.next());
  }

  // 2. Nếu không phải route cần bảo vệ, cho qua
  if (!isStaffPage && !isCustomerPage && !isApi) {
    return NextResponse.next();
  }

  // 3. Lấy token
  const secret = process.env.JWT_SECRET;
  const token = request.cookies.get('token')?.value;

  if (!token || !secret) {
    if (isApi) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // Nếu là trang staff hoặc customer, chuyển hướng về login tương ứng
    const loginPath = isStaffPage ? '/login' : '/customer/auth';
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  try {
    // 4. Verify token dùng jose (Edge Runtime compatible)
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);

    // 5. Kiểm tra quyền hạn
    
    // Nếu vào trang Staff mà role là CUSTOMER -> Chặn
    if (isStaffPage && payload.role === 'CUSTOMER') {
      return NextResponse.redirect(new URL('/customer/profile', request.url));
    }

    // Nếu vào trang Customer mà role không phải CUSTOMER -> Redirect về dashboard hoặc cho qua (tùy ý)
    // Ở đây cho phép Staff xem profile khách hàng nếu cần, hoặc redirect.
    
    // 6. Chèn thông tin user vào headers cho API handlers
    if (isApi) {
      const response = NextResponse.next();
      response.headers.set('x-user-id', String(payload.id ?? ''));
      response.headers.set('x-user-role', String(payload.role ?? ''));
      return applyDevCors(response);
    }

    return NextResponse.next();
  } catch (err) {
    console.error('Middleware Error:', err.message);
    if (isApi) return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    
    const loginPath = isStaffPage ? '/login' : '/customer/auth';
    const url = new URL(loginPath, request.url);
    url.searchParams.set('expired', '1');
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    '/api/:path*',
    '/dashboard/:path*',
    '/cars/:path*',
    '/maintenance/:path*',
    '/parts/:path*',
    '/reports/:path*',
    '/users/:path*',
    '/customer/:path*',
  ],
};
