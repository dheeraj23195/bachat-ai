// src/screens/Categories/CategoryManagementScreen.tsx

import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import colors from "../../lib/colors";
import { Category } from "../../lib/types";
import {
  listCategories,
  getCategoryUsage,
  deleteCategory,
  CategoryInUseError,
} from "../../services/categories";

type CategoryWithUsage = Category & {
  transactionCount: number;
  budgetCount: number;
};

const CategoryManagementScreen: React.FC = () => {
  const [categories, setCategories] = useState<CategoryWithUsage[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const baseCats = await listCategories();

      const withUsage: CategoryWithUsage[] = await Promise.all(
        baseCats.map(async (cat) => {
          const usage = await getCategoryUsage(cat.id);
          return {
            ...cat,
            transactionCount: usage.transactionCount,
            budgetCount: usage.budgetCount,
          };
        })
      );

      // Simple sort by name only (no default/custom distinction anymore)
      withUsage.sort((a, b) => a.name.localeCompare(b.name));

      setCategories(withUsage);
    } catch (e) {
      console.error("Failed to load categories for management", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleConfirmDelete = (cat: CategoryWithUsage) => {
    Alert.alert(
      "Delete category?",
      `“${cat.name}” will be removed. This is only allowed if it isn't used in any expenses or budgets.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCategory(cat.id);
              await load();
            } catch (err) {
              if (err instanceof CategoryInUseError) {
                Alert.alert(
                  "Cannot delete",
                  `This category is currently used in ${err.transactionCount} expenses or ${err.budgetCount} budgets.`
                );
              } else {
                console.error("Delete category failed", err);
                Alert.alert("Error", "Could not delete this category.");
              }
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: CategoryWithUsage }) => {
    const { name, colorHex, transactionCount, budgetCount } = item;

    const isUsed = transactionCount > 0 || budgetCount > 0;

    let usageLabel = "Not used yet";
    if (isUsed) {
      const parts: string[] = [];
      if (transactionCount > 0) {
        parts.push(
          `${transactionCount} expense${transactionCount === 1 ? "" : "s"}`
        );
      }
      if (budgetCount > 0) {
        parts.push(
          `${budgetCount} budget${budgetCount === 1 ? "" : "s"}`
        );
      }
      usageLabel = parts.join(" · ");
    }

    return (
      <View style={styles.row}>
        <View style={styles.left}>
          <View
            style={[
              styles.colorDot,
              { backgroundColor: colorHex ?? "#9CA3AF" },
            ]}
          />
          <View>
            <Text style={styles.name}>{name}</Text>
            <Text style={styles.metaText}>{usageLabel}</Text>
          </View>
        </View>

        {isUsed ? (
          <View style={[styles.pill, styles.pillMuted]}>
            <Text style={styles.pillTextMuted}>In use</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.pill, styles.pillDanger]}
            onPress={() => handleConfirmDelete(item)}
          >
            <Text style={styles.pillTextDanger}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.headerTitle}>Manage categories</Text>
        <Text style={styles.headerSubtitle}>
          Delete unused categories. Categories in use are protected.
        </Text>

        {loading ? (
          <Text style={styles.infoText}>Loading…</Text>
        ) : (
          <FlatList
            data={categories}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
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
  infoText: {
    marginTop: 16,
    fontSize: 13,
    color: colors.textSecondary,
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 10,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillMuted: {
    backgroundColor: "#F3F4F6",
  },
  pillTextMuted: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  pillDanger: {
    backgroundColor: "#FEE2E2",
  },
  pillTextDanger: {
    fontSize: 12,
    color: "#B91C1C",
    fontWeight: "600",
  },
});

export default CategoryManagementScreen;
