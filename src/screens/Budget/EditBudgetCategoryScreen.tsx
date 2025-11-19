// src/screens/Budget/EditBudgetCategoryScreen.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { RootStackParamList } from "../../navigation/RootNavigator";
import colors from "../../lib/colors";

import { listCategories, updateCategory } from "../../services/categories";
import { getBudgetById, updateBudget } from "../../services/budgets";
import { Budget, Category } from "../../lib/types";

type Props = NativeStackScreenProps<
  RootStackParamList,
  "EditBudgetCategory"
>;

const COLOR_CHOICES = [
  "#F97316",
  "#EF4444",
  "#22C55E",
  "#0EA5E9",
  "#6366F1",
  "#EC4899",
  "#EAB308",
  "#14B8A6",
  "#8B5CF6",
  "#F97373",
  "#4ADE80",
  "#2DD4BF",
  "#38BDF8",
  "#A855F7",
  "#FACC15",
  "#FB923C",
  "#F973A5",
  "#6B7280",
  "#94A3B8",
  "#22C1C3",
  "#FF9A9E",
  "#FF6B6B",
  "#FFD93D",
  "#6EE7B7",
  "#3B82F6",
];

const EditBudgetCategoryScreen: React.FC<Props> = ({ route, navigation }) => {
  const { budgetId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [budget, setBudget] = useState<Budget | null>(null);
  const [category, setCategory] = useState<Category | null>(null);

  const [categoryName, setCategoryName] = useState("");
  const [categoryColor, setCategoryColor] = useState<string>("#F97316");
  const [limitAmount, setLimitAmount] = useState("");
  const [alertPercent, setAlertPercent] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const b = await getBudgetById(budgetId);
        if (!b) {
          Alert.alert("Not found", "Budget could not be found.");
          navigation.goBack();
          return;
        }

        const cats = await listCategories();
        const cat = cats.find((c) => c.id === b.categoryId) ?? null;

        setBudget(b);
        setCategory(cat ?? null);

        // Pre-fill from budget
        setLimitAmount(String(b.limitAmount ?? ""));
        setAlertPercent(
          b.alertThresholdPercent != null
            ? String(b.alertThresholdPercent)
            : ""
        );
        setIsActive(Boolean(b.isActive));

        // Pre-fill from category
        if (cat) {
          setCategoryName(cat.name);
          setCategoryColor(cat.colorHex ?? "#F97316");
        }
      } catch (e) {
        console.error("Failed to load budget/category", e);
        Alert.alert("Error", "Failed to load budget details.");
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [budgetId, navigation]);

  const handleSave = async () => {
    if (!budget || !category) return;
    if (saving) return;

    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      Alert.alert("Validation", "Category name cannot be empty.");
      return;
    }

    const numericLimit = parseFloat(limitAmount.replace(/[^0-9.]/g, ""));
    if (!numericLimit || numericLimit <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid monthly budget.");
      return;
    }

    const numericAlert = parseInt(alertPercent, 10);
    if (
      Number.isNaN(numericAlert) ||
      numericAlert < 1 ||
      numericAlert > 100
    ) {
      Alert.alert(
        "Invalid alert",
        "Alert percentage must be between 1 and 100."
      );
      return;
    }

    try {
      setSaving(true);

      // 1. Update category (name + color)
      await updateCategory(category.id, {
        name: trimmedName,
        colorHex: categoryColor,
      });

      // 2. Update budget (limit + alert + active flag)
      await updateBudget(budget.id, {
        limitAmount: numericLimit,
        alertThresholdPercent: numericAlert,
        isActive,
      });

      Alert.alert("Saved", "Budget and category updated.", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (e) {
      console.error("Failed to save budget/category", e);
      Alert.alert("Error", "Could not save your changes. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading budget…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!budget || !category) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.errorText}>
            Budget or category could not be loaded.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const parsedPreviewLimit = limitAmount
    ? Number(limitAmount.replace(/[^0-9.]/g, ""))
    : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Edit Budget & Category</Text>
          <Text style={styles.headerSubtitle}>
            Change category name, color and monthly budget.
          </Text>
        </View>

        {/* Category name */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category name</Text>
          <View style={styles.textInputWrapper}>
            <TextInput
              style={styles.textInput}
              value={categoryName}
              onChangeText={setCategoryName}
              placeholder="e.g. Groceries"
              placeholderTextColor={colors.placeholder}
            />
          </View>
        </View>

        {/* Category color */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category color</Text>
          <Text style={styles.sectionHint}>
            This color is used across the app for this category.
          </Text>
          <View style={styles.colorChipsRow}>
            {COLOR_CHOICES.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorChip,
                  { backgroundColor: c },
                  categoryColor === c && styles.colorChipSelected,
                ]}
                onPress={() => setCategoryColor(c)}
                activeOpacity={0.8}
              />
            ))}
          </View>
        </View>

        {/* Monthly allowance */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Monthly allowance</Text>
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

        {/* Alert percentage */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Alert percentage</Text>
          <Text style={styles.sectionHint}>
            We'll alert you when spending crosses this percentage.
          </Text>
          <View style={styles.textInputWrapper}>
            <TextInput
              style={styles.textInput}
              value={alertPercent}
              onChangeText={setAlertPercent}
              placeholder="e.g. 80"
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Status toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Budget status</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleChip,
                isActive && styles.toggleChipActive,
              ]}
              onPress={() => setIsActive(true)}
            >
              <Text
                style={[
                  styles.toggleText,
                  isActive && styles.toggleTextActive,
                ]}
              >
                Active
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleChip,
                !isActive && styles.toggleChipActive,
              ]}
              onPress={() => setIsActive(false)}
            >
              <Text
                style={[
                  styles.toggleText,
                  !isActive && styles.toggleTextActive,
                ]}
              >
                Inactive
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Preview card */}
        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <View
              style={[
                styles.previewColorDot,
                { backgroundColor: categoryColor },
              ]}
            />
            <View>
              <Text style={styles.previewTitle}>
                {categoryName.trim() || "Category"}
              </Text>
              <Text style={styles.previewSubtitle}>
                Budget ₹{parsedPreviewLimit.toLocaleString()} · Alert at{" "}
                {alertPercent || "—"}%
              </Text>
            </View>
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            saving && { opacity: 0.6 },
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving…" : "Save changes"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
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

  section: { marginBottom: 18 },
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

  textInputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  textInput: {
    fontSize: 14,
    color: colors.textPrimary,
  },

  colorChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    gap: 8,
  } as any,
  colorChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  colorChipSelected: {
    borderWidth: 2,
    borderColor: colors.primaryDark,
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

  toggleRow: { flexDirection: "row", gap: 8 },
  toggleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  toggleChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  toggleText: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  toggleTextActive: {
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

export default EditBudgetCategoryScreen;
