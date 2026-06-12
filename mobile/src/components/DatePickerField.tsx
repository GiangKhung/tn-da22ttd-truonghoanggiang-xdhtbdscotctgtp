import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, radius, spacing } from '@/theme';
import { formatDate, toDateInput } from '@/utils/format';

type Props = {
  value: string; // YYYY-MM-DD
  onChange: (next: string) => void;
  minDate?: Date;
};

export function DatePickerField({ value, onChange, minDate }: Props) {
  const [open, setOpen] = useState(Platform.OS === 'ios');
  const current = value ? new Date(value) : new Date();

  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.field}
        accessibilityRole="button"
      >
        <Text style={styles.label}>Ngày hẹn</Text>
        <Text style={styles.value}>{formatDate(value)}</Text>
      </Pressable>

      {open && (
        <DateTimePicker
          value={current}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={minDate ?? new Date()}
          onChange={(event, selected) => {
            if (Platform.OS !== 'ios') setOpen(false);
            if (event.type === 'dismissed') return;
            if (selected) onChange(toDateInput(selected));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
});
