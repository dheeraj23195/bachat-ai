import React, { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { AppTabParamList } from "../../navigation/AppTabs";

import colors from "../../lib/colors";
import { useTransactionsStore } from "../../store/useTransactionsStore";
import {
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  format,
} from "date-fns";
import { Category } from "../../lib/types";
import { listCategories } from "../../services/categories";
import { useIsFocused } from "@react-navigation/native";
import { expandRecurringTransactionsForRange } from "../../services/transactions";
import { listBudgets } from "../../services/budgets";
import { Budget } from "../../lib/types";
import { getCurrentUser } from "../../services/supabaseClient";
import { uploadEncryptedBackup } from "../../services/cloudSync";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";

import {
  Plus,
  Upload,
  Camera,
  MessageCircle,
  TrendingDown,
  TrendingUp,
  Wallet,
  PiggyBank,
  ShoppingBag,
  Coffee,
  Car,
  Home,
  Bell,
} from "lucide-react-native";

type Props = BottomTabScreenProps<AppTabParamList, "Home"> & {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

const SEGMENT_COLORS = [
  "#F97316", // orange
  "#4F46E5", // indigo
  "#EC4899", // pink
  "#22C55E", // green
  "#0EA5E9", // sky
  "#A855F7", // purple
];

const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const handleImportPress = () => navigation.navigate("ImportTransactions");
  const handleScanPress = () => {}; // leave empty for now
  const handleChatPress = () => navigation.navigate("Chatbot");
  const handleNotificationsPress = () => navigation.navigate("Alerts");
  const handleAddPress = () => navigation.navigate("Add");

  const transactions = useTransactionsStore((s) => s.transactions);
  const isFocused = useIsFocused();
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [userName, setUserName] = useState<string>("Bachat user");
  const [syncing, setSyncing] = useState(false);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  useEffect(() => {
    const load = async () => {
      try {
        setLoadingBudgets(true);
        const [budgetRows, categoryRows] = await Promise.all([
          listBudgets({ activeOnly: true }),
          listCategories(),
        ]);

        setBudgets(budgetRows);
        setCategories(categoryRows);
      } catch (e) {
        console.error("Failed to load budgets/categories on Home", e);
      } finally {
        setLoadingBudgets(false);
      }
    };

    if (isFocused) {
      load();
    }
  }, [isFocused]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        if (user) {
          const metaName =
            (user.user_metadata as any)?.full_name as string | undefined;
          setUserName(metaName || user.email || "Bachat user");
        }
      } catch (e) {
        console.warn("[Home] Failed to load Supabase user", e);
      }
    };

    loadUser();
  }, []);

  // Expand recurring transactions for this month (same behaviour as BudgetScreen)
  const expandedMonthlyTransactions = useMemo(
    () =>
      expandRecurringTransactionsForRange(transactions, monthStart, monthEnd),
    [transactions, monthStart, monthEnd]
  );

  const monthlyExpenses = useMemo(
    () => expandedMonthlyTransactions.filter((tx) => tx.type === "expense"),
    [expandedMonthlyTransactions]
  );

  const totalSpent = useMemo(
    () => monthlyExpenses.reduce((sum, t) => sum + t.amount, 0),
    [monthlyExpenses]
  );

  const handleManualSync = async () => {
    if (syncing) return;
    setSyncing(true);

    try {
      await uploadEncryptedBackup();
      Alert.alert(
        "Synced",
        "Your data has been securely backed up to the cloud."
      );
    } catch (err: any) {
      console.error("[Settings] Manual sync failed", err);
      Alert.alert(
        "Sync failed",
        err?.message ?? "Unable to sync right now. Please try again later."
      );
    } finally {
      setSyncing(false);
    }
  };

  const totalBudget = useMemo(
    () => budgets.reduce((sum, b) => sum + b.limitAmount, 0),
    [budgets]
  );

  const budgetUsagePercent = useMemo(() => {
    if (totalBudget <= 0) return 0;
    return Math.min(100, (totalSpent / totalBudget) * 100);
  }, [totalBudget, totalSpent]);

  const categorySpend: Record<string, number> = {};
  for (const tx of monthlyExpenses) {
    if (!tx.categoryId) continue;
    categorySpend[tx.categoryId] =
      (categorySpend[tx.categoryId] ?? 0) + tx.amount;
  }

  type ChartSegment = {
    categoryId: string;
    label: string;
    value: number;
    color: string;
  };

  const chartSegments: ChartSegment[] = Object.keys(categorySpend).map(
    (categoryId, index) => {
      const cat = categoryMap.get(categoryId);
      const label = cat?.name ?? categoryId;
      const color =
        cat?.colorHex ?? SEGMENT_COLORS[index % SEGMENT_COLORS.length];

      return {
        categoryId,
        label,
        value: categorySpend[categoryId],
        color,
      };
    }
  );

  // --- Recent Transactions (current month, newest first) ---
  const recentTransactions = useMemo(
    () =>
      [...monthlyExpenses]
        .sort(
          (a, b) =>
            parseISO(b.date).getTime() - parseISO(a.date).getTime()
        )
        .slice(0, 3),
    [monthlyExpenses]
  );

  const handleSeeAllPress = () => {
    navigation.navigate("TransactionsList", {
      categoryId: null,
      title: "All Expenses",
      startDate: monthStart.toISOString(),
      endDate: monthEnd.toISOString(),
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Blue header section */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.greetingText}>Good Morning</Text>
              <Text style={styles.userName}>{userName}</Text>
            </View>

            {/* Manual Sync Now button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleManualSync}
              disabled={syncing}
            >
              <Text style={styles.syncButtonText}>
                {syncing ? "Syncing…" : "Sync Now"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Monthly summary card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>This month spent</Text>
                <Text style={styles.mainAmount}>
                  ₹{totalSpent.toLocaleString()}
                </Text>
                {totalBudget > 0 && (
                  <Text style={styles.summarySubtext}>
                    {budgetUsagePercent.toFixed(0)}% of your budget used
                  </Text>
                )}
              </View>

              <View style={styles.summaryRight}>
                <Text style={styles.summaryRate}>
                  {totalBudget > 0
                    ? `${budgetUsagePercent.toFixed(0)}%`
                    : "--"}
                </Text>
                <Text style={styles.summaryRateLabel}>of budget used</Text>
              </View>
            </View>

            {/* Progress bar: % of budget used */}
            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${budgetUsagePercent}%` },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.quickActionsSection}>
          <View style={styles.quickActionsRow}>
            <QuickActionButton
              label="Add"
              Icon={Plus}
              onPress={handleAddPress}
            />
            <QuickActionButton
              label="Import"
              Icon={Upload}
              onPress={handleImportPress}
            />
            <QuickActionButton
              label="Scan"
              Icon={Camera}
              onPress={handleScanPress}
            />
            <QuickActionButton
              label="Chat AI"
              Icon={MessageCircle}
              onPress={handleChatPress}
            />
          </View>
        </View>

        {/* Category spending section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Spending</Text>

          <View style={styles.card}>
            {chartSegments.length === 0 ? (
              <View style={styles.donutPlaceholder}>
                <Text style={styles.donutText}>No expenses this month</Text>
              </View>
            ) : (
              <>
                <View style={styles.legendContainer}>
                  {chartSegments.map((item) => (
                    <LegendItem
                      key={item.categoryId}
                      color={item.color}
                      label={item.label}
                      value={item.value.toLocaleString()}
                    />
                  ))}
                </View>
              </>
            )}
          </View>
        </View>

        {/* Recent Transactions section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            {monthlyExpenses.length > 0 && (
              <TouchableOpacity
                onPress={handleSeeAllPress}
                activeOpacity={0.8}
              >
                <Text style={styles.sectionActionText}>See all</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.card}>
            {recentTransactions.length === 0 ? (
              <View style={styles.emptyRecentWrapper}>
                <Text style={styles.donutText}>
                  No expenses recorded yet.
                </Text>
              </View>
            ) : (
              recentTransactions.map((tx) => {
                const category = tx.categoryId
                  ? categoryMap.get(tx.categoryId)
                  : undefined;
                const title =
                  tx.encryptedNote || category?.name || "Expense";
                const dateLabel = format(parseISO(tx.date), "dd MMM");

                return (
                  <View
                    key={`${tx.id}_${tx.date}`}
                    style={styles.recentRow}
                  >
                    <View
                      style={[
                        styles.recentIconCircle,
                        {
                          backgroundColor:
                            category?.colorHex || "#EEF2FF",
                        },
                      ]}
                    >
                      <Text style={styles.recentIconLetter}>
                        {(
                          category?.name?.[0] ||
                          title[0] ||
                          "E"
                        ).toUpperCase()}
                      </Text>
                    </View>

                    <View style={styles.recentTextColumn}>
                      <Text
                        style={styles.recentTitle}
                        numberOfLines={1}
                      >
                        {title}
                      </Text>
                      <Text style={styles.recentSubtitle}>
                        {category?.name ?? "Uncategorized"} • {dateLabel}
                      </Text>
                    </View>

                    <Text style={styles.recentAmount}>
                      -₹{tx.amount.toLocaleString()}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

type QuickActionProps = {
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  onPress: () => void;
};

const QuickActionButton: React.FC<QuickActionProps> = ({
  label,
  Icon,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickIconCircle}>
        <Icon size={22} color={colors.primary} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

type LegendProps = {
  color: string;
  label: string;
  value: string;
};

const LegendItem: React.FC<LegendProps> = ({ color, label, value }) => {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
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
  mainAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  greetingText: {
    fontSize: 14,
    color: "#E5E7EB",
  },
  userName: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  bellIcon: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  summaryCard: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryAmount: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  summarySubtext: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryRight: {
    alignItems: "flex-end",
  },
  summaryRate: {
    fontSize: 18,
    fontWeight: "700",
    color: "#22C55E",
  },
  summaryRateLabel: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  progressBackground: {
    marginTop: 16,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  progressFill: {
    width: "40%", // dynamic override applied inline
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  quickActionsSection: {
    paddingHorizontal: 24,
    marginTop: 16,
  },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickAction: {
    flex: 1,
    alignItems: "center",
  },
  syncButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: "white",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.7)",
    alignSelf: "flex-start",
  },
  syncButtonText: {
    color: "#ffffffff",
    fontSize: 14,
    fontWeight: "600",
  },

  quickIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickIcon: {
    fontSize: 20,
    color: colors.primary,
  },
  quickLabel: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionActionText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  donutWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  donutPlaceholder: {
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  donutText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  legendContainer: {
    marginTop: 4,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },
  legendValue: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  donutRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  activeLabelPill: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  activeLabelText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textPrimary,
  },

  // Recent transactions styles
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  recentIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  recentIconLetter: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  recentTextColumn: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  recentSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  recentAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DC2626", // red-ish for expenses
    marginLeft: 8,
  },
  emptyRecentWrapper: {
    paddingVertical: 16,
    alignItems: "center",
  },
});

export default HomeScreen;