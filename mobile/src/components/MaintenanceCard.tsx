import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { formatDate, formatVND } from '@/utils/format';
import { StatusBadge } from './StatusBadge';
import type { MaintenanceRecordBrief } from '@/api/public';

type Props = { record: MaintenanceRecordBrief };

export function MaintenanceCard({ record }: Props) {
  const [open, setOpen] = useState(false);
  const tasksDone = record.maintenanceTasks.filter((t) => t.isCompleted).length;
  const tasksTotal = record.maintenanceTasks.length;

  const isActiveRepair = record.status !== 'DELIVERED' && record.status !== 'CANCELLED';

  const renderMobileStepper = () => {
    const steps = [
      { key: 'PENDING', label: 'Tiếp nhận' },
      { key: 'QUOTING', label: 'Báo giá' },
      { key: 'IN_PROGRESS', label: 'Sửa chữa' },
      { key: 'COMPLETED', label: 'Bàn giao' },
    ];

    const currentStatus = record.status;
    let currentStepIndex = 0;
    if (currentStatus === 'QUOTING') currentStepIndex = 1;
    else if (currentStatus === 'IN_PROGRESS') currentStepIndex = 2;
    else if (currentStatus === 'COMPLETED') currentStepIndex = 3;

    return (
      <View style={styles.stepperContainer}>
        {/* Header with live dot */}
        <View style={styles.stepperHeader}>
          <View style={styles.liveIndicatorRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Theo dõi trực tuyến (Live)</Text>
          </View>
        </View>

        {/* Steps List */}
        <View style={styles.stepsWrapper}>
          {steps.map((step, idx) => {
            const isCompleted = idx < currentStepIndex;
            const isActive = idx === currentStepIndex;
            const isLast = idx === steps.length - 1;

            return (
              <View key={step.key} style={styles.stepItem}>
                {/* Left Line & Node */}
                <View style={styles.stepLeftColumn}>
                  <View style={[
                    styles.stepNode,
                    isCompleted && styles.stepNodeCompleted,
                    isActive && styles.stepNodeActive,
                  ]}>
                    {isCompleted ? (
                      <Text style={styles.stepNodeCheckText}>✓</Text>
                    ) : (
                      <Text style={[styles.stepNodeText, isActive && styles.stepNodeTextActive]}>{idx + 1}</Text>
                    )}
                  </View>
                  {!isLast && (
                    <View style={[
                      styles.stepConnectorLine,
                      isCompleted && styles.stepConnectorLineCompleted,
                    ]} />
                  )}
                </View>

                {/* Right Text Details */}
                <View style={styles.stepContentColumn}>
                  <Text style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                    isCompleted && styles.stepLabelCompleted,
                  ]}>
                    {step.label}
                  </Text>
                  
                  {isActive && currentStatus === 'IN_PROGRESS' && (
                    <View style={styles.activeStepDetail}>
                      <Text style={styles.activeStepDesc}>Đang thực hiện sửa chữa xe tại xưởng...</Text>
                      {tasksTotal > 0 && (
                        <View style={styles.progressBarWrapper}>
                          <Text style={styles.progressText}>Tiến độ: {tasksDone}/{tasksTotal} công việc</Text>
                          <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${(tasksDone/tasksTotal)*100}%` }]} />
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                  {isActive && currentStatus === 'QUOTING' && (
                    <View style={styles.activeStepDetail}>
                      <Text style={styles.activeStepDesc}>Gara đang kiểm tra linh kiện và lập báo giá chi tiết.</Text>
                    </View>
                  )}

                  {isActive && currentStatus === 'PENDING' && (
                    <View style={styles.activeStepDetail}>
                      <Text style={styles.activeStepDesc}>Đã tiếp nhận xe. Đang chờ phân bổ thợ phụ trách.</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Pressable style={styles.card} onPress={() => setOpen((v) => !v)}>
      <View style={styles.headerRow}>
        <Text style={styles.date}>{formatDate(record.date)}</Text>
        <StatusBadge status={record.status} />
      </View>

      {!!record.description && (
        <Text style={styles.description}>{record.description}</Text>
      )}

      {isActiveRepair && renderMobileStepper()}

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          {tasksTotal > 0 ? `${tasksDone}/${tasksTotal} hạng mục` : 'Không có hạng mục'}
        </Text>
        <Text style={styles.cost}>{formatVND(record.cost ?? 0)}</Text>
      </View>

      {open && (
        <View style={styles.details}>
          {record.maintenanceTasks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hạng mục</Text>
              {record.maintenanceTasks.map((t, i) => (
                <Text key={i} style={styles.detailLine}>
                  {t.isCompleted ? '✓' : '○'}  {t.taskName}
                </Text>
              ))}
            </View>
          )}
          {record.maintenanceParts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Phụ tùng đã thay</Text>
              {record.maintenanceParts.map((p, i) => (
                <Text key={i} style={styles.detailLine}>
                  • {p.part.name} × {p.quanty}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      <Text style={styles.expandHint}>{open ? 'Thu gọn ▲' : 'Xem chi tiết ▼'}</Text>
    </Pressable>
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
  date: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  description: {
    fontSize: 14,
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  cost: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.accent,
  },
  details: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  section: { gap: 2 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailLine: {
    fontSize: 13,
    color: colors.text,
  },
  expandHint: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textSubtle,
    textAlign: 'right',
  },
  stepperContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    marginVertical: spacing.xs,
  },
  stepperHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepsWrapper: {
    gap: 0,
  },
  stepItem: {
    flexDirection: 'row',
    minHeight: 55,
  },
  stepLeftColumn: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  stepNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNodeActive: {
    borderColor: colors.accent,
  },
  stepNodeCompleted: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  stepNodeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
  },
  stepNodeTextActive: {
    color: colors.accent,
  },
  stepNodeCheckText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  stepConnectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  stepConnectorLineCompleted: {
    backgroundColor: colors.accent,
  },
  stepContentColumn: {
    flex: 1,
    paddingTop: 2,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
  stepLabelActive: {
    color: colors.text,
    fontWeight: '700',
  },
  stepLabelCompleted: {
    color: colors.accent,
  },
  activeStepDetail: {
    marginTop: spacing.xs,
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  activeStepDesc: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15,
  },
  progressBarWrapper: {
    marginTop: spacing.xs,
    gap: 4,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
});
