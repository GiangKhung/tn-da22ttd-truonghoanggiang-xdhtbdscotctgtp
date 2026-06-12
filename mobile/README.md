# Gara Trường Phát — Mobile (Expo)

App khách hàng (không cần đăng nhập) cho hệ thống Gara Trường Phát.

## Tính năng MVP

- Đặt lịch dịch vụ (gọi `POST /api/bookings`).
- Hiển thị khung giờ còn trống theo ngày (`GET /api/bookings?date=...`).
- Xem các lịch hẹn đã đặt theo SĐT + biển số (`GET /api/public/appointments`).
- Hủy lịch đang chờ (`PATCH /api/public/appointments/:id`).
- Tra cứu lịch sử bảo dưỡng / sửa chữa của xe (`GET /api/public/history`).

## Stack

- Expo SDK 52 + Expo Router (file-based routing).
- React Query cho fetching/caching.
- `@react-native-async-storage/async-storage` để nhớ SĐT + biển số (thay cho auth).
- `@react-native-community/datetimepicker` cho date picker native.

## Chạy thử

1. Cài deps:

   ```bash
   cd mobile
   npm install
   ```

2. Tạo file `.env` từ `.env.example`. **Quan trọng:** trên Expo Go điện thoại
   thật, KHÔNG dùng `localhost`. Mở Command Prompt trên máy chạy Next.js, gõ
   `ipconfig`, lấy IPv4 (vd `192.168.1.10`) rồi điền:

   ```
   EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:3000
   ```

3. Chạy backend Next.js ở chế độ LAN (terminal khác, tại `D:\DATN`):

   ```bash
   npm run dev:lan
   ```

   Đảm bảo firewall Windows cho phép kết nối inbound vào port 3000.

4. Chạy Expo:

   ```bash
   npm start
   ```

   Mở Expo Go trên điện thoại quét QR (phải cùng mạng Wi-Fi với máy tính).

## Cấu trúc

```
mobile/
├─ app/                       # Expo Router file-based routes
│  ├─ _layout.tsx             # QueryClientProvider + Stack root
│  ├─ (tabs)/
│  │  ├─ _layout.tsx          # Bottom tabs
│  │  ├─ index.tsx            # Đặt lịch
│  │  ├─ appointments.tsx     # Lịch của tôi
│  │  └─ history.tsx          # Lịch sử sửa chữa
│  └─ booking/success.tsx     # Modal sau khi đặt thành công
├─ src/
│  ├─ api/                    # fetch wrapper + endpoints
│  ├─ components/             # UI building blocks
│  ├─ storage/identity.ts     # AsyncStorage cho SĐT + biển số
│  ├─ theme/                  # màu, spacing, label tiếng Việt
│  └─ utils/format.ts         # định dạng VND, ngày, biển số
├─ app.json
├─ package.json
└─ tsconfig.json
```

## Ghi chú bảo mật

- Các endpoint mới `/api/public/*` đều yêu cầu **cả** SĐT và biển số để khớp
  với record, tránh enumeration. Không trả lại các trường nhạy cảm
  (`technicianId`, `laborCost`, giá vốn từng phụ tùng).
- Trong production cần thay CORS `*` bằng allow-list domain cụ thể của app.
