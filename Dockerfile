# Sử dụng image Node.js chính thức phiên bản 20 trên nền Alpine Linux để tối ưu hóa dung lượng
FROM node:20-alpine AS builder

# Cài đặt libc6-compat (cần thiết cho một số thư viện Node native chạy trên Alpine) và openssl (cần thiết cho Prisma)
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Sao chép các tệp cấu hình package
COPY package.json package-lock.json ./

# Cài đặt toàn bộ dependencies (bao gồm cả devDependencies để phục vụ cho việc build)
RUN npm ci

# Sao chép toàn bộ mã nguồn vào container
COPY . .

# Khởi tạo Prisma Client dựa trên schema.prisma
RUN npx prisma generate

# Tắt tính năng thu thập dữ liệu ẩn danh của Next.js và tiến hành build ứng dụng
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Loại bỏ devDependencies để giảm tối đa kích thước của node_modules cho môi trường production
RUN npm prune --production

# ==============================================================================
# Giai đoạn Runner: Chạy ứng dụng trong môi trường production gọn nhẹ
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV production
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED 1

# Chỉ sao chép các thư mục và tệp tin thực sự cần thiết từ giai đoạn build trước
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Tạo thư mục lưu trữ CSDL SQLite và thư mục ảnh tải lên, đảm bảo container có quyền ghi dữ liệu
RUN mkdir -p /app/public/uploads /app/db

EXPOSE 3000

# Lệnh khởi chạy: 
# 1. Chạy các file migrations để cập nhật cấu trúc database mới nhất
# 2. Chạy seed để khởi tạo tài khoản admin và tech nếu chưa có
# 3. Khởi động ứng dụng Next.js ở chế độ production
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npm start"]
