import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../lib/colors";
import { useNavigation } from "@react-navigation/native";
import { setPin } from "../../lib/pin";
import { signInWithEmail, getCurrentUser } from "../../services/supabaseClient";

const ForgotPinScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Pre-fill email from current Supabase user if available
    (async () => {
      try {
        const user = await getCurrentUser();
        if (user?.email) {
          setEmail(user.email);
        }
      } catch (e) {
        // Ignore
      }
    })();
  }, []);

  const handleResetPin = async () => {
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (newPin.length !== 6 || confirmPin.length !== 6) {
      setError("PIN must be exactly 6 digits.");
      return;
    }

    if (newPin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();

      // Verify email + password with Supabase
      const user = await signInWithEmail(trimmedEmail, password);
      if (!user) {
        throw new Error("Invalid email or password.");
      }

      // If auth succeeds, set new PIN
      await setPin(newPin);

      navigation.goBack();
    } catch (err: any) {
      setError(err?.message ?? "Failed to reset PIN. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrapper}>
        {/* Header */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Reset PIN</Text>
        <Text style={styles.subtitle}>
          Verify your account password and set a new PIN.
        </Text>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={styles.input}
            />
          </View>
        </View>

        {/* Password */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Account Password</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={colors.placeholder}
              secureTextEntry
              style={styles.input}
            />
          </View>
        </View>

        {/* New PIN */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>New 6-digit PIN</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              value={newPin}
              onChangeText={(val) =>
                setNewPin(val.replace(/[^0-9]/g, "").slice(0, 6))
              }
              placeholder="••••••"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
              secureTextEntry
              style={styles.input}
              maxLength={6}
            />
          </View>
        </View>

        {/* Confirm PIN */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Confirm new PIN</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              value={confirmPin}
              onChangeText={(val) =>
                setConfirmPin(val.replace(/[^0-9]/g, "").slice(0, 6))
              }
              placeholder="••••••"
              placeholderTextColor={colors.placeholder}
              keyboardType="number-pad"
              secureTextEntry
              style={styles.input}
              maxLength={6}
            />
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.primaryButton, loading && { opacity: 0.6 }]}
          onPress={handleResetPin}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Reset PIN</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  wrapper: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  backIcon: {
    fontSize: 26,
    color: colors.textPrimary,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  error: {
    marginTop: 8,
    fontSize: 13,
    color: "#DC2626",
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default ForgotPinScreen;
