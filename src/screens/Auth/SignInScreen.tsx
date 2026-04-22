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
import { Lock } from "lucide-react-native";
import { hasPin } from "../../lib/pin";
import { getDb } from "../../services/db";
import Toast from "react-native-toast-message";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Please enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

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
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (errors.email) {
      const parsed = signInSchema.shape.email.safeParse(text);
      if (parsed.success) setErrors((prev) => ({ ...prev, email: "" }));
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (errors.password) {
      const parsed = signInSchema.shape.password.safeParse(text);
      if (parsed.success) setErrors((prev) => ({ ...prev, password: "" }));
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSignIn = async () => {
    if (submitting) return;

    const parsedData = signInSchema.safeParse({ email, password });
    if (!parsedData.success) {
      const newErrs: Record<string, string> = {};
      parsedData.error.issues.forEach((iss) => {
        newErrs[iss.path[0]] = iss.message;
      });
      setErrors(newErrs);
      return;
    }

    const { email: trimmedEmail, password: validPassword } = parsedData.data;

    try {
      setSubmitting(true);

      const user = await signInWithEmail(trimmedEmail, validPassword);
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
          Toast.show({
            type: "success",
            text1: "Synced",
            text2: "Your data has been restored from the cloud.",
          });
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
      Toast.show({
        type: "error",
        text1: "Failed to sign in",
        text2: err?.message ?? "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const goToSignUp = () => {
    navigation.navigate("SignUp");
  };

  const handleForgotPassword = () => {
    Toast.show({
      type: "info",
      text1: "Coming soon",
      text2: "Password reset via email will be added later.",
    });
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
          <Lock size={30} color="#FFFFFF" strokeWidth={2.5} />
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
            onChangeText={handleEmailChange}
          />
        </View>
        {errors.email ? <Text style={styles.errorTextInline}>{errors.email}</Text> : null}
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
            onChangeText={handlePasswordChange}
          />
        </View>
        {errors.password ? <Text style={styles.errorTextInline}>{errors.password}</Text> : null}
      </View>

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
    backgroundColor: "#E9F7EE",
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
  errorTextInline: {
    marginTop: 6,
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
