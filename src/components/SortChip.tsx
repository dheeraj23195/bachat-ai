import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import colors from "../lib/colors";

interface Props {
  label: string;
  active: boolean;
  onPress: () => void;
}

const SortChip: React.FC<Props> = ({ label, active, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.activeChip]}
      onPress={onPress}
    >
      <Text style={[styles.text, active && styles.activeText]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
    marginBottom: 6,
  },
  activeChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  text: { fontSize: 12, color: colors.textPrimary },
  activeText: { color: "#fff", fontWeight: "600" },
});

export default SortChip;
