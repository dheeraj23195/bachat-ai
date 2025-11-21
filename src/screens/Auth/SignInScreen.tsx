// src/screens/Auth/SignInScreen.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import colors from "../../lib/colors";
import { signInWithEmail } from "../../services/supabaseClient";
import { clearEncryptionSecret } from "../../lib/authSecret"; // For logout in future
import {
  downloadAndRestoreBackup,
  clearCloudBackup,
} from "../../services/cloudSync";
import { saveEncryptionSecret } from "../../lib/authSecret";
import { hasPin } from "../../lib/pin";
import { getDb } from "../../services/db";

type Props = NativeStackScreenProps<RootStackParamList, "SignIn">;

// Check whether this device already has any local data
async function hasAnyLocalData(): Promise<boolean> {
  try {
    const db = await getDb();

    const tx = await db.getFirstAsync<{ c: number }>(
      "SELECT COUNT(*) as c FROM transactions;"
    );
    const bud = await db.getFirstAsync<{ c: number }>(
      "SELECT COUNT(*) as c FROM budgets;"
    );

    return (tx?.c ?? 0) > 0 || (bud?.c ?? 0) > 0;
  } catch (e) {
    console.warn("[Auth] Failed to check local data, assuming empty", e);
    return false;
  }
}

const SignInScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSignIn = async () => {
    if (submitting) return;

    const trimmedEmail = email.trim().toLowerCase();
    setErrorMessage(null);

    if (!trimmedEmail || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    try {
      setSubmitting(true);

      const user = await signInWithEmail(trimmedEmail, password);
      if (!user) {
        throw new Error("Sign-in failed. Please check your credentials.");
      }

      // Save encryption secret (password) locally
      await saveEncryptionSecret(password);

      // Check if this device already has local data
      const hasData = await hasAnyLocalData();

      if (!hasData) {
        // Fresh device / wiped DB → restore from cloud if available
        try {
          await downloadAndRestoreBackup();
          console.log("[Auth] Cloud restore complete");
          Alert.alert("Synced", "Your data has been restored from the cloud.");
        } catch (restoreErr: any) {
          console.warn(
            "[Auth] Cloud restore failed or no backup:",
            restoreErr?.message
          );
          // Optional: wipe old backup if decrypt failed due to password reset
          try {
            await clearCloudBackup();
          } catch (wipeErr) {
            console.warn("[Auth] Failed to wipe cloud backup:", wipeErr);
          }
        }
      } else {
        console.log(
          "[Auth] Local DB already has data, skipping cloud restore on sign-in."
        );
      }

      const hasExistingPin = await hasPin();

      navigation.reset({
        index: 0,
        routes: [{ name: hasExistingPin ? "Lock" : "AppTabs" }],
      });

    } catch (err: any) {
      console.error("SignIn error", err);
      setErrorMessage(err?.message ?? "Failed to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const goToSignUp = () => {
    navigation.navigate("SignUp");
  };

  const handleForgotPassword = () => {
    Alert.alert(
      "Not implemented yet",
      "Password reset via email can be added later via Supabase auth."
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* Custom header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backIcon}>{"‹"}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Sign In to Bachat AI</Text>
      <Text style={styles.subtitle}>
        Access your secure, privacy-first budgeting account
      </Text>

      {/* Info card */}
      <View style={styles.infoCard}>
        <View style={styles.infoIconCircle}>
          <Text style={styles.infoIcon}>🔒</Text>
        </View>
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoTitle}>Secure authentication</Text>
          <Text style={styles.infoSubtitle}>
            Your data is encrypted with local storage
          </Text>
        </View>
      </View>

      {/* Form */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Email Address</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Password</Text>
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor={colors.placeholder}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>
      </View>

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.primaryButton, submitting && { opacity: 0.6 }]}
        activeOpacity={0.8}
        onPress={handleSignIn}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>Sign In</Text>
        )}
      </TouchableOpacity>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Don&apos;t have an account? </Text>
        <TouchableOpacity onPress={goToSignUp}>
          <Text style={styles.footerLink}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: {
    fontSize: 26,
    color: colors.textPrimary,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  infoCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#E9F7EE",
    flexDirection: "row",
    alignItems: "center",
  },
  infoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoIcon: {
    fontSize: 18,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  infoSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  formGroup: {
    marginTop: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  input: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  linkText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "500",
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    color: "#EF4444",
  },
  primaryButton: {
    marginTop: 24,
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  footerRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "600",
  },
});

export default SignInScreen;
