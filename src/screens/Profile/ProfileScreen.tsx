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
import colors from "../../lib/colors";
import { useNavigation } from '@react-navigation/native';


const ProfileScreen: React.FC = () => {
  const [name, setName] = useState("Adarsh Bhatt");
  const [email, setEmail] = useState("you@example.com");
  const [currency, setCurrency] = useState("INR");
  const [theme, setTheme] = useState("light");
  const navigation = useNavigation();
  const handleBack = () => navigation.goBack();
  const handleSave = () => {
    // later: save profile to local storage / encryption
    console.log({ name, email, currency, theme });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backIcon}>{"‹"}</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {name ? name.charAt(0).toUpperCase() : "A"}
            </Text>
          </View>
          <Text style={styles.avatarLabel}>Tap to change (coming soon)</Text>
        </View>

        {/* Basic details card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Info</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.placeholder}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={colors.placeholder}
            keyboardType="email-address"
          />
        </View>

        {/* Preferences card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preferences</Text>

          <Text style={styles.label}>Currency</Text>
          <View style={styles.pillRow}>
            <Pill
              label="INR"
              selected={currency === "INR"}
              onPress={() => setCurrency("INR")}
            />
            <Pill
              label="USD"
              selected={currency === "USD"}
              onPress={() => setCurrency("USD")}
            />
            <Pill
              label="EUR"
              selected={currency === "EUR"}
              onPress={() => setCurrency("EUR")}
            />
          </View>

          <Text style={styles.label}>Theme</Text>
          <View style={styles.pillRow}>
            <Pill
              label="Light"
              selected={theme === "light"}
              onPress={() => setTheme("light")}
            />
            <Pill
              label="Dark"
              selected={theme === "dark"}
              onPress={() => setTheme("dark")}
            />
            <Pill
              label="System"
              selected={theme === "system"}
              onPress={() => setTheme("system")}
            />
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={styles.saveButton}
          activeOpacity={0.85}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

type PillProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

const Pill: React.FC<PillProps> = ({ label, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.pill, selected && styles.pillSelected]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
      {label}
    </Text>
  </TouchableOpacity>
);

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
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  backIcon: {
    fontSize: 26,
    color: colors.textPrimary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  avatarWrapper: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primarySoft,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.primary,
  },
  avatarLabel: {
    marginTop: 6,
    fontSize: 12,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 14,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
    marginBottom: 8,
  },
  pillSelected: {
    backgroundColor: colors.primary,
  },
  pillText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  pillTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

export default ProfileScreen;
