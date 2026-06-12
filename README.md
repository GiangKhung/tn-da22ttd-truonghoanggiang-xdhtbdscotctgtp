# GaraTP — Hệ thống Quản lý & Chăm sóc Gara Ô tô Trường Phát

> **Đồ án Tốt nghiệp ngành Công nghệ thông tin**  
> Hệ thống đa nền tảng gồm **Web Dashboard quản trị** (Next.js) & **Mobile App khách hàng** (React Native/Expo) tích hợp **Trí tuệ nhân tạo (AI Assistant)** chẩn đoán lỗi xe thông minh.

---

## 🚀 Tổng quan dự án

**GaraTP** là giải pháp số hóa toàn diện quy trình vận hành và quản lý dành cho các xưởng sửa chữa, bảo dưỡng ô tô quy mô vừa và lớn. Hệ thống giải quyết triệt để bài toán kết nối giữa **nhà quản lý**, **kỹ thuật viên** và **khách hàng** thông qua nền tảng Web & Mobile thời gian thực.

```
┌────────────────────────────────────────────────────────────────────────┐
│                               AI Engine                                │
│         (Google Gemini AI / Cerebras LLM - Chẩn đoán & Gợi ý)          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                             Next.js Server                             │
│                  (REST API, Prisma ORM, SQLite/Postgres)               │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
┌───────────────────▼────────────────────┐  ┌────────▼───────────────────────────┐
│           Web Dashboard App            │  │            Mobile App             │
│        (Next.js App Router)            │  │       (React Native/Expo)         │
│  - Quản trị viên & Kỹ thuật viên       │  │  - Khách hàng đặt lịch, tra cứu   │
│  - Lập phiếu, xuất hóa đơn, báo cáo   │  │  - Theo dõi tiến độ xe sửa chữa   │
└────────────────────────────────────────┘  └────────────────────────────────────┘
```

---

## 🛠️ Công nghệ sử dụng (Tech Stack)

