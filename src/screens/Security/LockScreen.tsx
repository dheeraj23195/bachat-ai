import React, { useState, useRef, useEffect} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Vibration,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../lib/colors";
import { verifyPin } from "../../lib/pin";
import { useNavigation } from "@react-navigation/native";
import { authenticateBiometric, isBiometricSupported, getBiometricEnabled } from "../../lib/biometric";


const LockScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const pinInputRef = useRef<TextInput | null>(null);
  const [biometricVisible, setBiometricVisible] = useState(false);

  useEffect(() => {
  (async () => {
      const supported = await isBiometricSupported();
      const enabled = await getBiometricEnabled();

      if (supported && enabled) {
      setBiometricVisible(true);
      }
  })();
  }, []);


  const handlePinChange = async (value: string) => {
    const digits = value.replace(/[^0-9]/g, "");
    if (digits.length > 6) return;

    setPin(digits);

    // When 6 digits entered → verify
    if (digits.length === 6) {
      const valid = await verifyPin(digits);

      if (valid) {
        setError("");
        // Unlock → go to app
        navigation.reset({
          index: 0,
          routes: [{ name: "AppTabs" }],
        });
      } else {
        // Error feedback
        setError("Incorrect PIN. Try again.");
        Vibration.vibrate(100);
        setPin("");

        // Clear input and refocus
        setTimeout(() => {
          pinInputRef.current?.clear();
          pinInputRef.current?.focus();
        }, 100);
      }
    }
  };
  const handleBiometricUnlock = async () => {
    const ok = await authenticateBiometric();
    if (ok) {
      navigation.reset({
        index: 0,
        routes: [{ name: "AppTabs" }],
      });
    } else {
      Vibration.vibrate(80);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrapper}>
        {/* Title */}
        <Text style={styles.title}>Enter PIN</Text>
        <Text style={styles.subtitle}>
          Unlock Bachat AI to continue
        </Text>

        {/* PIN Dots */}
        <TouchableOpacity
          style={styles.pinRow}
          activeOpacity={0.8}
          onPress={() => pinInputRef.current?.focus()}
        >
          {Array.from({ length: 6 }).map((_, idx) => {
            const filled = idx < pin.length;
            return (
              <View
                key={idx}
                style={[
                  styles.dot,
                  filled && styles.dotFilled,
                ]}
              />
            );
          })}
        </TouchableOpacity>

        {/* Hidden input */}
        <TextInput
          ref={pinInputRef}
          onChangeText={handlePinChange}
          keyboardType="number-pad"
          maxLength={6}
          style={styles.hiddenInput}
          autoFocus={true}
        />

        {/* Error message */}
        {error.length > 0 && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        {/* Biometric unlock placeholder */}
        {biometricVisible && (
          <TouchableOpacity
            style={styles.bioButton}
            onPress={handleBiometricUnlock}
            activeOpacity={0.8}
          >
            <Text style={styles.bioText}>🔓 Unlock with Biometrics</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const DOT_SIZE = 20;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  wrapper: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 32,
  },
  pinRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginBottom: 16,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.border,
  },
  dotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
  },
  errorText: {
    textAlign: "center",
    color: "#DC2626",
    marginTop: 8,
    fontSize: 13,
  },
  bioButton: {
    marginTop: 24,
    alignSelf: "center",
    opacity: 0.4,
  },
  bioText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default LockScreen;
