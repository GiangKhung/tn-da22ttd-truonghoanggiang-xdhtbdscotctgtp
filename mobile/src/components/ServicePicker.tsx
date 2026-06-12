import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, serviceLabels, spacing } from '@/theme';

const SERVICES = [
  { id: 'MAINTENANCE', label: serviceLabels.MAINTENANCE, hint: 'Định kỳ theo km' },
  { id: 'REPAIR', label: serviceLabels.REPAIR, hint: 'Hỏng hóc bất thường' },
  { id: 'WASHING', label: serviceLabels.WASHING, hint: 'Vệ sinh, đánh bóng' },
  { id: 'TIRE', label: serviceLabels.TIRE, hint: 'Phanh, lốp, treo' },
] as const;

export type ServiceId = (typeof SERVICES)[number]['id'];

type Props = {
  value: ServiceId;
  onChange: (id: ServiceId) => void;
};

export function ServicePicker({ value, onChange }: Props) {
  return (
    <View style={styles.grid}>
      {SERVICES.map((s) => {
        const active = s.id === value;
        return (
          <Pressable
            key={s.id}
            onPress={() => onChange(s.id)}
            style={[styles.card, active && styles.cardActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{s.label}</Text>
            <Text style={[styles.hint, active && styles.hintActive]}>{s.hint}</Text>
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
  card: {
    flexBasis: '48%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  labelActive: { color: colors.primaryFg },
  hint: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textMuted,
  },
  hintActive: { color: '#cbd5e1' },
});
