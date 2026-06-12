import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin", "vietnamese"],
});

export const metadata = {
  title: "Gara Trường Phát | Đẳng Cấp Bảo Dưỡng Xứng Tầm Xế Yêu",
  description: "Dịch vụ bảo dưỡng, sửa chữa ô tô chuyên nghiệp, tận tâm và uy tín hàng đầu. Đặt lịch hẹn ngay để trải nghiệm dịch vụ đẳng cấp.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={`${inter.variable} ${playfair.variable}`}>
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
