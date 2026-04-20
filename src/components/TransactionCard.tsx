import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { format, parseISO } from "date-fns";
import colors from "../lib/colors";
import { Transaction, Category } from "../lib/types";

interface Props {
  transaction: Transaction;
  category: Category | null;
  onDelete: () => void;
  onEdit: () => void;
}

const TransactionCard: React.FC<Props> = ({
  transaction,
  category,
  onDelete,
  onEdit,
}) => {
  let formattedDate = transaction.date;
  try {
    const d = parseISO(transaction.date);
    formattedDate = format(d, "dd MMM yyyy");
  } catch {
    // keep raw date string
  }

  const amountText = `₹${transaction.amount.toLocaleString()}`;
  const isRecurring = transaction.isRecurring;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onLongPress={onEdit}
    >
      <View style={styles.topRow}>
        <View style={styles.left}>
          <View
            style={[
              styles.colorDot,
              { backgroundColor: category?.colorHex ?? "#9ca3af" },
            ]}
          />

          <View style={styles.textBlock}>
            <View style={styles.categoryRow}>
              <Text style={styles.categoryName}>
                {category?.name ?? "Uncategorized"}
              </Text>

              {isRecurring && (
                <View style={styles.recurringPill}>
                  <Text style={styles.recurringIcon}>⟳</Text>
                  <Text style={styles.recurringText}>Recurring</Text>
                </View>
              )}
            </View>

            {transaction.encryptedNote ? (
              <Text style={styles.noteText} numberOfLines={1}>
                {sentenceCase(transaction.encryptedNote)}
              </Text>
            ) : (
              <Text style={styles.notePlaceholder}>No note added</Text>
            )}
          </View>
        </View>

        <View style={styles.right}>
          <Text style={styles.amount}>{amountText}</Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

function sentenceCase(str: string): string {
  const trimmed = str.trim();
  if (!trimmed) return trimmed;
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: 14,
    marginBottom: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  left: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 10,
    marginTop: 3,
  },
  textBlock: {
    flex: 1,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginRight: 6,
  },
  recurringPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
  },
  recurringIcon: {
    fontSize: 11,
    marginRight: 3,
  },
  recurringText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  noteText: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  notePlaceholder: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
    opacity: 0.7,
    fontStyle: "italic",
  },
  right: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ef4444",
  },
  date: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  bottomRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#FEE2E2",
  },
  deleteText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#b91c1c",
  },
});

export default TransactionCard;