### 💻 Web Dashboard & Backend API
*   **Framework:** [Next.js 16 (App Router)](https://nextjs.org/) & React 19
*   **Database ORM:** [Prisma](https://www.prisma.io/)
*   **Cơ sở dữ liệu:** SQLite (Dễ dàng cấu hình chuyển sang PostgreSQL hoặc MySQL)
*   **Styling:** Vanilla CSS & Tailwind CSS
*   **Biểu đồ báo cáo:** [Recharts](https://recharts.org/)
*   **Thông báo:** React Hot Toast
*   **Xác thực bảo mật:** JWT (JSON Web Tokens) qua HTTP-only cookies

### 📱 Mobile App (Khách hàng)
*   **Framework:** [React Native](https://reactnative.dev/) (Expo SDK 54)
*   **Routing:** Expo Router (File-based navigation)
*   **Quản lý trạng thái:** React Query (TanStack Query) cho tối ưu hóa Caching & Fetching
*   **Lưu trữ cục bộ:** React Native Async Storage
*   **UI/UX:** React Native StyleSheet, Custom UI Components với thiết kế hiện đại, tối ưu hóa giao diện tối (Dark mode)

### 🤖 Trí tuệ nhân tạo (AI Core)
*   **SDK:** `@google/generative-ai` (Google Gemini 1.5 Flash)
*   **Fallback engine:** Cerebras Llama 3.1 Inference API (cho tốc độ phản hồi cực nhanh dưới 0.5 giây)

---

## ✨ Các tính năng chính

### 1. Phân hệ Web Dashboard (Dành cho Quản trị viên & Kỹ thuật viên)
*   📊 **Dashboard thống kê trực quan:** Biểu đồ doanh thu theo tháng/năm, số lượng xe bảo dưỡng, tỷ lệ lấp đầy lịch hẹn và cảnh báo tồn kho phụ tùng.
*   🚗 **Quản lý Xe & Khách hàng:** Theo dõi hồ sơ xe (biển số, số khung, số máy, đời xe, màu sắc) và thông tin chủ sở hữu.
*   📋 **Quản lý Lịch hẹn (Appointments):** Tiếp nhận, xác nhận, hủy lịch hẹn, cập nhật lý do và tự động phân bổ kỹ thuật viên phụ trách.
*   🛠️ **Quản lý Phiếu bảo dưỡng (Maintenance Records):** 
    *   Tạo phiếu sửa chữa mới, chỉ định kỹ thuật viên phụ trách.
    *   Thêm/bớt hạng mục sửa chữa, vật tư phụ tùng thay thế với giá cập nhật theo thời gian thực.
    *   Tải lên hình ảnh bằng chứng (Evidences) trạng thái xe trước/sau khi làm để đảm bảo tính minh bạch.
*   💰 **In hóa đơn & Báo cáo doanh thu:** Tích hợp tính năng in hóa đơn sửa chữa (invoice) chuyên nghiệp hỗ trợ in nhiệt/in A4 trực tiếp từ trình duyệt.
*   ⚙️ **Quản lý kho phụ tùng (Inventory):** Quản lý danh mục phụ tùng, số lượng tồn kho, giá nhập/bán, cảnh báo khi phụ tùng sắp hết.
*   👥 **Quản lý nhân sự:** Phân quyền người dùng rõ ràng (ADMIN và TECHNICIAN).
*   🤖 **AI Diagnostic Assistant:** Hỗ trợ kỹ thuật viên nhập mô tả triệu chứng lỗi xe, AI sẽ tự động phân tích và đưa ra danh sách gợi ý các hạng mục cần bảo dưỡng/kiểm tra và vật tư tương ứng.

### 2. Phân hệ Mobile App (Dành cho Khách hàng)
*   🔑 **Đăng nhập nhanh chóng:** Bảo mật bằng Số điện thoại & Biển số xe đã được đăng ký tại gara.
*   📅 **Đặt lịch hẹn thông minh:** 
    *   Xem lịch trống theo thời gian thực (giới hạn tối đa xe trên mỗi khung giờ để tránh quá tải xưởng).
    *   Chọn ngày hẹn, khung giờ, loại hình dịch vụ và ghi chú triệu chứng xe bị lỗi.
    *   Theo dõi trạng thái lịch hẹn (Đang chờ, Đã xác nhận, Đã hoàn thành, Đã hủy).
*   🔍 **Tra cứu lịch sử bảo dưỡng:** 
    *   Khách hàng dễ dàng xem lại toàn bộ lịch sử các lần xe vào gara sửa chữa.
    *   Xem chi tiết từng hạng mục công việc, danh sách vật tư phụ tùng đã thay thế và chi phí tương ứng.
    *   **Xem ảnh bằng chứng thực tế:** Xem các hình ảnh mà kỹ thuật viên chụp lại trong quá trình sửa chữa để hoàn toàn an tâm.
*   🔔 **Hệ thống thông báo (Notifications):** Nhận thông tin cập nhật trạng thái lịch hẹn hoặc thông báo xe đã sửa chữa xong để tới nhận xe.

---

## 📂 Cấu trúc thư mục dự án

```
GaraTP/
├── prisma/                    # Cấu hình Prisma ORM & Database
│   ├── migrations/            # Lịch sử dịch chuyển cơ sở dữ liệu
│   ├── schema.prisma          # Định nghĩa Database Models
│   └── seed.js                # Dữ liệu khởi tạo mặc định (admin/technician)
├── public/                    # Tài nguyên tĩnh (images, favicons, uploads)
│   └── uploads/               # Nơi lưu trữ ảnh vật chứng bảo dưỡng (được .gitignore bảo vệ)
├── src/                       # Mã nguồn Web Dashboard & API Backend
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # REST API Endpoints (auth, cars, maintenance, AI...)
│   │   ├── components/        # Web components dùng chung (Sidebar, Invoice...)
│   │   ├── dashboard/         # Trang thống kê chính & danh sách lịch hẹn
│   │   ├── maintenance/       # Trang quản lý phiếu bảo dưỡng
│   │   ├── parts/             # Trang quản lý kho phụ tùng
│   │   ├── page.js            # Landing page giới thiệu & đặt lịch trực tuyến
│   │   └── globals.css        # Cấu hình phong cách giao diện Web
│   └── lib/                   # Khởi tạo Prisma Client
├── mobile/                    # Mã nguồn React Native Mobile App (Expo)
│   ├── app/                   # Expo Router Routes (Tabs & Screens)
│   │   ├── (tabs)/            # Bottom Tabs: Đặt lịch, Lịch hẹn, Lịch sử
│   │   └── _layout.tsx        # Cấu hình Root Layout & Providers
│   ├── src/                   # Mã nguồn logic mobile
│   │   ├── api/               # Fetch API Client & endpoints
│   │   └── components/        # Thư viện UI components của Mobile App
│   ├── app.json               # Cấu hình Expo Project
│   └── metro.config.js        # Cấu hình Metro Bundler
├── .env.example               # File cấu hình biến môi trường mẫu
├── package.json               # dependencies & scripts dự án Web
└── README.md                  # Tài liệu hướng dẫn dự án
```

---

## ⚙️ Hướng dẫn cài đặt & Chạy dự án

### Điều kiện tiên quyết (Prerequisites)
*   Đã cài đặt [Node.js](https://nodejs.org/) (Khuyến nghị phiên bản LTS 18 hoặc 20+)
*   Điện thoại thông minh đã cài ứng dụng **Expo Go** (để chạy thử app mobile)

---

### 1. Cấu hình & Chạy Web Backend (Next.js)

1.  **Cài đặt các gói phụ thuộc:**
    ```bash
    npm install
    ```

2.  **Thiết lập biến môi trường:**
    *   Tạo file `.env` ở thư mục gốc của dự án từ file `.env.example`:
        ```bash
        cp .env.example .env
        ```
    *   Mở file `.env` và điền các khóa cần thiết (đặc biệt là `JWT_SECRET` và `GEMINI_API_KEY` của bạn).

3.  **Khởi tạo cơ sở dữ liệu (Prisma Migrations & Seeding):**
    *   Chạy lệnh dịch chuyển để tạo cơ sở dữ liệu SQLite cục bộ (`dev.db`):
        ```bash
        npx prisma migrate dev --name init
        ```
    *   Chạy script nạp dữ liệu mẫu cho tài khoản quản trị và kỹ thuật viên:
        ```bash
        npx prisma db seed
        ```
        *Tài khoản mặc định:*
        *   **Admin:** Username: `admin` / Password: `123`
        *   **Kỹ thuật viên:** Username: `tech1` / Password: `123`

4.  **Chạy server Next.js ở chế độ phát triển:**
    ```bash
    npm run dev
    ```
    *   Giao diện Landing Page & Đặt lịch: [http://localhost:3000](http://localhost:3000)
    *   Giao diện Dashboard Quản trị: [http://localhost:3000/login](http://localhost:3000/login)

5.  **Chạy mạng LAN (Bắt buộc nếu chạy thử App Mobile trên điện thoại thật):**
    ```bash
    npm run dev:lan
    ```

---

### 2. Cấu hình & Chạy Mobile App (Expo)

1.  **Di chuyển vào thư mục mobile:**
    ```bash
    cd mobile
    ```

2.  **Cài đặt các gói phụ thuộc:**
    ```bash
    npm install
    ```

3.  **Thiết lập biến môi trường:**
    *   Tạo file `.env` từ `.env.example`:
        ```bash
        cp .env.example .env
        ```
    *   **Lưu ý cực kỳ quan trọng khi test trên thiết bị thật:** Không sử dụng `localhost` hoặc `127.0.0.1`. Hãy lấy địa chỉ IPv4 máy tính của bạn (bằng cách gõ `ipconfig` trên Terminal Windows) và cấu hình như sau:
        ```env
        EXPO_PUBLIC_API_BASE_URL=http://<IP_VÀ_CỦA_MÁY_TÍNH>:3000
        ```
        Ví dụ: `EXPO_PUBLIC_API_BASE_URL=http://192.168.1.15:3000`

4.  **Chạy ứng dụng Expo:**
    ```bash
    npm start
    ```
    *   Nhấn quét mã QR bằng ứng dụng **Expo Go** trên điện thoại Android, hoặc dùng Camera mặc định quét trên iPhone (Yêu cầu cả điện thoại và máy tính chạy server cùng kết nối chung một mạng Wi-Fi).

---

## 🔒 Bản quyền & Bảo mật

*   Vui lòng không commit các file cấu hình `.env` chứa mật khẩu hoặc khóa API thật lên GitHub public.
*   Dữ liệu ảnh tải lên và cơ sở dữ liệu SQLite cục bộ được cấu hình tự động bỏ qua để đảm bảo sự gọn nhẹ và an toàn cho Repository của bạn.

---
*Chúc bạn bảo vệ đồ án tốt nghiệp thành công rực rỡ!* 🎉
