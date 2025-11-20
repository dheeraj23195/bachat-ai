// src/screens/Add/AddExpenseScreen.tsx

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { useIsFocused } from '@react-navigation/native';

import { AppTabParamList } from "../../navigation/AppTabs";
import colors from "../../lib/colors";
import { createTransaction } from "../../services/transactions";
import {
  CurrencyCode,
  PaymentMethod,
  Category,
  Transaction,
} from "../../lib/types";
import { useTransactionsStore } from "../../store/useTransactionsStore";
import { listCategories } from "../../services/categories";

import { listBudgets } from "../../services/budgets";
import { expandRecurringTransactionsForRange } from "../../services/transactions";
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from "date-fns";
import { sendBudgetAlertNotification } from "../../services/notifications";

// After imports, before AddExpenseScreen component

async function checkBudgetAlertsForNewExpense(saved: Transaction) {
  try {
    // Get the latest transactions from the store
    const allTx = useTransactionsStore.getState().transactions;

    // Use the month of the expense's date
    const expenseDate = parseISO(saved.date);
    const monthStart = startOfMonth(expenseDate);
    const monthEnd = endOfMonth(expenseDate);

    // Expand recurring transactions for this month
    const expanded = expandRecurringTransactionsForRange(
      allTx,
      monthStart,
      monthEnd
    ).filter((tx) => {
      if (tx.type !== "expense") return false;
      try {
        const d = parseISO(tx.date);
        return isWithinInterval(d, { start: monthStart, end: monthEnd });
      } catch {
        return false;
      }
    });

    // Fetch active budgets
    const budgets = await listBudgets({ activeOnly: true });

    // Check category-specific + overall (categoryId === null) budgets
    const relevantBudgets = budgets.filter(
      (b) => b.categoryId === saved.categoryId || b.categoryId === null
    );

    for (const b of relevantBudgets) {
      const spentForThisBudget = expanded
        .filter((tx) =>
          b.categoryId === null ? true : tx.categoryId === b.categoryId
        )
        .reduce((sum, tx) => sum + tx.amount, 0);

      if (spentForThisBudget <= 0 || b.limitAmount <= 0) continue;

      const usagePercent = (spentForThisBudget / b.limitAmount) * 100;

      if (usagePercent >= b.alertThresholdPercent) {
        const scopeLabel =
          b.categoryId === null ? "overall" : "category";

        const title = "Budget alert";
        const body = `Your ${scopeLabel} budget is at ${usagePercent.toFixed(
          0
        )}% of the limit.`;

        // Local notification (OS-level)
        await sendBudgetAlertNotification(title, body);

        // If you only want one notification per expense, you can break here.
        // break;
      }
    }
  } catch (e) {
    console.error("Failed to compute/send budget alert", e);
  }
}



type Props = BottomTabScreenProps<AppTabParamList, "Add">;

type RecurringFrequency = "daily" | "weekly" | "monthly";

