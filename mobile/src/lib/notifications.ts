import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Expo Go (SDK 53+) đã gỡ remote push notifications. Khi chạy trong Expo Go,
 * chỉ riêng việc import 'expo-notifications' đã in ra cảnh báo và push không
 * hoạt động thật. Vì vậy ta phát hiện môi trường Expo Go và bỏ qua hoàn toàn
 * phần push — app vẫn dùng thông báo in-app (polling API) như bình thường.
 *
 * Push thật chỉ chạy khi build development/standalone (xem PUSH_SETUP.md).
 */
export const isExpoGo = Constants.executionEnvironment === 'storeClient';

/**
 * Đăng ký nhận push notification và trả về Expo push token.
 *
 * Trả về null khi: đang chạy trong Expo Go, người dùng từ chối quyền, hoặc
 * thiếu EAS projectId (chưa cấu hình dev build). Mọi trường hợp null đều an
 * toàn — caller chỉ cần bỏ qua, không lưu token.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (isExpoGo) {
    // Trong Expo Go không có push thật — tránh import để không in cảnh báo.
    return null;
  }

  // Lazy import: chỉ nạp expo-notifications khi KHÔNG ở Expo Go.
  const Notifications = await import('expo-notifications');

  // Hiển thị notification khi app đang mở (foreground).
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn(
      '⚠️ expo-notifications: Thiếu EAS projectId. Chạy `eas init` rồi build development để bật push thật (xem PUSH_SETUP.md). Tạm thời dùng thông báo in-app.'
    );
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  return token;
}
