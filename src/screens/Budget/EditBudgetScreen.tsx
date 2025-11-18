import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { RootStackParamList } from "../../navigation/RootNavigator";
import colors from "../../lib/colors";
import { getBudgetById, updateBudget } from "../../services/budgets";
import { Budget } from "../../lib/types";

type Props = NativeStackScreenProps<RootStackParamList, "EditBudget">;

const EditBudgetScreen: React.FC<Props> = ({ route, navigation }) => {
  const { budgetId } = route.params;
  const [budget, setBudget] = useState<Budget | null>(null);
  const [limitAmount, setLimitAmount] = useState("");
  const [alertThreshold, setAlertThreshold] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const b = await getBudgetById(budgetId);
        if (!b) {
          Alert.alert("Not found", "Budget could not be found.");
          navigation.goBack();
          return;
        }
        setBudget(b);
        setLimitAmount(String(b.limitAmount));
        setAlertThreshold(String(b.alertThresholdPercent));
      } catch (e) {
        console.error("Failed to load budget", e);
        Alert.alert("Error", "Could not load this budget.");
        navigation.goBack();
      }
    };
    load();
  }, [budgetId, navigation]);

  const handleSave = async () => {
    if (!budget || saving) return;

    const numericLimit = parseFloat(limitAmount.replace(/[^0-9.]/g, ""));
    const numericAlert = parseFloat(alertThreshold.replace(/[^0-9.]/g, ""));

    if (!numericLimit || numericLimit <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid budget limit.");
      return;
    }

    if (Number.isNaN(numericAlert) || numericAlert < 0 || numericAlert > 100) {
      Alert.alert(
        "Invalid alert",
        "Alert threshold must be between 0 and 100."
      );
      return;
    }

    try {
      setSaving(true);
      await updateBudget(budget.id, {
        limitAmount: numericLimit,
        alertThresholdPercent: numericAlert,
      });
      navigation.goBack();
    } catch (e) {
      console.error("Failed to update budget", e);
      Alert.alert("Error", "Something went wrong while saving your changes.");
    } finally {
      setSaving(false);
    }
  };

  if (!budget) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.loadingText}>Loading budget…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const categoryLabel = budget.categoryId ?? "Overall";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Edit Budget</Text>
          <Text style={styles.headerSubtitle}>{categoryLabel} • Monthly</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Monthly limit</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={limitAmount}
              onChangeText={setLimitAmount}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Alert threshold (%)</Text>
          <View style={styles.amountRow}>
            <TextInput
              style={styles.amountInput}
              value={alertThreshold}
              onChangeText={setAlertThreshold}
              keyboardType="numeric"
              placeholder="e.g. 80"
              placeholderTextColor={colors.placeholder}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving…" : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 14,
    color: colors.textSecondary,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
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
    fontSize: 16,
    fontWeight: "500",
    color: colors.textPrimary,
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

export default EditBudgetScreen;
