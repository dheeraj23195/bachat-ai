import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../lib/colors";
import { useNavigation } from "@react-navigation/native";

const USER_GUIDE_URL = ""; // TODO: plug in your Google Drive link here

const AboutScreen: React.FC = () => {
  const navigation = useNavigation();

  const handleBack = () => {
    navigation.goBack();
  };

  const handleOpenUserGuide = async () => {
    if (!USER_GUIDE_URL) {
      Alert.alert(
        "Coming soon",
        "User guide PDF link will be added here in a future update."
      );
      return;
    }

    try {
      const supported = await Linking.canOpenURL(USER_GUIDE_URL);
      if (!supported) {
        Alert.alert(
          "Cannot open link",
          "Your device cannot open this user guide link."
        );
        return;
      }
      await Linking.openURL(USER_GUIDE_URL);
    } catch (e) {
      Alert.alert("Error", "Something went wrong while opening the link.");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backIcon}>{"‹"}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>About Bachat AI</Text>
        </View>

        {/* App blurb */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What is Bachat AI?</Text>
          <Text style={styles.bodyText}>
            Bachat AI is a local-first, privacy-focused personal finance app.
            Your expenses, budgets, and insights stay on your device, with an
            optional end-to-end encrypted cloud backup for multi-device access.
          </Text>
          <Text style={[styles.bodyText, { marginTop: 8 }]}>
            No plaintext financial data ever leaves your phone.
          </Text>
        </View>

        {/* Team section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Team – Team FungUsS</Text>
          <View style={styles.teamList}>
            <Text style={styles.teamItem}>• Dheeraj Arora (2023195)</Text>
            <Text style={styles.teamItem}>• Yash Goel (2023606)</Text>
            <Text style={styles.teamItem}>• Adarsh Bhatt (2023033)</Text>
            <Text style={styles.teamItem}>• Nakul Verma (2023337)</Text>
            <Text style={styles.teamItem}>• Saksham Wadhera (2023473)</Text>
          </View>
        </View>

        {/* User guide */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>User Guide</Text>
          <Text style={styles.bodyText}>
            Want a detailed walkthrough of how to use Bachat AI? Open the user
            guide PDF for step-by-step instructions, examples, and tips.
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={handleOpenUserGuide}
          >
            <Text style={styles.primaryButtonText}>Open user guide (PDF)</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Version 1.0 · Built with React Native, SQLite & Supabase
          </Text>
          <Text style={styles.footerTextSecondary}>
            Local-first · End-to-end encrypted backups
          </Text>
        </View>
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
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
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
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  teamList: {
    marginTop: 6,
  },
  teamItem: {
    fontSize: 13,
    color: colors.textPrimary,
    marginTop: 4,
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  footer: {
    marginTop: 8,
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  footerTextSecondary: {
    marginTop: 2,
    fontSize: 11,
    color: colors.textSecondary,
  },
});

export default AboutScreen;
