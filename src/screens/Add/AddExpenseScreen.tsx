import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { AppTabParamList } from "../../navigation/AppTabs";
import colors from "../../lib/colors";
import { createTransaction } from "../../services/transactions";
import { CurrencyCode, PaymentMethod } from "../../lib/types";
import { useNavigation } from "@react-navigation/native";
import { useTransactionsStore } from "../../store/useTransactionsStore";

const CATEGORY_OPTIONS = [
  { id: "food", label: "Food & Dining" },
  { id: "transport", label: "Transport" },
  { id: "shopping", label: "Shopping" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "bills", label: "Bills & Utilities" },
  { id: "other", label: "Other" },
] as const;

type Props = BottomTabScreenProps<AppTabParamList, "Add">;

const AddExpenseScreen: React.FC<Props> = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("food");
  const [isRecurring, setIsRecurring] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Card");
  const [date, setDate] = useState<string>(new Date().toISOString());
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const currency: CurrencyCode = "INR";

  const navigation = useNavigation();
  const addLocalTransaction = useTransactionsStore(
    (s) => s.addLocalTransaction
  );

  const handleSaveExpense = async () => {
    if (isSaving) return;

    // Validate amount
    const numericAmount = parseFloat(amount.replace(/[^0-9.]/g, ""));
    if (!numericAmount || numericAmount <= 0) {
      console.log("Amount is invalid");
      return;
    }

    // Validate category
    if (!selectedCategoryId) {
      console.log('Category is required');
      return;
    }

    try {
      setIsSaving(true);

      // Create transaction
      const saved = await createTransaction({
        type: 'expense',
        amount: numericAmount,
        currency,
        date, // ISO string
        categoryId: selectedCategoryId,
        paymentMethod,
        note: note || null,
        merchant: null,
        metadataJson: null,
        isRecurring,
        source: 'manual',
      });


      // Update global state immediately
      addLocalTransaction(saved);

      // Go back after save
      navigation.goBack();
    } catch (err) {
      console.error("Failed to save transaction", err);
    } finally {
      setIsSaving(false);
    }
  };

  const aiPrediction = {
    label: "Food & Dining",
    confidence: 0.86,
    why: "Matched keywords from past similar transactions at Zomato / Swiggy",
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Expense</Text>
          <Text style={styles.headerSubtitle}>Today · 12 Nov 2025</Text>
        </View>

        {/* AI Prediction Card */}
        <View style={styles.aiCard}>
          <View style={styles.aiHeaderRow}>
            <View style={styles.aiIconCircle}>
              <Text style={styles.aiIcon}>🤖</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiTitle}>AI Category Suggestion</Text>
              <Text style={styles.aiSubtitle}>Local, on-device prediction</Text>
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
                <Text style={styles.aiCategoryText}>{aiPrediction.label}</Text>
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
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.chipRowWrap}>
            {CATEGORY_OPTIONS.map((cat) => (
              <Chip
                key={cat.id}
                label={cat.label}
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
                Repeat this expense automatically every month
              </Text>
            </View>
          </TouchableOpacity>
        </View>

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
    paddingVertical: 14,
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
    fontSize: 24,
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
  chipRow: {
    flexDirection: "row",
    justifyContent: "space-between",
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
