import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../../navigation/AppTabs';
import colors from '../../lib/colors';

import { useTransactionsStore } from '../../store/useTransactionsStore';
import { expandRecurringTransactionsForRange } from '../../services/transactions';
import { listCategories } from '../../services/categories';
import { Category } from '../../lib/types';
import { generateInsights, InsightsResult } from '../../services/insightsEngine';

import {
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  parseISO,
  format,
} from 'date-fns';

import Svg, { Polyline, Circle, Line } from 'react-native-svg';

type Props = BottomTabScreenProps<AppTabParamList, 'Insights'>;

type InsightsTab = 'trends' | 'ai';

const InsightsScreen: React.FC<Props> = () => {
  const [activeTab, setActiveTab] = useState<InsightsTab>('trends');

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Insights</Text>
          <Text style={styles.headerSubtitle}>
            Spending trends & AI analysis
          </Text>
        </View>

        {/* Segmented control */}
        <View style={styles.segmentContainer}>
          <SegmentButton
            label="Spending Trends"
            active={activeTab === 'trends'}
            onPress={() => setActiveTab('trends')}
          />
          <SegmentButton
            label="AI Insights"
            active={activeTab === 'ai'}
            onPress={() => setActiveTab('ai')}
          />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'trends' ? <TrendsView /> : <AIInsightsView />}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

type SegmentButtonProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

