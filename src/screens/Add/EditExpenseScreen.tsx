// src/screens/Add/EditExpenseScreen.tsx

import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { format, parseISO } from "date-fns";

import { RootStackParamList } from "../../navigation/RootNavigator";
import colors from "../../lib/colors";

import { Category, Transaction } from "../../lib/types";
import { listCategories } from "../../services/categories";
import {
  getTransactionById,
  updateTransaction,
} from "../../services/transactions";
import { useTransactionsStore } from "../../store/useTransactionsStore";
import ModalDatePicker from "../../components/ModalDatePicker";

type Props = NativeStackScreenProps<RootStackParamList, "EditExpense">;

const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank Transfer"];

const EditExpenseScreen: React.FC<Props> = ({ route, navigation }) => {
  const { transactionId } = route.params;

  const loadTransactions = useTransactionsStore((s) => s.loadTransactions);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [transaction, setTransaction] = useState<Transaction | null>(null);

  const [amountInput, setAmountInput] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [date, setDate] = useState<Date | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);

  // Load transaction + categories
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [tx, cats] = await Promise.all([
          getTransactionById(transactionId),
          listCategories(),
        ]);

        if (!tx) {
          Alert.alert("Not found", "This expense no longer exists.", [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]);
          return;
        }

        setTransaction(tx);
        setCategories(cats);

        // Prefill form fields
        setAmountInput(tx.amount.toString());
        setSelectedCategoryId(tx.categoryId ?? null);
        setNote(tx.encryptedNote ?? "");
        setPaymentMethod(tx.paymentMethod ?? null);

        try {
          setDate(parseISO(tx.date));
        } catch {
          setDate(new Date());
        }
      } catch (e) {
        console.error("Failed to load transaction/categories", e);
        Alert.alert("Error", "Could not load this expense.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [transactionId, navigation]);

  const formattedDate = useMemo(() => {
    if (!date) return "Select date";
    try {
      return format(date, "dd MMM yyyy");
    } catch {
      return "Select date";
    }
  }, [date]);

  const handleSave = async () => {
    if (!transaction) return;
    if (saving) return;

    // Validate amount
    const numericAmount = parseFloat(amountInput.replace(/[^0-9.]/g, ""));
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount.");
      return;
    }

    if (!date) {
      Alert.alert("Select date", "Please choose a date for this expense.");
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert("Choose a category", "Please select a category.");
      return;
    }

    try {
      setSaving(true);

      await updateTransaction(transaction.id, {
        amount: numericAmount,
        date: date.toISOString(),
        categoryId: selectedCategoryId,
        note, // adjust key name if your updateTransaction expects something else
        paymentMethod: paymentMethod ?? null,
      } as any);

      // Reload list in store so UI stays in sync
      await loadTransactions();

      navigation.goBack();
    } catch (e) {
      console.error("Failed to update transaction", e);
      Alert.alert("Error", "Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !transaction) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading expense…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Edit Expense</Text>
          <Text style={styles.headerSubtitle}>
            Update amount, category or note
          </Text>
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={amountInput}
              onChangeText={setAmountInput}
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
          >
            <Text style={styles.dateButtonText}>{formattedDate}</Text>
          </TouchableOpacity>
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.chipRowWrap}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.chip,
                  selectedCategoryId === cat.id && styles.chipSelected,
                ]}
                onPress={() => setSelectedCategoryId(cat.id)}
              >
                <View
                  style={[
                    styles.chipColorDot,
                    { backgroundColor: cat.colorHex ?? "#6B7280" },
                  ]}
                />
                <Text
                  style={[
                    styles.chipText,
                    selectedCategoryId === cat.id && styles.chipTextSelected,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Payment method */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Payment method</Text>
          <View style={styles.chipRowWrap}>
            {PAYMENT_METHODS.map((pm) => (
              <TouchableOpacity
                key={pm}
                style={[
                  styles.chip,
                  paymentMethod === pm && styles.chipSelected,
                ]}
                onPress={() => setPaymentMethod(pm)}
              >
                <Text
                  style={[
                    styles.chipText,
                    paymentMethod === pm && styles.chipTextSelected,
                  ]}
                >
                  {pm}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Note</Text>
          <View style={styles.noteInputWrapper}>
            <TextInput
              style={styles.noteInput}
              value={note}
              onChangeText={setNote}
              placeholder="Add a short description (optional)"
              placeholderTextColor={colors.placeholder}
              multiline
            />
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving…" : "Save changes"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Date picker modal */}
      {showDatePicker && (
        <ModalDatePicker
          {...({
            visible: showDatePicker,
            initialDate: date ?? new Date(),
            onConfirm: (newDate: Date) => {
              setDate(newDate);
              setShowDatePicker(false);
            },
            onCancel: () => setShowDatePicker(false),
          } as any)}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  header: { marginBottom: 16 },
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { fontSize: 14, color: colors.textSecondary },

  section: { marginBottom: 20 },
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
    fontSize: 18,
    fontWeight: "600",
    color: colors.textSecondary,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
  },

  dateButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateButtonText: {
    fontSize: 14,
    color: colors.textPrimary,
  },

  chipRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  } as any,
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
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
  chipColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  chipText: { fontSize: 13, color: colors.textPrimary },
  chipTextSelected: { color: "#FFFFFF", fontWeight: "600" },

  noteInputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 80,
  },
  noteInput: {
    fontSize: 14,
    color: colors.textPrimary,
  },

  saveButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
});

export default EditExpenseScreen;
