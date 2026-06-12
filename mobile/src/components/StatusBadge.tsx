import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, statusLabels } from '@/theme';

const STATUS_COLOR: Record<string, string> = {
  PENDING: colors.pending,
  CONFIRMED: colors.confirmed,
  COMPLETED: colors.completed,
  CANCELLED: colors.cancelled,
  QUOTING: colors.quoting,
  IN_PROGRESS: colors.inProgress,
};

type Props = { status: string };

export function StatusBadge({ status }: Props) {
  const color = STATUS_COLOR[status] ?? colors.textMuted;
  const label = statusLabels[status] ?? status;
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