const AddExpenseScreen: React.FC<Props> = () => {
  // Categories from DB
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<string | null>(null);

  const [isRecurring, setIsRecurring] = useState(false);
  const isFocused = useIsFocused();
  const [recurringFrequency, setRecurringFrequency] =
    useState<RecurringFrequency>("monthly");
  const [recurringWeekdays, setRecurringWeekdays] = useState<string[]>(
    []
  );
  const [recurringMonthDay, setRecurringMonthDay] = useState<string>("");

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("Card");
  const [customPaymentMethod, setCustomPaymentMethod] = useState("");
  const [date, setDate] = useState<string>(
    new Date().toISOString()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const currency: CurrencyCode = "INR";

  const navigation = useNavigation();
  const addLocalTransaction = useTransactionsStore(
    (s) => s.addLocalTransaction
  );

  const transactions = useTransactionsStore((s) => s.transactions);
  const loadTransactions = useTransactionsStore((s) => s.loadTransactions);

  const scrollRef = useRef<ScrollView | null>(null);

  // ----- Load categories from DB -----
  useEffect(() => {
    if (!isFocused) return;

    const fetchCategories = async () => {
      try {
        const rows = await listCategories();  // <-- Fetch categories from DB
        setCategories(rows);  // <-- Set categories state
        if (!selectedCategoryId && rows.length > 0) {
          setSelectedCategoryId(rows[0].id);  // Default to first category if none is selected
        }
      } catch (error) {
        console.error('Failed to load categories', error);
      }
    };

    fetchCategories();
  }, [isFocused]); 


  const formattedHeaderDate = useMemo(() => {
    try {
      return format(parseISO(date), "dd MMM yyyy");
    } catch {
      return "";
    }
  }, [date]);

  const aiPrediction = {
    label: "Food & Dining",
    confidence: 0.86,
    why: "Matched keywords from past similar transactions at Zomato / Swiggy",
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selected?: Date
  ) => {
    if (event.type === "dismissed") {
      setShowDatePicker(false);
      return;
    }
    const chosen = selected || new Date(date);
    setDate(chosen.toISOString());
    if (Platform.OS !== "ios") {
      setShowDatePicker(false);
    }
  };

  const toggleWeekday = (code: string) => {
    setRecurringWeekdays((prev) =>
      prev.includes(code)
        ? prev.filter((d) => d !== code)
        : [...prev, code]
    );
  };

  const buildRecurringRule = (): string | null => {
    if (!isRecurring) return null;

    const rule: any = {
      frequency: recurringFrequency,
    };

    if (recurringFrequency === "weekly") {
      rule.weekdays = recurringWeekdays;
    } else if (recurringFrequency === "monthly") {
      const dayNum = parseInt(recurringMonthDay, 10);
      if (!Number.isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
        rule.monthDay = dayNum;
      }
    }

    return JSON.stringify(rule);
  };

  const resetForm = () => {
    setSelectedCategoryId(
      categories[0]?.id ?? null
    );
    setIsRecurring(false);
    setRecurringFrequency("monthly");
    setRecurringWeekdays([]);
    setRecurringMonthDay("");
    setAmount("");
    setPaymentMethod("Card");
    setCustomPaymentMethod("");
    setDate(new Date().toISOString());
    setNote("");
    setShowDatePicker(false);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleSaveExpense = async () => {
    if (isSaving) return;

    const numericAmount = parseFloat(
      amount.replace(/[^0-9.]/g, "")
    );
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount.");
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert(
        "Choose a category",
        "Please select a category."
      );
      return;
    }

    const recurringRule = buildRecurringRule();

    const metadata: Record<string, any> = {};
    if (paymentMethod === "Other" && customPaymentMethod.trim()) {
      metadata.customPaymentMethod = customPaymentMethod.trim();
    }
    const metadataJson =
      Object.keys(metadata).length > 0
        ? JSON.stringify(metadata)
        : null;

    try {
      setIsSaving(true);

      const saved = await createTransaction({
        type: "expense",
        amount: numericAmount,
        currency,
        date,
        categoryId: selectedCategoryId,
        paymentMethod,
        note: note || null,
        merchant: null,
        metadataJson,
        isRecurring,
        recurringRule,
        source: "manual",
      });

      // Update in-memory store
      addLocalTransaction(saved);

      // 🔔 Check budgets and send local notifications if thresholds are crossed
      await checkBudgetAlertsForNewExpense(saved);

      // Success popup
      Alert.alert("Expense saved", "Your expense has been added.", [
        { text: "OK" },
      ]);

      resetForm();
    } catch (err) {
      console.error("Failed to save transaction", err);
      Alert.alert(
        "Error",
        "Something went wrong while saving your expense. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const showRecurringDetails = isRecurring;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Expense</Text>
          <Text style={styles.headerSubtitle}>
            {formattedHeaderDate ? `On ${formattedHeaderDate}` : ""}
          </Text>
        </View>

        {/* AI Prediction Card */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeaderRow}>
            <View style={styles.aiIconCircle}>
              <Text style={styles.aiIcon}>🤖</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiTitle}>AI Category Suggestion</Text>
              <Text style={styles.aiSubtitle}>
                Local, on-device prediction
              </Text>
            </View>
            <View style={styles.aiConfidencePill}>
              <Text style={styles.aiConfidenceText}>
                {(aiPrediction.confidence * 100).toFixed(0)}%
              </Text>
            </View>
          </View>

          <View style={styles.aiBodyRow}>
            <View>
              <Text style={styles.aiLabel}>Suggested Category</Text>
              <View style={styles.aiCategoryPill}>
                <Text style={styles.aiCategoryText}>
                  {aiPrediction.label}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.aiWhyLabel}>Why this suggestion?</Text>
          <Text style={styles.aiWhyText}>{aiPrediction.why}</Text>
        </View>

        {/* Amount input */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.dateButtonText}>
              {formattedHeaderDate || "Select date"}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={parseISO(date)}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={handleDateChange}
            />
          )}
        </View>

        {/* Note / description */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Description</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Dinner at cafe, groceries..."
              placeholderTextColor={colors.placeholder}
              multiline
            />
          </View>
        </View>

        {/* Payment method */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Payment Method</Text>
          <View style={styles.chipRow}>
            <Chip
              label="UPI"
              selected={paymentMethod === "UPI"}
              onPress={() => setPaymentMethod("UPI")}
            />
            <Chip
              label="Cash"
              selected={paymentMethod === "Cash"}
              onPress={() => setPaymentMethod("Cash")}
            />
            <Chip
              label="Card"
              selected={paymentMethod === "Card"}
              onPress={() => setPaymentMethod("Card")}
            />
            <Chip
              label="Other"
              selected={paymentMethod === "Other"}
              onPress={() => setPaymentMethod("Other")}
            />
          </View>

          {paymentMethod === "Other" && (
            <View style={{ marginTop: 10 }}>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  value={customPaymentMethod}
                  onChangeText={setCustomPaymentMethod}
                  placeholder="Type payment method (e.g. Sodexo, PayPal…)"
                  placeholderTextColor={colors.placeholder}
                />
              </View>
            </View>
          )}
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.chipRowWrap}>
            {categories.map((cat) => (
              <Chip
                key={cat.id}
                label={cat.name}
                selected={selectedCategoryId === cat.id}
                onPress={() => setSelectedCategoryId(cat.id)}
              />
            ))}
          </View>
        </View>

        {/* Recurring toggle */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.recurringRow}
            activeOpacity={0.8}
            onPress={() => setIsRecurring(!isRecurring)}
          >
            <View
              style={[
                styles.toggleOuter,
                isRecurring && styles.toggleOuterActive,
              ]}
            >
              <View
                style={[
                  styles.toggleInner,
                  isRecurring && styles.toggleInnerActive,
                ]}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recurringTitle}>Recurring expense</Text>
              <Text style={styles.recurringSubtitle}>
                Repeat this expense automatically (rule stored locally)
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Recurring details */}
        {showRecurringDetails && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Repeat frequency</Text>
            <View style={styles.chipRow}>
              <Chip
                label="Daily"
                selected={recurringFrequency === "daily"}
                onPress={() => setRecurringFrequency("daily")}
              />
              <Chip
                label="Weekly"
                selected={recurringFrequency === "weekly"}
                onPress={() => setRecurringFrequency("weekly")}
              />
              <Chip
                label="Monthly"
                selected={recurringFrequency === "monthly"}
                onPress={() => setRecurringFrequency("monthly")}
              />
            </View>

            {recurringFrequency === "weekly" && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.sectionLabel}>Days of week</Text>
                <View style={styles.chipRowWrap}>
                  {[
                    { code: "MO", label: "Mon" },
                    { code: "TU", label: "Tue" },
                    { code: "WE", label: "Wed" },
                    { code: "TH", label: "Thu" },
                    { code: "FR", label: "Fri" },
                    { code: "SA", label: "Sat" },
                    { code: "SU", label: "Sun" },
                  ].map((d) => (
                    <Chip
                      key={d.code}
                      label={d.label}
                      selected={recurringWeekdays.includes(d.code)}
                      onPress={() => toggleWeekday(d.code)}
                    />
                  ))}
                </View>
              </View>
            )}

            {recurringFrequency === "monthly" && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.sectionLabel}>
                  Day of month (1–31)
                </Text>
                <View style={styles.amountRow}>
                  <TextInput
                    style={styles.amountInput}
                    value={recurringMonthDay}
                    onChangeText={setRecurringMonthDay}
                    placeholder="e.g. 5"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {/* Save button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveExpense}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? "Saving…" : "Save Expense"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

const Chip: React.FC<ChipProps> = ({ label, selected, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
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
  header: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  aiCard: {
    marginTop: 12,
    marginBottom: 20,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#EEF2FF",
  },
  aiHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  aiIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  aiIcon: {
    fontSize: 20,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  aiSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  aiConfidencePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#DCFCE7",
  },
  aiConfidenceText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16A34A",
  },
  aiBodyRow: {
    marginTop: 16,
    marginBottom: 12,
  },
  aiLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  aiCategoryPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EEF3FF",
  },
  aiCategoryText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
  },
  aiWhyLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: 2,
  },
  aiWhyText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textSecondary,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  textInput: {
    fontSize: 14,
    color: colors.textPrimary,
    minHeight: 40,
  },
  dateButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  dateButtonText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  chipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  chipRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  } as any,
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  chipText: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  chipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  recurringRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  toggleOuter: {
    width: 44,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#E5E7EB",
    marginRight: 12,
    padding: 2,
    justifyContent: "center",
  },
  toggleOuterActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  toggleInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
  },
  toggleInnerActive: {
    alignSelf: "flex-end",
  },
  recurringTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  recurringSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  saveButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default AddExpenseScreen;
