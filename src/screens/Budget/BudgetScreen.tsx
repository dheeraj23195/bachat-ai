import React from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';


type Props = BottomTabScreenProps<AppTabParamList, 'Budget'>;

const BudgetScreen: React.FC<Props> = () => {
  const totalBudget = 15000;
  const totalSpent = 6000;
  const totalRemaining = totalBudget - totalSpent;
  const totalPercent = (totalSpent / totalBudget) * 100;

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const handleAlerts = () => navigation.navigate('Alerts');

  const categoryBudgets: CategoryBudget[] = [
    {
      id: 'food',
      name: 'Food & Dining',
      spent: 4200,
      limit: 5000,
      color: '#F97316',
    },
    {
      id: 'transport',
      name: 'Transport',
      spent: 1800,
      limit: 2500,
      color: '#6366F1',
    },
    {
      id: 'shopping',
      name: 'Shopping',
      spent: 2300,
      limit: 3000,
      color: '#EC4899',
    },
    {
      id: 'bills',
      name: 'Bills & Utilities',
      spent: 1200,
      limit: 2000,
      color: '#22C55E',
    },
  ];

  const handleAddBudget = () => {
    // TODO: open "Create / Edit Budget" screen later
    console.log('Add / edit budget pressed');
  };


  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Budgets</Text>
            <Text style={styles.headerSubtitle}>Monthly overview</Text>
          </View>

          <TouchableOpacity
            style={styles.headerAction}
            activeOpacity={0.8}
            onPress={handleAddBudget}
          >
            <Text style={styles.headerActionIcon}>＋</Text>
          </TouchableOpacity>
        </View>

        {/* Overall budget card */}
        <View style={styles.overallCard}>
          <View style={styles.overallRowTop}>
            <View>
              <Text style={styles.overallLabel}>Total Budget</Text>
              <Text style={styles.overallAmount}>₹{totalBudget.toLocaleString()}</Text>
            </View>
            <View style={styles.overallRight}>
              <Text style={styles.overallRemainingLabel}>Remaining</Text>
              <Text style={styles.overallRemainingAmount}>
                ₹{totalRemaining.toLocaleString()}
              </Text>
            </View>
          </View>

          <View style={styles.overallRowBottom}>
            <Text style={styles.overallSpentText}>
              Spent ₹{totalSpent.toLocaleString()} this month
            </Text>
            <Text style={styles.overallPercentText}>
              {totalPercent.toFixed(0)}% used
            </Text>
          </View>

          <View style={styles.overallProgressBackground}>
            <View
              style={[
                styles.overallProgressFill,
                { width: `${Math.min(totalPercent, 100)}%` },
              ]}
            />
          </View>

          {/* Alerts chip */}
          <TouchableOpacity
            style={styles.alertsChip}
            activeOpacity={0.8}
            onPress={handleAlerts}
          >
            <View style={styles.alertsChipIconCircle}>
              <Text style={styles.alertsChipIcon}>⏰</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertsChipTitle}>Budget alerts</Text>
              <Text style={styles.alertsChipSubtitle}>
                Get notified when you&apos;re close to overspending
              </Text>
            </View>
            <Text style={styles.alertsChipLink}>Manage</Text>
          </TouchableOpacity>
        </View>

        {/* Per-category budgets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Budgets</Text>
          <Text style={styles.sectionSubtitle}>
            Track how you&apos;re spending across key categories
          </Text>

          {categoryBudgets.map((b) => (
            <CategoryBudgetCard key={b.id} budget={b} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

type CategoryBudget = {
  id: string;
  name: string;
  spent: number;
  limit: number;
  color: string;
};

const CategoryBudgetCard: React.FC<{ budget: CategoryBudget }> = ({
  budget,
}) => {
  const { name, spent, limit, color } = budget;
  const remaining = limit - spent;
  const percent = (spent / limit) * 100;
  const isOverspent = spent > limit;
  const statusLabel = isOverspent
    ? 'Overspent'
    : percent > 80
    ? 'Almost there'
    : 'On track';

  const statusColor = isOverspent ? '#EF4444' : percent > 80 ? '#F97316' : '#16A34A';

  return (
    <View style={styles.categoryCard}>
      <View style={styles.categoryRowTop}>
        <View style={styles.categoryLeft}>
          <View
            style={[
              styles.categoryColorDot,
              { backgroundColor: color },
            ]}
          />
          <View>
            <Text style={styles.categoryName}>{name}</Text>
            <Text style={styles.categoryLimit}>
              Budget ₹{limit.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.categoryRight}>
          <Text style={styles.categorySpent}>
            ₹{spent.toLocaleString()}
          </Text>
          <Text style={styles.categorySpentLabel}>spent</Text>
        </View>
      </View>

      <View style={styles.categoryRowMiddle}>
        <Text style={styles.categoryRemaining}>
          ₹{remaining >= 0 ? remaining.toLocaleString() : Math.abs(remaining).toLocaleString()}{' '}
          {remaining >= 0 ? 'left' : 'over'}
        </Text>
        <View style={styles.statusPill}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: statusColor },
            ]}
          />
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
      </View>

      <View style={styles.categoryProgressBackground}>
        <View
          style={[
            styles.categoryProgressFill,
            { width: `${Math.min(percent, 110)}%`, backgroundColor: color },
          ]}
        />
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
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSecondary,
  },
  headerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerActionIcon: {
    fontSize: 22,
    color: colors.primary,
  },
  overallCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  overallRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  overallLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  overallAmount: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  overallRight: {
    alignItems: 'flex-end',
  },
  overallRemainingLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  overallRemainingAmount: {
    marginTop: 2,
    fontSize: 16,
    fontWeight: '600',
    color: '#16A34A',
  },
  overallRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
  },
  overallSpentText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  overallPercentText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  overallProgressBackground: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  overallProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  alertsChip: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertsChipIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  alertsChipIcon: {
    fontSize: 16,
  },
  alertsChipTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  alertsChipSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  alertsChipLink: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  categoryCard: {
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryColorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 10,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  categoryLimit: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categorySpent: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  categorySpentLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  categoryRowMiddle: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryRemaining: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  categoryProgressBackground: {
    marginTop: 10,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
});

export default BudgetScreen;
