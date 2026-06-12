import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Button } from '@/components/Button';
import { colors, spacing } from '@/theme';

export default function BookingSuccessScreen() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.emoji}>✅</Text>
      <Text style={styles.title}>Đặt lịch thành công!</Text>
      <Text style={styles.body}>
        Gara sẽ liên hệ xác nhận lịch hẹn trong thời gian sớm nhất. Bạn có thể
        theo dõi trạng thái và hủy lịch trong tab “Lịch của tôi”.
      </Text>
      <View style={styles.actions}>
        <Button
          title="Xem lịch của tôi"
          onPress={() => {
            router.dismissAll();
            router.replace('/(tabs)/appointments');
          }}
        />
        <Button
          title="Đặt thêm lịch khác"
          variant="ghost"
          onPress={() => {
            router.dismissAll();
            router.replace('/(tabs)');
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.md,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 56 },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    width: '100%',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
});
