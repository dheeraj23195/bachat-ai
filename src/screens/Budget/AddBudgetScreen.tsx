import React, { useState } from "react";
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

import { RootStackParamList } from "../../navigation/RootNavigator";
import colors from "../../lib/colors";
import { createBudget, listBudgets } from "../../services/budgets";
import { CurrencyCode } from "../../lib/types";

type Props = NativeStackScreenProps<RootStackParamList, "AddBudget">;

const CATEGORY_OPTIONS = [
  { id: "food", label: "Food & Dining", color: "#F97316" },
  { id: "transport", label: "Transport", color: "#6366F1" },
  { id: "shopping", label: "Shopping", color: "#EC4899" },
  { id: "subscriptions", label: "Subscriptions", color: "#A855F7" },
  { id: "bills", label: "Bills & Utilities", color: "#22C55E" },
  { id: "other", label: "Other (custom)", color: "#6B7280" },
];

const ALERT_THRESHOLDS = [70, 80, 90, 100];

const AddBudgetScreen: React.FC<Props> = ({ navigation }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("food");
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [limitAmount, setLimitAmount] = useState("");
  const [alertThreshold, setAlertThreshold] = useState<number>(80);
  const [isSaving, setIsSaving] = useState(false);

  const currency: CurrencyCode = "INR";

  const handleSave = async () => {
    if (isSaving) return;

    // Validate amount
    const numericLimit = parseFloat(limitAmount.replace(/[^0-9.]/g, ""));
    if (!numericLimit || numericLimit <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid monthly budget.");
      return;
    }

    if (!selectedCategoryId) {
      Alert.alert(
        "Choose a category",
        "Please select a category for this budget."
      );
      return;
    }

    // Resolve categoryId to save
    let categoryIdToSave = selectedCategoryId;
    if (selectedCategoryId === "other") {
      const trimmed = customCategoryName.trim();
      if (!trimmed) {
        Alert.alert(
          "Custom category required",
          "Please type a name for your custom category."
        );
        return;
      }
      categoryIdToSave = trimmed; // store user-defined name as categoryId
    }

    // Duplicate check (case-insensitive)
    try {
      const existingBudgets = await listBudgets();
      const target = categoryIdToSave.toLowerCase();

      const exists = existingBudgets.some((b) => {
        if (!b.categoryId) return false;
        return b.categoryId.toLowerCase() === target;
      });

      if (exists) {
        Alert.alert(
          "Budget already exists",
          "You already have a budget for this category. Edit or delete that budget instead of creating a duplicate."
        );
        return;
      }
    } catch (e) {
      console.error("Failed to check existing budgets", e);
      // We still allow save if duplicate check fails, to avoid blocking user
    }

    // Create budget
    try {
      setIsSaving(true);

      await createBudget({
        categoryId: categoryIdToSave,
        period: "monthly",
        periodStartDay: 1,
        limitAmount: numericLimit,
        currency,
        alertThresholdPercent: alertThreshold,
        isActive: true,
      });

      navigation.goBack();
    } catch (e) {
      console.error("Failed to create budget", e);
      Alert.alert(
        "Error",
        "Something went wrong while saving your budget. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCategory = CATEGORY_OPTIONS.find(
    (c) => c.id === selectedCategoryId
  );

  const previewName =
    selectedCategoryId === "other" && customCategoryName.trim()
      ? customCategoryName.trim()
      : selectedCategory?.label;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Add Budget</Text>
          <Text style={styles.headerSubtitle}>
            Set a monthly limit for a category
          </Text>
        </View>

        {/* Category selection with colors */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.chipRowWrap}>
            {CATEGORY_OPTIONS.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.chip,
                  selectedCategoryId === cat.id && styles.chipSelected,
                ]}
                onPress={() => setSelectedCategoryId(cat.id)}
                activeOpacity={0.8}
              >
                <View
                  style={[styles.chipColorDot, { backgroundColor: cat.color }]}
                />
                <Text
                  style={[
                    styles.chipText,
                    selectedCategoryId === cat.id && styles.chipTextSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom category name when "Other" is selected */}
          {selectedCategoryId === "other" && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.sectionHint}>
                Type a custom name for this category (e.g. &quot;Gym&quot;,
                &quot;Pet Care&quot;).
              </Text>
              <View style={styles.customCategoryInputWrapper}>
                <TextInput
                  style={styles.customCategoryInput}
                  value={customCategoryName}
                  onChangeText={setCustomCategoryName}
                  placeholder="Custom category name"
                  placeholderTextColor={colors.placeholder}
                />
              </View>
            </View>
          )}
        </View>

        {/* Limit amount */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Monthly limit</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={limitAmount}
              onChangeText={setLimitAmount}
              placeholder="0"
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Alert threshold */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Alert threshold</Text>
          <Text style={styles.sectionHint}>
            We&apos;ll remind you when your spend crosses this percentage of the
            budget.
          </Text>
          <View style={styles.thresholdRow}>
            {ALERT_THRESHOLDS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.thresholdChip,
                  alertThreshold === t && styles.thresholdChipSelected,
                ]}
                onPress={() => setAlertThreshold(t)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.thresholdText,
                    alertThreshold === t && styles.thresholdTextSelected,
                  ]}
                >
                  {t}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preview */}
        {previewName && (
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View
                style={[
                  styles.previewColorDot,
                  {
                    backgroundColor: selectedCategory?.color ?? colors.primary,
                  },
                ]}
              />
              <View>
                <Text style={styles.previewTitle}>{previewName}</Text>
                <Text style={styles.previewSubtitle}>
                  Budget ₹
                  {limitAmount
                    ? Number(
                        limitAmount.replace(/[^0-9.]/g, "")
                      ).toLocaleString()
                    : "0"}
                  {" · "}
                  Alert at {alertThreshold}% usage
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Save button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? "Saving…" : "Save Budget"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
    marginBottom: 16,
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
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
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
  chipText: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  chipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  customCategoryInputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  customCategoryInput: {
    fontSize: 14,
    color: colors.textPrimary,
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
  thresholdRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  thresholdChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 8,
    marginBottom: 8,
  },
  thresholdChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  thresholdText: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  thresholdTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  previewCard: {
    marginTop: 4,
    marginBottom: 20,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  previewColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  previewSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
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

export default AddBudgetScreen;