const SegmentButton: React.FC<SegmentButtonProps> = ({
  label,
  active,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.segmentButton, active && styles.segmentButtonActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        style={[styles.segmentLabel, active && styles.segmentLabelActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

/* -------------------------------------------------------------------------- */
/*                            Mini Line Chart (6 mo)                          */
/* -------------------------------------------------------------------------- */

type MiniLineChartProps = {
  values: number[];
  labels: string[];
};

const MiniLineChart: React.FC<MiniLineChartProps> = ({ values, labels }) => {
  const [width, setWidth] = useState(0);
  const height = 160;

  if (values.length === 0) {
    return (
      <View style={styles.chartPlaceholder}>
        <Text style={styles.chartPlaceholderText}>Not enough data yet</Text>
      </View>
    );
  }

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max === min ? max || 1 : max - min;
  const padding = 20;

  const points = values.map((v, idx) => {
    const x =
      padding +
      (idx / Math.max(values.length - 1, 1)) * Math.max(width - padding * 2, 1);
    const normalized = max === min ? 0.5 : (v - min) / range;
    const y = padding + (1 - normalized) * (height - padding * 2);
    return { x, y };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View
      style={styles.chartContainer}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <>
          <Svg width={width} height={height}>
            {/* Grid lines */}
            <Line
              x1={padding}
              y1={padding}
              x2={padding}
              y2={height - padding}
              stroke="#E5E7EB"
              strokeWidth={1}
            />
            <Line
              x1={padding}
              y1={height - padding}
              x2={width - padding}
              y2={height - padding}
              stroke="#E5E7EB"
              strokeWidth={1}
            />
            {/* Mid grid */}
            <Line
              x1={padding}
              y1={(height - padding) / 2}
              x2={width - padding}
              y2={(height - padding) / 2}
              stroke="#F3F4F6"
              strokeWidth={1}
            />

            {/* Line */}
            <Polyline
              points={polylinePoints}
              fill="none"
              stroke={colors.primary}
              strokeWidth={2.5}
            />

            {/* Dots */}
            {points.map((p, idx) => (
              <Circle
                key={idx}
                cx={p.x}
                cy={p.y}
                r={4}
                stroke={colors.primary}
                strokeWidth={2}
                fill={colors.background}
              />
            ))}
          </Svg>

          {/* Month labels */}
          <View style={styles.chartLabelsRow}>
            {labels.map((label, idx) => (
              <Text key={label + idx} style={styles.chartLabel}>
                {label}
              </Text>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/*                           Spending Trends tab                               */
/* -------------------------------------------------------------------------- */

const TrendsView: React.FC = () => {
  const transactions = useTransactionsStore((s) => s.transactions);
  const [categories, setCategories] = useState<Category[]>([]);

  // Load categories once
  useEffect(() => {
    (async () => {
      try {
        const cats = await listCategories();
        setCategories(cats);
      } catch (e) {
        console.warn('[Insights] Failed to load categories', e);
      }
    })();
  }, []);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const now = new Date();

  // ----- 6-month trend -----
  const sixMonthData = useMemo(() => {
    const start = startOfMonth(subMonths(now, 5)); // include current month
    const end = endOfMonth(now);

    const expanded = expandRecurringTransactionsForRange(
      transactions,
      start,
      end
    ).filter((tx) => tx.type === 'expense');

    const months: { label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = startOfMonth(subMonths(now, i));
      const mEnd = endOfMonth(subMonths(now, i));
      const label = format(mStart, 'MMM');

      const total = expanded
        .filter((tx) => {
          const d = parseISO(tx.date);
          return d >= mStart && d <= mEnd;
        })
        .reduce((sum, tx) => sum + tx.amount, 0);

      months.push({ label, total });
    }

    const totals = months.map((m) => m.total);
    const nonZeroTotals = totals.filter((v) => v > 0);
    const avg =
      nonZeroTotals.length > 0
        ? nonZeroTotals.reduce((s, v) => s + v, 0) / nonZeroTotals.length
        : 0;

    const highest = Math.max(...totals, 0);
    const lowest = Math.min(...nonZeroTotals, highest || 0);

    let statusLabel = 'Stable';
    let statusColor = '#16A34A'; // green
    if (totals.length >= 2) {
      const latest = totals[totals.length - 1];
      const prev = totals[totals.length - 2] || 0;
      if (prev > 0) {
        const change = (latest - prev) / prev;
        if (change > 0.1) {
          statusLabel = 'Rising';
          statusColor = '#EF4444';
        } else if (change < -0.1) {
          statusLabel = 'Decreasing';
          statusColor = '#22C55E';
        }
      }
    }

    return {
      months,
      totals,
      avg,
      highest,
      lowest,
      statusLabel,
      statusColor,
    };
  }, [transactions, now]);

  // ----- Top categories (last 30 days) -----
  const topCategories = useMemo(() => {
    const start = subDays(now, 29);
    const end = now;

    const expanded = expandRecurringTransactionsForRange(
      transactions,
      start,
      end
    ).filter((tx) => tx.type === 'expense');

    const byCat: Record<string, number> = {};

    expanded.forEach((tx) => {
      const key = tx.categoryId ?? 'uncategorized';
      byCat[key] = (byCat[key] ?? 0) + tx.amount;
    });

    const items = Object.keys(byCat).map((id) => {
      const cat = id === 'uncategorized' ? null : categoryMap.get(id) ?? null;
      return {
        id,
        name: cat?.name ?? 'Uncategorized',
        color: cat?.colorHex ?? '#E5E7EB',
        total: byCat[id],
      };
    });

    items.sort((a, b) => b.total - a.total);

    return items.slice(0, 4);
  }, [transactions, now, categoryMap]);

  const hasTrendData = sixMonthData.totals.some((v) => v > 0);

  return (
    <View>
      {/* Monthly trend card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>Monthly Spending Trend</Text>
            <Text style={styles.cardSubtitle}>Last 6 months overview</Text>
          </View>
          <View
            style={[
              styles.pill,
              { backgroundColor: '#DCFCE7' },
            ]}
          >
            <Text
              style={[
                styles.pillText,
                { color: sixMonthData.statusColor },
              ]}
            >
              {sixMonthData.statusLabel}
            </Text>
          </View>
        </View>

        {hasTrendData ? (
          <MiniLineChart
            values={sixMonthData.totals}
            labels={sixMonthData.months.map((m) => m.label)}
          />
        ) : (
          <View style={styles.chartPlaceholder}>
            <Text style={styles.chartPlaceholderText}>
              Add a few expenses to see your trend.
            </Text>
          </View>
        )}

        {/* Summary row */}
        <View style={styles.cardSummaryRow}>
          <View style={styles.cardSummaryItem}>
            <Text style={styles.summaryLabel}>Avg monthly spend</Text>
            <Text style={styles.summaryValue}>
              ₹{Math.round(sixMonthData.avg).toLocaleString()}
            </Text>
          </View>
          <View style={styles.cardSummaryItem}>
            <Text style={styles.summaryLabel}>Highest month</Text>
            <Text style={styles.summaryValue}>
              ₹{Math.round(sixMonthData.highest).toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Top categories card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>Top Categories</Text>
            <Text style={styles.cardSubtitle}>Based on last 30 days</Text>
          </View>
        </View>

        {topCategories.length === 0 ? (
          <Text style={styles.bodyText}>
            No expenses in the last 30 days yet.
          </Text>
        ) : (
          topCategories.map((cat) => (
            <TrendCategoryRow
              key={cat.id}
              color={cat.color}
              label={cat.name}
              amount={`₹${cat.total.toLocaleString()}`}
              // Trend percentage is not computed yet; show placeholder "—"
              change="—"
            />
          ))
        )}
      </View>

      {/* Daily pattern card (still placeholder for now) */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>Spending Pattern</Text>
            <Text style={styles.cardSubtitle}>Days & time of week</Text>
          </View>
        </View>

        <View style={styles.chartPlaceholderSmall}>
          <Text style={styles.chartPlaceholderText}>Heatmap / Bar Chart</Text>
        </View>

        <Text style={styles.bodyText}>
          Once you have more data, we&apos;ll show which days and times you
          usually spend the most.
        </Text>
      </View>
    </View>
  );
};

type TrendCategoryRowProps = {
  color: string;
  label: string;
  amount: string;
  change: string;
};

const TrendCategoryRow: React.FC<TrendCategoryRowProps> = ({
  color,
  label,
  amount,
  change,
}) => {
  const isNegative = change.startsWith('-');

  return (
    <View style={styles.trendRow}>
      <View style={styles.trendLeft}>
        <View style={[styles.trendDot, { backgroundColor: color }]} />
        <Text style={styles.trendLabel}>{label}</Text>
      </View>
      <View style={styles.trendRight}>
        <Text style={styles.trendAmount}>{amount}</Text>
        {change !== '—' && (
          <Text
            style={[
              styles.trendChange,
              { color: isNegative ? '#16A34A' : '#EF4444' },
            ]}
          >
            {change}
          </Text>
        )}
      </View>
    </View>
  );
};

/* -------------------------------------------------------------------------- */
/*                               AI Insights tab                              */
/* -------------------------------------------------------------------------- */

const AIInsightsView: React.FC = () => {
  const [insights, setInsights] = useState<InsightsResult | null>(null);
  const [loading, setLoading] = useState(true);

  const transactions = useTransactionsStore((s) => s.transactions);

  const hasRecentTransactions = React.useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
  
    return transactions.some(tx => {
      const date = new Date(tx.date);
      return date >= thirtyDaysAgo;
    });
  }, [transactions]);
  
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await generateInsights();
        if (mounted) setInsights(result);
      } catch (e) {
        console.warn('[AIInsights] Failed to load insights', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!hasRecentTransactions) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>AI Insights</Text>
        <Text style={styles.bodyText}>
          No AI insights yet. Add some transactions and check back after a few days.
        </Text>
      </View>
    );
  }
  
  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!insights) return null;

  const change = insights.overview.percentageChange;
  const changeLabel = change >= 0 ? 'up' : 'down';
  const changeAbs = Math.abs(change).toFixed(1);

  const topDrivers =
    insights.overview.topCategories.length > 0
      ? insights.overview.topCategories.map((c) => c.name).join(' and ')
      : 'your usual categories';

  const hasOverrun = insights.predictions.categoryOverruns.length > 0;
  const firstOverrun = insights.predictions.categoryOverruns[0];

  return (
    <View>
      {/* AI Overview card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.aiIconCircle}>
            <Text style={styles.aiIcon}>🤖</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>AI-powered analysis</Text>
            <Text style={styles.cardSubtitle}>
              All insights generated locally on your device
            </Text>
          </View>
          <View style={styles.pillSoft}>
            <Text style={styles.pillSoftText}>Private</Text>
          </View>
        </View>

        <Text style={styles.bodyText}>
          Bachat AI analyses your transaction history to find patterns, unusual
          spikes, and opportunities to save more — without sending any data to
          external servers.
        </Text>
      </View>

      {/* This month at a glance */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>This month at a glance</Text>
        <Text style={styles.cardSubtitle}>Based on your local data</Text>

        <View style={styles.aiInsightRow}>
          <View style={styles.aiBulletIconCircle}>
            <Text style={styles.aiBulletIcon}>📈</Text>
          </View>
          <View style={styles.aiInsightTextContainer}>
            <Text style={styles.aiInsightTitle}>
              Spending {changeLabel} by {changeAbs}%
            </Text>
            <Text style={styles.aiInsightBody}>
              You&apos;re spending slightly more than last month, mainly driven
              by <Text style={styles.highlightText}>{topDrivers}</Text>.
            </Text>
          </View>
        </View>

        <View style={styles.aiInsightRow}>
          <View style={styles.aiBulletIconCircle}>
            <Text style={styles.aiBulletIcon}>💰</Text>
          </View>
          <View style={styles.aiInsightTextContainer}>
            <Text style={styles.aiInsightTitle}>Potential savings</Text>
            <Text style={styles.aiInsightBody}>
              {hasOverrun ? (
                <>
                  If you reduce{' '}
                  <Text style={styles.highlightText}>
                    {firstOverrun.categoryName}
                  </Text>{' '}
                  spending by about{' '}
                  <Text style={styles.highlightText}>
                    ₹{Math.round(firstOverrun.excessAmount).toLocaleString()}
                  </Text>
                  , you can stay within your budget this month.
                </>
              ) : (
                <>
                  You&apos;re currently on track. Keeping 1–2 low-spend days each
                  week could help you save even more.
                </>
              )}
            </Text>
          </View>
        </View>

        <View style={styles.aiInsightRow}>
          <View style={styles.aiBulletIconCircle}>
            <Text style={styles.aiBulletIcon}>🔁</Text>
          </View>
          <View style={styles.aiInsightTextContainer}>
            <Text style={styles.aiInsightTitle}>Recurring expenses</Text>
            <Text style={styles.aiInsightBody}>
              You have{' '}
              <Text style={styles.highlightText}>
                {insights.diagnostics.recurringSubscriptions.length} active
              </Text>{' '}
              subscriptions. Review them once a month to avoid silent drifts in
              spending.
            </Text>
          </View>
        </View>
      </View>

      {/* Recommendations card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>Smart recommendations</Text>
        </View>

        {insights.recommendations.length === 0 ? (
          <>
            <View style={styles.recoRow}>
              <Text style={styles.recoBullet}>•</Text>
              <Text style={styles.recoText}>
                Set a{' '}
                <Text style={styles.highlightText}>weekly micro-budget</Text> for
                your top 1–2 categories instead of relying only on a monthly cap.
              </Text>
            </View>
            <View style={styles.recoRow}>
              <Text style={styles.recoBullet}>•</Text>
              <Text style={styles.recoText}>
                Turn on <Text style={styles.highlightText}>alerts</Text> when
                you&apos;re about to cross 80% of any category budget.
              </Text>
            </View>
            <View style={styles.recoRow}>
              <Text style={styles.recoBullet}>•</Text>
              <Text style={styles.recoText}>
                Reserve the last{' '}
                <Text style={styles.highlightText}>3 days</Text> of each month as
                a low-spend zone.
              </Text>
            </View>
          </>
        ) : (
          insights.recommendations.map((rec, idx) => (
            <View key={idx} style={styles.recoRow}>
              <Text style={styles.recoBullet}>•</Text>
              <Text style={styles.recoText}>{rec}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    marginHorizontal: 24,
    borderRadius: 999,
    padding: 3,
    marginBottom: 8,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  segmentLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  segmentLabelActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginLeft: 'auto',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chartContainer: {
    height: 180,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'stretch',
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  chartPlaceholder: {
    height: 180,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  chartPlaceholderSmall: {
    height: 120,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  chartPlaceholderText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  chartLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  cardSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cardSummaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  summaryValue: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  bodyText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  highlightText: {
    color: colors.primary,
    fontWeight: '600',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  trendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  trendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  trendLabel: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  trendRight: {
    alignItems: 'flex-end',
  },
  trendAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  trendChange: {
    fontSize: 12,
    marginTop: 2,
  },
  aiIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aiIcon: {
    fontSize: 20,
  },
  pillSoft: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#E0F2FE',
    marginLeft: 'auto',
  },
  pillSoftText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  aiInsightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  aiBulletIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  aiBulletIcon: {
    fontSize: 16,
  },
  aiInsightTextContainer: {
    flex: 1,
  },
  aiInsightTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  aiInsightBody: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  recoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  recoBullet: {
    fontSize: 18,
    lineHeight: 18,
    marginRight: 6,
    color: colors.textSecondary,
  },
  recoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
});

export default InsightsScreen;