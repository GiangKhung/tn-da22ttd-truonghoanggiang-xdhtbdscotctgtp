import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';

const SLOTS = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const MAX_PER_HOUR = 10;

type Props = {
  value: string;
  onChange: (slot: string) => void;
  occupancy: Record<string, number>;
  selectedDate?: string;
};

export function TimeSlotGrid({ value, onChange, occupancy, selectedDate }: Props) {
  return (
    <View style={styles.grid}>
      {SLOTS.map((slot) => {
        const hour = parseInt(slot.split(':')[0], 10);
        const count = occupancy[String(hour)] ?? 0;
        const full = count >= MAX_PER_HOUR;
        const active = value === slot;

        const d = new Date();
        const localToday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const currentHour = d.getHours();
        const isToday = selectedDate === localToday;
        const isPast = isToday && hour <= currentHour;
        const disabled = full || isPast;

        return (
          <Pressable
            key={slot}
            onPress={() => !disabled && onChange(slot)}
            style={[
              styles.slot,
              active && styles.slotActive,
              disabled && styles.slotFull,
              isPast && { backgroundColor: '#e2e8f0', borderColor: colors.border },
            ]}
            disabled={disabled}
          >
            <Text
              style={[
                styles.slotText,
                active && styles.slotTextActive,
                disabled && styles.slotTextFull,
              ]}
            >
              {slot}
            </Text>
            <Text
              style={[
                styles.slotMeta,
                active && styles.slotMetaActive,
                disabled && styles.slotTextFull,
                isPast && { color: colors.textMuted },
              ]}
            >
              {isPast ? 'Đã qua' : (full ? 'Đã đầy' : `${MAX_PER_HOUR - count} chỗ`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slot: {
    flexBasis: '30%',
    flexGrow: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  slotActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  slotFull: {
    backgroundColor: '#f1f5f9',
    borderColor: colors.border,
  },
  slotText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  slotTextActive: { color: colors.accentFg },
  slotTextFull: { color: colors.textSubtle },
  slotMeta: {
    marginTop: 2,
    fontSize: 11,
    color: colors.textMuted,
  },
  slotMetaActive: { color: '#dbeafe' },
});
