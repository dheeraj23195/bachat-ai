import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Vibration,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../lib/colors";
import { verifyPin, setPin } from "../../lib/pin";
import { useNavigation } from "@react-navigation/native";

const ChangePinScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const [error, setError] = useState("");

  const currentRef = useRef<TextInput | null>(null);
  const newRef = useRef<TextInput | null>(null);
  const confirmRef = useRef<TextInput | null>(null);

  // Validates current PIN
  const handleCheckCurrent = async () => {
    if (currentPin.length !== 6) return;

    const valid = await verifyPin(currentPin);

    if (!valid) {
      setError("Incorrect current PIN.");
      Vibration.vibrate(80);
      setCurrentPin("");
      currentRef.current?.clear();
      return;
    }

    // Move to new PIN screen
    setError("");
    setStep(2);
    setTimeout(() => newRef.current?.focus(), 200);
  };

  const handleSetNew = () => {
    if (newPin.length === 6) {
      setStep(3);
      setTimeout(() => confirmRef.current?.focus(), 200);
    }
  };

  const handleConfirm = async () => {
    if (confirmPin !== newPin) {
      setError("PINs do not match.");
      Vibration.vibrate(80);
      return;
    }

    await setPin(newPin);

    navigation.goBack();
  };

  const renderPinDots = (value: string, onPress: () => void) => (
    <TouchableOpacity style={styles.dotsRow} onPress={onPress} activeOpacity={0.8}>
      {Array.from({ length: 6 }).map((_, i) => {
        const filled = i < value.length;
        return (
          <View
            key={i}
            style={[styles.dot, filled && styles.dotFilled]}
          />
        );
      })}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrapper}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>

        {/* STEP 1 — ENTER CURRENT PIN */}
        {step === 1 && (
          <>
            <Text style={styles.title}>Enter Current PIN</Text>
            <Text style={styles.subtitle}>To change your PIN, verify your current PIN first.</Text>

            {renderPinDots(currentPin, () => currentRef.current?.focus())}

            <TextInput
              ref={currentRef}
              style={styles.hiddenInput}
              keyboardType="number-pad"
              maxLength={6}
              value={currentPin}
              onChangeText={(val) => {
                setCurrentPin(val.replace(/[^0-9]/g, ""));
                setError("");
              }}
              onSubmitEditing={handleCheckCurrent}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.primaryButton, currentPin.length !== 6 && { opacity: 0.5 }]}
              disabled={currentPin.length !== 6}
              onPress={handleCheckCurrent}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </>
        )}

        {/* STEP 2 — ENTER NEW PIN */}
        {step === 2 && (
          <>
            <Text style={styles.title}>Create New PIN</Text>
            <Text style={styles.subtitle}>Enter a new 6-digit PIN</Text>

            {renderPinDots(newPin, () => newRef.current?.focus())}

            <TextInput
              ref={newRef}
              style={styles.hiddenInput}
              keyboardType="number-pad"
              maxLength={6}
              value={newPin}
              onChangeText={(val) => {
                setNewPin(val.replace(/[^0-9]/g, ""));
                setError("");
              }}
              onSubmitEditing={handleSetNew}
            />

            <TouchableOpacity
              style={[styles.primaryButton, newPin.length !== 6 && { opacity: 0.5 }]}
              disabled={newPin.length !== 6}
              onPress={handleSetNew}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </>
        )}

        {/* STEP 3 — CONFIRM NEW PIN */}
        {step === 3 && (
          <>
            <Text style={styles.title}>Confirm New PIN</Text>
            <Text style={styles.subtitle}>Re-enter your new PIN</Text>

            {renderPinDots(confirmPin, () => confirmRef.current?.focus())}

            <TextInput
              ref={confirmRef}
              style={styles.hiddenInput}
              keyboardType="number-pad"
              maxLength={6}
              value={confirmPin}
              onChangeText={(val) => {
                setConfirmPin(val.replace(/[^0-9]/g, ""));
                setError("");
              }}
              onSubmitEditing={handleConfirm}
            />

            <TouchableOpacity
              style={[styles.primaryButton, confirmPin.length !== 6 && { opacity: 0.5 }]}
              disabled={confirmPin.length !== 6}
              onPress={handleConfirm}
            >
              <Text style={styles.primaryButtonText}>Save PIN</Text>
            </TouchableOpacity>
          </>
        )}

        {error.length > 0 && <Text style={styles.error}>{error}</Text>}
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
  dotsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    marginBottom: 24,
    marginTop: 8,
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
  primaryButton: {
    marginTop: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  error: {
    marginTop: 16,
    textAlign: "center",
    fontSize: 13,
    color: "#DC2626",
  },
});

export default ChangePinScreen;
