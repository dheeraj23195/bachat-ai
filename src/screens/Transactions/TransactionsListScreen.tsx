import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useIsFocused } from "@react-navigation/native";
import {
  startOfMonth,
  endOfMonth,
  parseISO,
  isWithinInterval,
  format,
} from "date-fns";
import { RootStackParamList } from "../../navigation/RootNavigator";
import { useTransactionsStore } from "../../store/useTransactionsStore";
import { listCategories } from "../../services/categories";
import { deleteTransaction, expandRecurringTransactionsForRange } from "../../services/transactions";
import colors from "../../lib/colors";
import { Category, Transaction } from "../../lib/types";
import ModalDatePicker from "../../components/ModalDatePicker"; // Custom date picker
import TransactionCard from "../../components/TransactionCard";
import SortChip from "../../components/SortChip";


type Props = NativeStackScreenProps<RootStackParamList, "TransactionsList">;

type SortOption = "newest" | "oldest" | "amount";

const TransactionsListScreen: React.FC<Props> = ({ route, navigation }) => {
  const {
    categoryId,
    title,
    startDate: initialStartISO,
    endDate: initialEndISO,
  } = route.params;

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const initialStartDate = useMemo(
    () => (initialStartISO ? parseISO(initialStartISO) : monthStart),
    [initialStartISO, monthStart]
  );
  const initialEndDate = useMemo(
    () => (initialEndISO ? parseISO(initialEndISO) : monthEnd),
    [initialEndISO, monthEnd]
  );

  const [startDate, setStartDate] = useState<Date | null>(initialStartDate);
  const [endDate, setEndDate] = useState<Date | null>(initialEndDate);


  const isFocused = useIsFocused();

  const transactions = useTransactionsStore((s) => s.transactions);
  const loading = useTransactionsStore((s) => s.loading);
  const loadTransactions = useTransactionsStore((s) => s.loadTransactions);

  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [activePicker, setActivePicker] = useState<"start" | "end" | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const initialCategoryFilter: string | "all" =
    categoryId !== null ? categoryId : "all";

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    string | "all"
  >(initialCategoryFilter);
  const [recurringFilter, setRecurringFilter] = useState<
    "all" | "recurring" | "nonRecurring"
  >("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string | "all">(
    "all"
  );

  

  // Load categories + refresh transactions on focus
  useEffect(() => {
    if (!isFocused) return;

    (async () => {
      try {
        await loadTransactions(); // load all; filtering done client-side
        const cats = await listCategories();
        setCategories(cats);
      } catch (e) {
        console.error("Failed to load transactions/categories", e);
      }
    })();
  }, [isFocused, loadTransactions]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const availablePaymentMethods = useMemo(
    () =>
      Array.from(new Set(transactions.map((tx) => tx.paymentMethod))).filter(
        Boolean
      ) as string[],
    [transactions]
  );


  const rangeStart = startDate ?? monthStart;
  const rawRangeEnd = endDate ?? monthEnd;
  const rangeEnd =
    rawRangeEnd < rangeStart ? rangeStart : rawRangeEnd; // safety if user picks weird order

  const expandedRangeTransactions = useMemo(
    () => expandRecurringTransactionsForRange(transactions, rangeStart, rangeEnd),
    [transactions, rangeStart, rangeEnd]
  );

  // Filter + sort transactions
    const filteredTransactions = useMemo(() => {
    const lowerSearch = searchQuery.trim().toLowerCase();

    let list = expandedRangeTransactions.filter((tx) => {
      if (tx.type !== "expense") return false;

      // Category filter from route
      if (categoryId !== null && tx.categoryId !== categoryId) {
        return false;
      }

      // Extra category filter from filters
      if (
        selectedCategoryFilter !== "all" &&
        tx.categoryId !== selectedCategoryFilter
      ) {
        return false;
      }

      // Recurring / non-recurring filter
      if (recurringFilter === "recurring" && !tx.isRecurring) {
        return false;
      }
      if (recurringFilter === "nonRecurring" && tx.isRecurring) {
        return false;
      }

      // Payment method filter
      if (
        paymentMethodFilter !== "all" &&
        tx.paymentMethod !== paymentMethodFilter
      ) {
        return false;
      }

      // Search by note + category name
      if (lowerSearch.length > 0) {
        const note = tx.encryptedNote?.toLowerCase() ?? "";
        const catName =
          categoryMap.get(tx.categoryId ?? "")?.name.toLowerCase() ?? "";

        if (!note.includes(lowerSearch) && !catName.includes(lowerSearch)) {
          return false;
        }
      }

      return true;
    });

    list = list.slice(); // copy before sort

    list.sort((a, b) => {
      if (sortBy === "amount") {
        return b.amount - a.amount;
      }

      const da = parseISO(a.date).getTime();
      const db = parseISO(b.date).getTime();

      if (sortBy === "newest") {
        return db - da;
      }
      // oldest
      return da - db;
    });

    return list;
  }, [
    expandedRangeTransactions,
    categoryId,
    selectedCategoryFilter,
    recurringFilter,
    paymentMethodFilter,
    searchQuery,
    sortBy,
    categoryMap,
  ]);


  const totalSpent = useMemo(
    () => filteredTransactions.reduce((sum, tx) => sum + tx.amount, 0),
    [filteredTransactions]
  );

  const handleDelete = (tx: Transaction) => {
    Alert.alert(
      "Delete expense",
      "Are you sure you want to delete this expense? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteTransaction(tx.id);
              await loadTransactions();
            } catch (e) {
              console.error("Failed to delete transaction", e);
              Alert.alert("Error", "Could not delete this expense.");
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Transaction }) => {
    const category =
      item.categoryId ? (categoryMap.get(item.categoryId) ?? null) : null;

    return (
      <TransactionCard
        transaction={item}
        category={category}
        onDelete={() => handleDelete(item)}
        onEdit={() => {
          // TODO: implement EditExpenseScreen later
          Alert.alert("Coming soon", "Editing expenses will be added later.");
        }}
      />
    );
  };

  const hasResults = filteredTransactions.length > 0;

  // Show category filter info
  const categoryTitle = categoryId
    ? categoryMap.get(categoryId)?.name ?? "Category"
    : "All Expenses";

  // Build header date range label
  const headerRangeStart = startDate ?? monthStart;
  const headerRangeEnd = endDate ?? monthEnd;
  const headerRangeLabel = `${format(
    headerRangeStart,
    "dd MMM yyyy"
  )} – ${format(headerRangeEnd, "dd MMM yyyy")}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header (title from route) */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{categoryTitle}</Text>
          <Text style={styles.headerSubtitle}>{headerRangeLabel}</Text>
        </View>

        {/* Date range selector */}
        <View style={styles.datePickerRow}>
          <View style={styles.dateRangeContainer}>
            <TouchableOpacity
              style={styles.dateHalfButton}
              onPress={() => {
                setActivePicker("start");
                setShowDatePicker(true);
              }}
            >
              <Text style={styles.dateLabel}>Start</Text>
              <Text style={styles.dateButtonText}>
                {startDate ? format(startDate, "dd MMM yyyy") : "Start date"}
              </Text>
            </TouchableOpacity>

            <View style={styles.dateRangeDivider} />

            <TouchableOpacity
              style={styles.dateHalfButton}
              onPress={() => {
                setActivePicker("end");
                setShowDatePicker(true);
              }}
            >
              <Text style={styles.dateLabel}>End</Text>
              <Text style={styles.dateButtonText}>
                {endDate ? format(endDate, "dd MMM yyyy") : "End date"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>


        {/* Expense summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total spent</Text>
          <Text style={styles.summaryAmount}>
            ₹{totalSpent.toLocaleString()}
          </Text>
        </View>

        {/* Search + filter + sort */}
        <View style={styles.controlsRow}>
          <View style={styles.searchFilterRow}>
            <View style={styles.searchWrapper}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search notes or categories"
                placeholderTextColor={colors.placeholder}
              />
            </View>

            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setFiltersVisible(true)}
            >
              <Text style={styles.filterIcon}>⏱</Text>
              <Text style={styles.filterButtonText}>Filters</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sortChipsRow}>
            <SortChip
              label="Newest"
              active={sortBy === "newest"}
              onPress={() => setSortBy("newest")}
            />
            <SortChip
              label="Oldest"
              active={sortBy === "oldest"}
              onPress={() => setSortBy("oldest")}
            />
            <SortChip
              label="Amount"
              active={sortBy === "amount"}
              onPress={() => setSortBy("amount")}
            />
          </View>
        </View>


        {/* List */}
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            !hasResults && { flex: 1 },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {loading ? "Loading expenses…" : "No expenses found"}
              </Text>
              {!loading && (
                <Text style={styles.emptySubtitle}>
                  Try changing the search or sort options.
                </Text>
              )}
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>

            {/* Filters Modal */}
      {filtersVisible && (
        <Modal
          transparent
          animationType="fade"
          onRequestClose={() => setFiltersVisible(false)}
        >
          <View style={styles.filterOverlay}>
            <View style={styles.filterCard}>
              <Text style={styles.filterTitle}>Filters</Text>

              <ScrollView
                style={{ maxHeight: 400 }}
                contentContainerStyle={{ paddingBottom: 8 }}
              >
                {/* Category filter */}
                <Text style={styles.filterSectionLabel}>Category</Text>
                <View style={styles.filterChipsRow}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      selectedCategoryFilter === "all" &&
                        styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedCategoryFilter("all")}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedCategoryFilter === "all" &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      All
                    </Text>
                  </TouchableOpacity>

                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.filterChip,
                        selectedCategoryFilter === cat.id &&
                          styles.filterChipActive,
                      ]}
                      onPress={() => setSelectedCategoryFilter(cat.id)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          selectedCategoryFilter === cat.id &&
                            styles.filterChipTextActive,
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Recurring filter */}
                <Text style={styles.filterSectionLabel}>Recurring</Text>
                <View style={styles.filterChipsRow}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      recurringFilter === "all" && styles.filterChipActive,
                    ]}
                    onPress={() => setRecurringFilter("all")}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        recurringFilter === "all" &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      All
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      recurringFilter === "recurring" &&
                        styles.filterChipActive,
                    ]}
                    onPress={() => setRecurringFilter("recurring")}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        recurringFilter === "recurring" &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      Recurring
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      recurringFilter === "nonRecurring" &&
                        styles.filterChipActive,
                    ]}
                    onPress={() => setRecurringFilter("nonRecurring")}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        recurringFilter === "nonRecurring" &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      One-time
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Payment method filter */}
                <Text style={styles.filterSectionLabel}>Payment method</Text>
                <View style={styles.filterChipsRow}>
                  <TouchableOpacity
                    style={[
                      styles.filterChip,
                      paymentMethodFilter === "all" &&
                        styles.filterChipActive,
                    ]}
                    onPress={() => setPaymentMethodFilter("all")}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        paymentMethodFilter === "all" &&
                          styles.filterChipTextActive,
                      ]}
                    >
                      All
                    </Text>
                  </TouchableOpacity>

                  {availablePaymentMethods.map((pm) => (
                    <TouchableOpacity
                      key={pm}
                      style={[
                        styles.filterChip,
                        paymentMethodFilter === pm && styles.filterChipActive,
                      ]}
                      onPress={() => setPaymentMethodFilter(pm)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          paymentMethodFilter === pm &&
                            styles.filterChipTextActive,
                        ]}
                      >
                        {sentenceCase(pm)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.filterFooterRow}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedCategoryFilter("all");
                    setRecurringFilter("all");
                    setPaymentMethodFilter("all");
                  }}
                  style={styles.filterResetButton}
                >
                  <Text style={styles.filterResetText}>Reset</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFiltersVisible(false)}
                  style={styles.filterApplyButton}
                >
                  <Text style={styles.filterApplyText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}


      {/* Date Picker Modal */}
      {showDatePicker && (
        <ModalDatePicker
          visible={showDatePicker}
          onConfirm={(date) => {
            if (activePicker === "start") {
              setStartDate(date);
            } else if (activePicker === "end") {
              setEndDate(date);
            }
            setShowDatePicker(false);
            setActivePicker(null);
          }}
          onCancel={() => {
            setShowDatePicker(false);
            setActivePicker(null);
          }}
        />
      )}
    </SafeAreaView>
  );
};

function sentenceCase(str: string): string {
  const trimmed = str.trim();
  if (!trimmed) return trimmed;
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}


const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },

  headerRow: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSecondary,
  },

  datePickerRow: {
    marginTop: 10,
    marginBottom: 10,
  },
  dateRangeContainer: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  dateHalfButton: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "center",
  },
  dateRangeDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  dateLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  dateButtonText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: "500",
  },


  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryLabel: { fontSize: 13, color: colors.textSecondary },
  summaryAmount: { fontSize: 20, fontWeight: "700", color: colors.textPrimary },

  searchIcon: { fontSize: 14, marginRight: 6 },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },

  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sortChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  sortChipText: { fontSize: 12, color: colors.textPrimary },
  sortChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  listContent: {
    paddingBottom: 24,
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  controlsRow: {
    marginBottom: 12,
  },
  searchFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterIcon: {
    fontSize: 13,
    marginRight: 4,
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textPrimary,
  },

  sortChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  } as any,

  filterOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  filterCard: {
    width: "100%",
    borderRadius: 18,
    backgroundColor: colors.surface,
    padding: 16,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: "center",
  },
  filterSectionLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 8,
  },
  filterChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginRight: 8,
    marginBottom: 6,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  filterChipText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  filterChipTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  filterFooterRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  filterResetButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  filterResetText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  filterApplyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  filterApplyText: {
    fontSize: 13,
    color: "#fff",
    fontWeight: "600",
  },

});

export default TransactionsListScreen;
