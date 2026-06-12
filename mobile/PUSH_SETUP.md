# Push Notification — Hướng dẫn bật push thật

App dùng `expo-notifications`. Kể từ **Expo SDK 53+**, remote push notification đã bị
**gỡ khỏi Expo Go** — trong Expo Go app chỉ chạy **thông báo in-app** (poll API mỗi 10s
ở màn hình Tài khoản). Để có push đẩy thật (OS notification kể cả khi app đóng), cần
**development build** thay vì Expo Go.

Code đã xử lý sẵn: khi chạy Expo Go, `src/lib/notifications.ts` tự bỏ qua push (không
import nặng, không cảnh báo). Khi chạy development/standalone build có EAS `projectId`,
nó tự đăng ký và gửi token lên server qua `savePushToken`.

## Các bước bật push thật

### 1. Cài EAS CLI và đăng nhập
```bash
npm install -g eas-cli
eas login            # cần tài khoản Expo (expo.dev) miễn phí
```

### 2. Khởi tạo project (ghi projectId vào app.json)
```bash
cd mobile
eas init
```
Lệnh này tạo project trên expo.dev và tự thêm `extra.eas.projectId` vào `app.json`.
Đây chính là giá trị `registerForPushNotificationsAsync()` cần để lấy Expo push token.

### 3. (Android) Cấu hình FCM
Push Android đi qua Firebase Cloud Messaging:
1. Tạo project trên https://console.firebase.google.com, thêm Android app với
   package `com.garatruongphat.mobile`.
2. Tải `google-services.json`, để vào thư mục `mobile/` và khai báo trong `app.json`:
   ```json
   "android": { "googleServicesFile": "./google-services.json" }
   ```
3. Lấy **FCM V1 service account key** (Project settings → Service accounts →
   Generate new private key) rồi tải lên Expo:
   ```bash
   eas credentials   # chọn Android → FCM V1 → upload file JSON
   ```

### 4. Build development client
```bash
eas build --profile development --platform android
```
Cài file APK lên máy/emulator, rồi chạy:
```bash
npx expo start --dev-client
```
Mở app từ development build (KHÔNG phải Expo Go). Lúc này push token sẽ đăng ký thật.

### 5. Test gửi push
Dùng công cụ của Expo: https://expo.dev/notifications — dán Expo push token
(in ra trong log hoặc lưu ở DB qua `savePushToken`) để gửi thử.

## Profiles trong eas.json
- `development` — dev client (`developmentClient: true`), APK, cài trực tiếp để dev.
- `preview` — APK nội bộ để demo/QA, không cần dev client.
- `production` — build release để phát hành.

## Lưu ý
- Push **không hoạt động trên emulator iOS** và **không hoạt động trong Expo Go** —
  bắt buộc development/standalone build (Android emulator có FCM thì OK).
- Khi chưa làm các bước trên, app vẫn chạy bình thường với thông báo in-app.
