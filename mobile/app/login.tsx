import { useState } from 'react';
import {
  Alert,
  Image,
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
import { useAuth } from '@/context/AuthContext';
import { colors, radius, spacing } from '@/theme';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);

  // Fields
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullname, setFullname] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const reset = () => {
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setFullname('');
    setLicensePlate('');
  };

  const switchMode = (next: Mode) => {
    reset();
    setMode(next);
  };

  const handleSubmit = async () => {
    const trimPhone = phone.trim();
    const trimPwd = password.trim();

    if (!/^0[0-9]{8,10}$/.test(trimPhone)) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ (VD: 0912345678)');
      return;
    }
    if (trimPwd.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (mode === 'register' && trimPwd !== confirmPassword.trim()) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(trimPhone, trimPwd);
      } else {
        await register(
          trimPhone,
          trimPwd,
          fullname.trim() || undefined,
          licensePlate.trim() || undefined
        );
      }
    } catch (err: any) {
      Alert.alert(mode === 'login' ? 'Đăng nhập thất bại' : 'Đăng ký thất bại', err?.message ?? 'Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Đặt lịch bảo dưỡng nhanh chóng</Text>
        </View>

        {/* Tab switcher */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, mode === 'login' && styles.tabActive]}
            onPress={() => switchMode('login')}
          >
            <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>
              Đăng nhập
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'register' && styles.tabActive]}
            onPress={() => switchMode('register')}
          >
            <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>
              Đăng ký
            </Text>
          </TouchableOpacity>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Phone */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Số điện thoại *</Text>
            <TextInput
              style={styles.input}
              placeholder="0912 345 678"
              placeholderTextColor={colors.textSubtle}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              autoComplete="tel"
            />
          </View>

          {/* Fullname — register only */}
          {mode === 'register' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Họ và tên</Text>
              <TextInput
                style={styles.input}
                placeholder="Nguyễn Văn A"
                placeholderTextColor={colors.textSubtle}
                value={fullname}
                onChangeText={setFullname}
                autoComplete="name"
              />
            </View>
          )}

          {/* License plate — register only */}
          {mode === 'register' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Biển số xe (tùy chọn)</Text>
              <TextInput
                style={styles.input}
                placeholder="30A-12345"
                placeholderTextColor={colors.textSubtle}
                autoCapitalize="characters"
                value={licensePlate}
                onChangeText={setLicensePlate}
              />
            </View>
          )}

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mật khẩu *</Text>
            <View style={styles.pwdWrap}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Ít nhất 6 ký tự"
                placeholderTextColor={colors.textSubtle}
                secureTextEntry={!showPwd}
                value={password}
                onChangeText={setPassword}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <TouchableOpacity onPress={() => setShowPwd((v) => !v)} style={styles.eyeBtn}>
                <Text style={styles.eyeIcon}>{showPwd ? 'Ẩn' : 'Hiện'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm password — register only */}
          {mode === 'register' && (
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Xác nhận mật khẩu *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor={colors.textSubtle}
                secureTextEntry={!showPwd}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                autoComplete="new-password"
              />
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryFg} />
            ) : (
              <Text style={styles.btnText}>
                {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          {mode === 'login'
            ? 'Chưa có tài khoản? → Nhấn "Đăng ký"'
            : 'Đã có tài khoản? → Nhấn "Đăng nhập"'}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.xxl * 1.5,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.pill,
  },
  tabActive: {
    backgroundColor: colors.accent,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  tabTextActive: {
    color: colors.primaryFg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      web: {
        boxShadow: '0px 6px 16px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 6,
      },
    }),
  },
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
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  pwdWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  eyeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  eyeIcon: { fontSize: 12, color: colors.accent, fontWeight: '600', textTransform: 'uppercase' },
  btn: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  btnText: {
    color: colors.primaryFg,
    fontWeight: '700',
    fontSize: 16,
  },
  hint: {
    textAlign: 'center',
    marginTop: spacing.lg,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
  },
});
