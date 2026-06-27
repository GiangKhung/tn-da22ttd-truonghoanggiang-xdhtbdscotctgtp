import { useState, useEffect } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { EmptyState } from '@/components/EmptyState';
import { MaintenanceCard } from '@/components/MaintenanceCard';
import { getHistory, getMyCars } from '@/api/public';
import { useCustomer } from '@/context/AuthContext';
import { colors, spacing, radius } from '@/theme';
import { normalizePlate } from '@/utils/format';

export default function HistoryScreen() {
  const customer = useCustomer();
  const [selectedPlate, setSelectedPlate] = useState(customer?.licensePlate ?? '');

  const phone = customer?.phone ?? null;

  // Load cars list
  const carsQuery = useQuery({
    queryKey: ['my-cars'],
    queryFn: () => getMyCars(),
    enabled: !!customer,
  });

  const cars = carsQuery.data?.cars ?? [];

  // Auto-select first car if no selectedPlate is set
  const firstCarPlate = cars[0]?.licensePlate;
  useEffect(() => {
    if (!selectedPlate && firstCarPlate) {
      setSelectedPlate(firstCarPlate);
    }
  }, [firstCarPlate, selectedPlate]);

  // If plate changes, or initial load
  const licensePlate = selectedPlate || customer?.licensePlate || null;
  const enabled = !!phone && !!licensePlate;

  const query = useQuery({
    queryKey: ['history', licensePlate, phone],
    queryFn: () => getHistory(licensePlate!, phone!),
    enabled,
  });

  // Chưa có biển số trong tài khoản
  if (!enabled) {
    return (
      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>Chưa có biển số xe</Text>
        <Text style={styles.noticeText}>
          Vui lòng cập nhật biển số xe trong tab{' '}
          <Text style={{ fontWeight: '700' }}>Tài khoản</Text> để xem lịch sử sửa chữa.
        </Text>
      </View>
    );
  }

  const records = query.data?.records ?? [];
  const car = query.data?.car;

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.list}
      data={records}
      keyExtractor={(item) => String(item.id)}
      ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      ListHeaderComponent={
        <View style={{ marginBottom: spacing.md, gap: spacing.sm }}>
          <Text style={styles.title}>Lịch sử sửa chữa</Text>
          {cars.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs, paddingBottom: 4 }}>
              {cars.map((c) => {
                const isSelected = normalizePlate(licensePlate!) === normalizePlate(c.licensePlate);
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setSelectedPlate(c.licensePlate)}
                    style={[
                      styles.carSelectChip,
                      isSelected && styles.carSelectChipActive,
                    ]}
                  >
                    <Text style={[styles.carSelectText, isSelected && styles.carSelectTextActive]}>
                      {c.licensePlate} ({c.brand})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
          <Text style={styles.subtitle}>
            {car
              ? `${car.licensePlate} • ${car.brand} ${car.model} ${car.year}`
              : `${licensePlate} • ${phone}`}
          </Text>
        </View>
      }
      ListEmptyComponent={
        query.isLoading ? (
          <EmptyState title="Đang tải…" />
        ) : car ? (
          <EmptyState
            title="Chưa có phiếu bảo dưỡng"
            hint="Khi xe được sửa chữa tại gara, lịch sử sẽ hiển thị ở đây."
          />
        ) : (
          <EmptyState
            title="Không tìm thấy xe khớp"
            hint="Vui lòng kiểm tra lại biển số xe trong Tài khoản."
          />
        )
      }
      renderItem={({ item }) => <MaintenanceCard record={item} />}
      refreshControl={
        <RefreshControl
          refreshing={query.isFetching && !query.isLoading}
          onRefresh={() => query.refetch()}
        />
      }
    />
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
