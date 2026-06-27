import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, useCustomer } from '@/context/AuthContext';
import { 
  getMyCars, 
  addMyCar, 
  removeMyCar, 
  getNotifications, 
  markNotificationsAsRead, 
  savePushToken 
} from '@/api/public';
import { colors, radius, spacing } from '@/theme';
import { registerForPushNotificationsAsync } from '@/lib/notifications';

export default function AccountScreen() {
  const { logout, updateProfile } = useAuth();
  const customer = useCustomer();
  const qc = useQueryClient();

  // Load notifications
  const notificationsQuery = useQuery({
    queryKey: ['my-notifications', customer?.phone],
    queryFn: () => getNotifications(customer!.phone),
    enabled: !!customer?.phone,
    refetchInterval: 10000,
  });

  const notifications = notificationsQuery.data?.notifications ?? [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const readNotifMut = useMutation({
    mutationFn: () => markNotificationsAsRead(customer!.phone),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-notifications', customer?.phone] });
    }
  });

  const handleMarkAsRead = () => {
    if (unreadCount > 0) {
      readNotifMut.mutate();
    }
  };

  // Register push notifications and upload token
  useEffect(() => {
    if (!customer?.phone) return;

    async function setupNotifications() {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          await savePushToken(customer!.phone, token);
        }
      } catch (err) {
        console.warn('Lỗi đăng ký nhận thông báo đẩy:', err);
      }
    }

    setupNotifications();
  }, [customer?.phone]);

  // Load cars list
  const carsQuery = useQuery({
    queryKey: ['my-cars'],
    queryFn: () => getMyCars(),
    enabled: !!customer,
  });

  const cars = carsQuery.data?.cars ?? [];

  // Add car form state
  const [carAdding, setCarAdding] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState(String(new Date().getFullYear()));
  const [newMileage, setNewMileage] = useState('0');
  const [newVin, setNewVin] = useState('');
  const [newEngine, setNewEngine] = useState('');
  const [newColor, setNewColor] = useState('');

  const addCarMut = useMutation({
    mutationFn: addMyCar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-cars'] });
      qc.invalidateQueries({ queryKey: ['my-appointments'] });
      qc.invalidateQueries({ queryKey: ['history'] });
      setCarAdding(false);
      setNewPlate('');
      setNewBrand('');
      setNewModel('');
      setNewYear(String(new Date().getFullYear()));
      setNewMileage('0');
      setNewVin('');
      setNewEngine('');
      setNewColor('');
      Alert.alert('✅ Thành công', 'Đã thêm xe mới thành công!');
    },
    onError: (err: any) => {
      Alert.alert('Thất bại', err?.message ?? 'Đã xảy ra lỗi khi thêm xe.');
    }
  });

  const removeCarMut = useMutation({
    mutationFn: removeMyCar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-cars'] });
      qc.invalidateQueries({ queryKey: ['my-appointments'] });
      qc.invalidateQueries({ queryKey: ['history'] });
      Alert.alert('✅ Thành công', 'Đã gỡ xe thành công!');
    },
    onError: (err: any) => {
      Alert.alert('Thất bại', err?.message ?? 'Đã xảy ra lỗi khi gỡ xe.');
    }
  });

  const handleAddCarSubmit = () => {
    if (!newPlate.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập biển số xe.');
    if (!newBrand.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập hãng xe.');
    if (!newModel.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập dòng xe.');

    addCarMut.mutate({
      licensePlate: newPlate.trim(),
      brand: newBrand.trim(),
      model: newModel.trim(),
      year: parseInt(newYear) || new Date().getFullYear(),
      mileage: parseFloat(newMileage) || 0,
      vin: newVin.trim() || undefined,
      engineNumber: newEngine.trim() || undefined,
      color: newColor.trim() || undefined,
    });
  };

  const handleRemoveCarPress = (id: number, plate: string) => {
    Alert.alert('Gỡ xe', `Bạn có chắc muốn gỡ xe biển số ${plate} khỏi tài khoản?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xác nhận gỡ', style: 'destructive', onPress: () => removeCarMut.mutate(id) }
    ]);
  };

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullname, setFullname] = useState(customer?.fullname ?? '');
  const [licensePlate, setLicensePlate] = useState(customer?.licensePlate ?? '');

  const handleEdit = () => {
    setFullname(customer?.fullname ?? '');
    setLicensePlate(customer?.licensePlate ?? '');
    setEditing(true);
  };

  const handleCancel = () => setEditing(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        fullname: fullname.trim() || undefined,
        licensePlate: licensePlate.trim() || undefined,
      });
      setEditing(false);
      Alert.alert('✅ Cập nhật thành công', 'Thông tin tài khoản đã được lưu.');
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message ?? 'Không thể cập nhật. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất không?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const initials = customer?.fullname
    ? customer.fullname.trim().split(/\s+/).slice(-1)[0][0].toUpperCase()
    : customer?.phone?.slice(-2) ?? '?';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Avatar / Header */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{customer?.fullname || 'Khách hàng'}</Text>
          <Text style={styles.phone}>{customer?.phone}</Text>
        </View>

        {/* Thông tin tài khoản */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Thông tin cá nhân</Text>
            {!editing && (
              <TouchableOpacity onPress={handleEdit} style={styles.editBtn}>
                <Text style={styles.editBtnText}>Chỉnh sửa</Text>
              </TouchableOpacity>
            )}
          </View>

          {editing ? (
            // ── Edit mode ──────────────────────────────────────────────────
            <View style={{ gap: spacing.md }}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Họ và tên</Text>
                <TextInput
                  style={styles.input}
                  value={fullname}
                  onChangeText={setFullname}
                  placeholder="Nguyễn Văn A"
                  placeholderTextColor={colors.textSubtle}
                  autoComplete="name"
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Biển số xe</Text>
                <TextInput
                  style={styles.input}
                  value={licensePlate}
                  onChangeText={setLicensePlate}
                  placeholder="30A12345"
                  placeholderTextColor={colors.textSubtle}
                  autoCapitalize="characters"
                />
                <Text style={styles.hint}>
                  Biển số sẽ được dùng để tra cứu lịch hẹn và lịch sử bảo dưỡng.
                </Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.btnOutline, { flex: 1 }]}
                  onPress={handleCancel}
                  disabled={saving}
                >
                  <Text style={styles.btnOutlineText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnPrimary, { flex: 1 }, saving && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator color={colors.primaryFg} size="small" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Lưu</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // ── View mode ──────────────────────────────────────────────────
            <View style={{ gap: spacing.xs }}>
              <InfoRow label="Họ tên" value={customer?.fullname ?? '—'} />
              <Divider />
              <InfoRow label="Số điện thoại" value={customer?.phone ?? '—'} />
              <Divider />
              <InfoRow
                label="Biển số xe"
                value={customer?.licensePlate ?? '—'}
                valueColor={!customer?.licensePlate ? colors.warning : undefined}
              />
            </View>
          )}
        </View>

        {/* Hộp thư thông báo */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Hộp thư thông báo</Text>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={handleMarkAsRead} style={styles.editBtn}>
                <Text style={styles.editBtnText}>Đã đọc tất cả</Text>
              </TouchableOpacity>
            )}
          </View>

          {notificationsQuery.isLoading ? (
            <ActivityIndicator color={colors.accent} size="small" style={{ marginVertical: spacing.md }} />
          ) : notifications.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: spacing.md }}>
              Không có thông báo nào.
            </Text>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {notifications.map((n: any) => (
                <View 
                  key={n.id} 
                  style={[
                    styles.notifItem,
                    !n.isRead && styles.notifItemUnread
                  ]}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={[styles.notifTitle, !n.isRead && styles.notifTitleUnread]}>
                        {n.title}
                      </Text>
                      {!n.isRead && (
                        <View style={styles.unreadDot} />
                      )}
                    </View>
                    <Text style={styles.notifContent}>{n.content}</Text>
                    <Text style={styles.notifTime}>
                      {new Date(n.createdAt).toLocaleString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Danh sách xe của bạn */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Danh sách xe của bạn</Text>
            {!carAdding && (
              <TouchableOpacity onPress={() => setCarAdding(true)} style={styles.editBtn}>
                <Text style={styles.editBtnText}>Thêm xe</Text>
              </TouchableOpacity>
            )}
          </View>

          {carAdding ? (
            // ── Form thêm xe mới ──────────────────────────────────────────
            <View style={{ gap: spacing.md }}>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Biển số xe *</Text>
                <TextInput
                  style={styles.input}
                  value={newPlate}
                  onChangeText={setNewPlate}
                  placeholder="VD: 30A12345"
                  placeholderTextColor={colors.textSubtle}
                  autoCapitalize="characters"
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Hãng xe *</Text>
                <TextInput
                  style={styles.input}
                  value={newBrand}
                  onChangeText={setNewBrand}
                  placeholder="VD: Mazda"
                  placeholderTextColor={colors.textSubtle}
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Dòng xe *</Text>
                <TextInput
                  style={styles.input}
                  value={newModel}
                  onChangeText={setNewModel}
                  placeholder="VD: Mazda 3"
                  placeholderTextColor={colors.textSubtle}
                />
              </View>
              <View style={styles.rowFields}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Năm sản xuất</Text>
                  <TextInput
                    style={styles.input}
                    value={newYear}
                    onChangeText={setNewYear}
                    placeholder="2020"
                    placeholderTextColor={colors.textSubtle}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Số km (Mileage)</Text>
                  <TextInput
                    style={styles.input}
                    value={newMileage}
                    onChangeText={setNewMileage}
                    placeholder="15000"
                    placeholderTextColor={colors.textSubtle}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.rowFields}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Màu xe</Text>
                  <TextInput
                    style={styles.input}
                    value={newColor}
                    onChangeText={setNewColor}
                    placeholder="Trắng"
                    placeholderTextColor={colors.textSubtle}
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Số khung (VIN)</Text>
                  <TextInput
                    style={styles.input}
                    value={newVin}
                    onChangeText={setNewVin}
                    placeholder="Tùy chọn"
                    placeholderTextColor={colors.textSubtle}
                  />
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.btnOutline, { flex: 1 }]}
                  onPress={() => setCarAdding(false)}
                  disabled={addCarMut.isPending}
                >
                  <Text style={styles.btnOutlineText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnPrimary, { flex: 1 }, addCarMut.isPending && { opacity: 0.7 }]}
                  onPress={handleAddCarSubmit}
                  disabled={addCarMut.isPending}
                  activeOpacity={0.8}
                >
                  {addCarMut.isPending ? (
                    <ActivityIndicator color={colors.primaryFg} size="small" />
                  ) : (
                    <Text style={styles.btnPrimaryText}>Thêm</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // ── Danh sách xe ───────────────────────────────────────────
            <View style={{ gap: spacing.sm }}>
              {carsQuery.isLoading ? (
                <ActivityIndicator color={colors.accent} size="small" style={{ marginVertical: spacing.md }} />
              ) : cars.length === 0 ? (
                <Text style={{ color: colors.textMuted, fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: spacing.md }}>
                  Chưa có xe nào được đăng ký.
                </Text>
              ) : (
                cars.map((car) => (
                  <View key={car.id} style={styles.carItem}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                        <View style={styles.plateContainer}>
                          <Text style={styles.plateText}>{car.licensePlate}</Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.text }}>
                          {car.brand} {car.model}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>
                        Năm: {car.year} • Số km: {car.mileage?.toLocaleString('vi-VN')} km
                        {car.color ? ` • Màu: ${car.color}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemoveCarPress(car.id, car.licensePlate)}
                      style={styles.removeBtn}
                    >
                      <Text style={styles.removeBtnText}>Gỡ</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

        {/* Thông tin ứng dụng */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLine}>🔧 Gara Trường Phát</Text>
          <Text style={styles.infoLine}>📞 Hỗ trợ: 1900 xxxx</Text>
        </View>

        {/* Đăng xuất */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InfoRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
    ...Platform.select({
      web: {
        boxShadow: '0px 6px 12px rgba(37, 99, 235, 0.4)',
      },
      default: {
        shadowColor: colors.accent,
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 6,
      },
    }),
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  phone: { fontSize: 14, color: colors.textMuted },

  // Card
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editBtn: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(197, 168, 128, 0.08)',
    borderRadius: radius.pill,
  },
  editBtnText: { fontSize: 12, fontWeight: '600', color: colors.accent },

  // Form
  fieldGroup: { gap: spacing.xs },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  hint: {
    fontSize: 11,
    color: colors.textSubtle,
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  btnOutlineText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  btnPrimary: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
  },
  btnPrimaryText: { fontSize: 14, fontWeight: '700', color: colors.primaryFg },

  // Info row
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
  },
  infoLabel: { fontSize: 14, color: colors.textMuted },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.text, maxWidth: '60%', textAlign: 'right' },

  // Info card
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoLine: { fontSize: 13, color: colors.textMuted },

  // Logout
  logoutBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  logoutText: { color: colors.danger, fontWeight: '700', fontSize: 15 },
  rowFields: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  carItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  plateContainer: {
    backgroundColor: 'rgba(197, 168, 128, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(197, 168, 128, 0.25)',
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  plateText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.accent,
  },
  removeBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  removeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.danger,
  },
  notifItem: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notifItemUnread: {
    backgroundColor: 'rgba(197, 168, 128, 0.05)',
    borderColor: 'rgba(197, 168, 128, 0.2)',
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  notifTitleUnread: {
    fontWeight: '800',
  },
  notifContent: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  notifTime: {
    fontSize: 11,
    color: colors.textSubtle,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
});
