import { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View, Modal, TextInput, TouchableOpacity } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppointmentCard } from '@/components/AppointmentCard';
import { EmptyState } from '@/components/EmptyState';
import { cancelAppointment, getMyAppointments } from '@/api/public';
import { useCustomer } from '@/context/AuthContext';
import { colors, spacing } from '@/theme';

export default function MyAppointmentsScreen() {
  const customer = useCustomer();
  const qc = useQueryClient();

  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');

  // Dùng phone từ tài khoản đã đăng nhập
  const phone = customer?.phone ?? null;
  const enabled = !!phone;

  const query = useQuery({
    queryKey: ['my-appointments', phone],
    queryFn: () => getMyAppointments(phone!, ''),
    enabled,
  });

  const data = query.data?.appointments ?? [];
  const cancellingAppt = data.find(x => x.id === cancellingId);

  const cancelMut = useMutation({
    mutationFn: ({ id, cancelReason, apptPlate }: { id: number; cancelReason: string; apptPlate: string }) =>
      cancelAppointment(id, phone!, apptPlate, cancelReason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-appointments', phone] });
    },
    onError: (err: any) => {
      Alert.alert('Hủy lịch thất bại', err?.message ?? 'Đã xảy ra lỗi');
    },
  });

  // Chưa đăng nhập
  if (!enabled) {
    return (
      <View style={styles.notice}>
        <Text style={styles.noticeIcon}>🚗</Text>
        <Text style={styles.noticeTitle}>Yêu cầu đăng nhập</Text>
        <Text style={styles.noticeText}>
          Vui lòng đăng nhập để tra cứu lịch hẹn của bạn.
        </Text>
      </View>
    );
  }


  return (
    <View style={{ flex: 1 }}>
      <FlatList
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={styles.list}
        data={data}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={
          <View style={{ marginBottom: spacing.md }}>
            <Text style={styles.title}>Lịch của tôi</Text>
            <Text style={styles.subtitle}>
              SĐT: {phone} {customer?.licensePlate ? `• Biển số mặc định: ${customer.licensePlate}` : ''}
            </Text>
          </View>
        }
        ListEmptyComponent={
          query.isLoading ? (
            <EmptyState title="Đang tải…" />
          ) : (
            <EmptyState
              title="Chưa có lịch hẹn"
              hint="Đặt lịch ở tab Đặt lịch để bắt đầu."
            />
          )
        }
        renderItem={({ item }) => (
          <AppointmentCard
            appointment={item}
            onCancel={(id) => {
              setCancellingId(id);
              setCancelReasonInput('');
            }}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching && !query.isLoading}
            onRefresh={() => query.refetch()}
          />
        }
      />

      <Modal
        visible={cancellingId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCancellingId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Lý do hủy lịch hẹn</Text>
            <Text style={styles.modalSubtitle}>Vui lòng cung cấp lý do hủy để tiếp tục:</Text>
            <TextInput
              style={styles.modalInput}
              value={cancelReasonInput}
              onChangeText={setCancelReasonInput}
              placeholder="Nhập lý do hủy..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setCancellingId(null)}
              >
                <Text style={styles.modalBtnTextCancel}>Quay lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={() => {
                  const reason = cancelReasonInput.trim();
                  if (!reason) {
                    Alert.alert('Lỗi', 'Bạn phải cung cấp lý do hủy.');
                    return;
                  }
                  const id = cancellingId!;
                  setCancellingId(null);
                  cancelMut.mutate({ id, cancelReason: reason, apptPlate: cancellingAppt?.licensePlate ?? '' });
                }}
              >
                <Text style={styles.modalBtnTextConfirm}>Xác nhận hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: spacing.xxl },
  notice: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.bg,
    gap: spacing.md,
  },
  noticeIcon: { fontSize: 52 },
  noticeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  noticeText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: spacing.xl,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: 8,
  },
  modalBtnCancel: {
    backgroundColor: '#f1f5f9',
  },
  modalBtnConfirm: {
    backgroundColor: colors.danger || '#ef4444',
  },
  modalBtnTextCancel: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  modalBtnTextConfirm: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
