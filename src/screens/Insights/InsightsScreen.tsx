import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../../navigation/AppTabs';
import colors from '../../lib/colors';

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

/** Spending Trends tab */
const TrendsView: React.FC = () => {
  return (
    <View>
      {/* Monthly trend card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>Monthly Spending Trend</Text>
            <Text style={styles.cardSubtitle}>Last 6 months overview</Text>
          </View>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Stable</Text>
          </View>
        </View>

        {/* Line chart placeholder */}
        <View style={styles.chartPlaceholder}>
          <Text style={styles.chartPlaceholderText}>Line Chart</Text>
        </View>

        {/* Summary row */}
        <View style={styles.cardSummaryRow}>
          <View style={styles.cardSummaryItem}>
            <Text style={styles.summaryLabel}>Avg monthly spend</Text>
            <Text style={styles.summaryValue}>₹12,400</Text>
          </View>
          <View style={styles.cardSummaryItem}>
            <Text style={styles.summaryLabel}>Highest month</Text>
            <Text style={styles.summaryValue}>₹15,800</Text>
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

        <TrendCategoryRow
          color="#F97316"
          label="Food & Dining"
          amount="₹4,500"
          change="+12%"
        />
        <TrendCategoryRow
          color="#6366F1"
          label="Transport"
          amount="₹2,100"
          change="-4%"
        />
        <TrendCategoryRow
          color="#EC4899"
          label="Shopping"
          amount="₹3,200"
          change="+8%"
        />
        <TrendCategoryRow
          color="#22C55E"
          label="Bills & Utilities"
          amount="₹1,800"
          change="+2%"
        />
      </View>

      {/* Daily pattern card */}
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
          Most of your spending happens on{' '}
          <Text style={styles.highlightText}>weekends</Text>, especially{' '}
          <Text style={styles.highlightText}>Friday evenings</Text>.
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
        <Text
          style={[
            styles.trendChange,
            { color: isNegative ? '#16A34A' : '#EF4444' },
          ]}
        >
          {change}
        </Text>
      </View>
    </View>
  );
};

/** AI Insights tab */
const AIInsightsView: React.FC = () => {
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
            <Text style={styles.aiInsightTitle}>Spending up by 8%</Text>
            <Text style={styles.aiInsightBody}>
              You&apos;re spending slightly more than last month, mainly driven
              by <Text style={styles.highlightText}>Food & Dining</Text> and{' '}
              <Text style={styles.highlightText}>Shopping</Text>.
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
              If you cap eating out to{' '}
              <Text style={styles.highlightText}>₹3,500</Text>, you could save
              an extra <Text style={styles.highlightText}>₹1,000</Text> this
              month.
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
              You have <Text style={styles.highlightText}>3 active</Text>{' '}
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

        <View style={styles.recoRow}>
          <Text style={styles.recoBullet}>•</Text>
          <Text style={styles.recoText}>
            Set a <Text style={styles.highlightText}>weekly micro-budget</Text>{' '}
            for Food & Dining instead of only monthly caps.
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
            Reserve the last <Text style={styles.highlightText}>3 days</Text> of
            each month as a low-spend zone.
          </Text>
        </View>
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
    backgroundColor: '#DCFCE7',
    marginLeft: 'auto',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
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
  cardSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
