import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, serviceLabels, spacing } from '@/theme';
import { formatDateTime } from '@/utils/format';
import { StatusBadge } from './StatusBadge';
import type { CustomerAppointment } from '@/api/public';

type Props = {
  appointment: CustomerAppointment;
  onCancel?: (id: number) => void;
};

export function AppointmentCard({ appointment, onCancel }: Props) {
  const canCancel =
    !!onCancel &&
    (appointment.status === 'PENDING' || appointment.status === 'CONFIRMED');

  function confirmCancel() {
    Alert.alert(
      'Hủy lịch hẹn?',
      'Bạn có chắc muốn hủy lịch hẹn này?',
      [
        { text: 'Quay lại', style: 'cancel' },
        {
          text: 'Hủy lịch',
          style: 'destructive',
          onPress: () => onCancel?.(appointment.id),
        },
      ],
      { cancelable: true }
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.service}>
          {serviceLabels[appointment.serviceType] ?? appointment.serviceType}
        </Text>
        <StatusBadge status={appointment.status} />
      </View>
      <Text style={styles.datetime}>{formatDateTime(appointment.appointmentDate)}</Text>
      {appointment.note ? (
        <Text style={styles.note} numberOfLines={3}>
          “{appointment.note}”
        </Text>
      ) : null}
      {appointment.status === 'CANCELLED' && appointment.cancelReason ? (
        <Text style={styles.cancelReason}>
          Lý do hủy: “{appointment.cancelReason}”
        </Text>
      ) : null}


      {canCancel && (
        <Pressable style={styles.cancelBtn} onPress={confirmCancel}>
          <Text style={styles.cancelText}>Hủy lịch hẹn</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  service: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  datetime: {
    fontSize: 14,
    color: colors.textMuted,
  },
  note: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  cancelBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  cancelText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 13,
  },
  cancelReason: {
    fontSize: 13,
    color: colors.danger,
    fontWeight: '500',
    fontStyle: 'italic',
  },
});
