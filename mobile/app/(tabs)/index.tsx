import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';

import { Button } from '@/components/Button';
import { DatePickerField } from '@/components/DatePickerField';
import { Field } from '@/components/Field';
import { ServicePicker, type ServiceId } from '@/components/ServicePicker';
import { TimeSlotGrid } from '@/components/TimeSlotGrid';
import { createBooking, getOccupancy } from '@/api/bookings';
import { getMyCars } from '@/api/public';
import { saveIdentity } from '@/storage/identity';
import { useCustomer } from '@/context/AuthContext';
import { colors, spacing, radius } from '@/theme';
import { normalizePhone, normalizePlate, toDateInput } from '@/utils/format';

type FormState = {
  customerName: string;
  phoneNumber: string;
  licensePlate: string;
  serviceType: ServiceId;
  date: string;
  time: string;
  note: string;
};

const DEFAULT_FORM: FormState = {
  customerName: '',
  phoneNumber: '',
  licensePlate: '',
  serviceType: 'MAINTENANCE',
  date: toDateInput(new Date()),
  time: '09:00',
  note: '',
};

export default function BookingScreen() {
  const customer = useCustomer();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const carsQuery = useQuery({
    queryKey: ['my-cars'],
    queryFn: () => getMyCars(),
    enabled: !!customer,
  });

  const cars = carsQuery.data?.cars ?? [];

  // Tự điền thông tin từ tài khoản đã đăng nhập.
  const firstCarPlate = cars[0]?.licensePlate;
  useEffect(() => {
    if (!customer) return;
    setForm((prev) => ({
      ...prev,
      customerName: prev.customerName || customer.fullname || '',
      phoneNumber: prev.phoneNumber || customer.phone || '',
      licensePlate: prev.licensePlate || customer.licensePlate || (firstCarPlate ?? ''),
    }));
  }, [customer?.id, customer?.fullname, customer?.phone, customer?.licensePlate, firstCarPlate]);

  const occupancyQuery = useQuery({
    queryKey: ['occupancy', form.date],
    queryFn: () => getOccupancy(form.date),
    enabled: !!form.date,
  });

  const occupancy = occupancyQuery.data?.occupancy ?? {};

  const mutation = useMutation({
    mutationFn: (payload: FormState) => {
      const isoDate = new Date(`${payload.date}T${payload.time}:00`).toISOString();
      return createBooking({
        customerName: payload.customerName.trim(),
        phoneNumber: normalizePhone(payload.phoneNumber),
        licensePlate: normalizePlate(payload.licensePlate),
        serviceType: payload.serviceType,
        appointmentDate: isoDate,
        note: payload.note.trim() || undefined,
      });
    },
    onSuccess: async (_data, vars) => {
      await saveIdentity({
        customerName: vars.customerName.trim(),
        phone: normalizePhone(vars.phoneNumber),
        licensePlate: normalizePlate(vars.licensePlate),
      });
      router.push('/booking/success');
    },
    onError: (err: any) => {
      Alert.alert('Đặt lịch thất bại', err?.message ?? 'Đã xảy ra lỗi');
    },
  });

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.customerName.trim()) e.customerName = 'Vui lòng nhập họ tên';
    if (!/^[0-9+\- ]{8,15}$/.test(form.phoneNumber.trim()))
      e.phoneNumber = 'Số điện thoại không hợp lệ';
    if (form.licensePlate.trim().length < 5)
      e.licensePlate = 'Biển số xe không hợp lệ';

    const apptDateTime = new Date(`${form.date}T${form.time}:00`);
    if (apptDateTime.getTime() <= Date.now()) {
      Alert.alert('Lỗi', 'Không thể đặt lịch hẹn trong quá khứ. Vui lòng chọn khung giờ khác.');
      return false;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const todayKey = useMemo(() => toDateInput(new Date()), []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Đặt lịch dịch vụ</Text>
        <Text style={styles.subtitle}>
          Gara Trường Phát — chọn dịch vụ, ngày giờ phù hợp.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin chủ xe</Text>
          <Field
            label="Họ và tên"
            placeholder="Nguyễn Văn A"
            value={form.customerName}
            onChangeText={(v) => setForm((p) => ({ ...p, customerName: v }))}
            error={errors.customerName}
          />
          <Field
            label="Số điện thoại"
            placeholder="0912xxxxxx"
            keyboardType="phone-pad"
            value={form.phoneNumber}
            onChangeText={(v) => setForm((p) => ({ ...p, phoneNumber: v }))}
            error={errors.phoneNumber}
          />
          {cars.length > 0 && (
            <View style={{ gap: spacing.xs, marginVertical: spacing.xs }}>
              <Text style={styles.carSelectLabel}>Chọn nhanh xe của bạn:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs, paddingBottom: 4 }}>
                {cars.map((car) => {
                  const isSelected = normalizePlate(form.licensePlate) === normalizePlate(car.licensePlate);
                  return (
                    <TouchableOpacity
                      key={car.id}
                      onPress={() => setForm((p) => ({ ...p, licensePlate: car.licensePlate }))}
                      style={[
                        styles.carSelectChip,
                        isSelected && styles.carSelectChipActive,
                      ]}
                    >
                      <Text style={[styles.carSelectText, isSelected && styles.carSelectTextActive]}>
                        {car.licensePlate} ({car.brand})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
          <Field
            label="Biển số xe"
            placeholder="30A-12345"
            autoCapitalize="characters"
            value={form.licensePlate}
            onChangeText={(v) => setForm((p) => ({ ...p, licensePlate: v }))}
            error={errors.licensePlate}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dịch vụ</Text>
          <ServicePicker
            value={form.serviceType}
            onChange={(id) => setForm((p) => ({ ...p, serviceType: id }))}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thời gian</Text>
          <DatePickerField
            value={form.date}
            onChange={(next) => setForm((p) => ({ ...p, date: next }))}
            minDate={new Date(todayKey)}
          />
          <View style={{ height: spacing.md }} />
          <TimeSlotGrid
            value={form.time}
            onChange={(slot) => setForm((p) => ({ ...p, time: slot }))}
            occupancy={occupancy}
            selectedDate={form.date}
          />
          {occupancyQuery.isLoading && (
            <Text style={styles.helper}>Đang cập nhật khung giờ trống…</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ghi chú</Text>
          <Field
            label="Mô tả tình trạng xe (tùy chọn)"
            placeholder="VD: Xe chạy hơi nặng, đèn check sáng…"
            multiline
            numberOfLines={3}
            value={form.note}
            onChangeText={(v) => setForm((p) => ({ ...p, note: v }))}
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />
        </View>

        <Button
          title="Xác nhận đặt lịch"
          loading={mutation.isPending}
          onPress={() => {
            if (validate()) mutation.mutate(form);
          }}
        />
        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: -spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  helper: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  carSelectLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  carSelectChip: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  carSelectChipActive: {
    backgroundColor: 'rgba(197, 168, 128, 0.08)',
    borderColor: colors.accent,
  },
  carSelectText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  carSelectTextActive: {
    color: colors.accent,
    fontWeight: '700',
  },
});
