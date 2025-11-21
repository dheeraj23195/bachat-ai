import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../lib/colors";
import { useNavigation } from "@react-navigation/native";
import { setPin as setStoredPin } from "../../lib/pin";
import { setBiometricEnabled as setBiometricEnabledDB } from "../../lib/biometric";
import { getDb } from "../../services/db";
import { v4 as uuidv4 } from "uuid";

type Category = {
  id: string;
  name: string;
  emoji: string;
  color: string;
};

const BASE_CATEGORIES: Category[] = [
  { id: "food", name: "Food & Dining", emoji: "🍽️", color: "#F97373" },
  { id: "transport", name: "Transport", emoji: "🚗", color: "#FBBF24" },
  { id: "shopping", name: "Shopping", emoji: "🛍️", color: "#A855F7" },
  { id: "entertainment", name: "Entertainment", emoji: "📺", color: "#FB7185" },
  { id: "bills", name: "Bills & Utilities", emoji: "📄", color: "#60A5FA" },
  { id: "health", name: "Health & Fitness", emoji: "💚", color: "#22C55E" },
  { id: "education", name: "Education", emoji: "🎓", color: "#6366F1" },
];

// Save categories chosen during onboarding
async function saveOnboardingCategories(
  selectedCategoryIds: string[],
  categories: Category[],
  customCategoryName: string
) {
  const db = await getDb();
  const now = new Date().toISOString();

  const selected = categories.filter((c) => selectedCategoryIds.includes(c.id));

  const trimmedCustom = customCategoryName.trim();
  if (trimmedCustom.length > 0) {
    selected.push({
      id: uuidv4(),
      name: trimmedCustom,
      emoji: "🏷️",
      color: "#64748B",
    });
  }

  await db.execAsync("BEGIN TRANSACTION;");
  try {
    // For fresh onboarding we can wipe and insert only the user's categories
    await db.execAsync("DELETE FROM categories;");

    for (const cat of selected) {
      await db.runAsync(
        `
        INSERT INTO categories (
          id,
          name,
          icon,
          color_hex,
          is_default,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?);
      `,
        cat.id,
        cat.name,
        cat.emoji,
        cat.color,
        0,
        now,
        now
      );
    }

    await db.execAsync("COMMIT;");
  } catch (e) {
    await db.execAsync("ROLLBACK;");
    console.warn("[Onboarding] Failed to save categories:", e);
    throw e;
  }
}

// Save budgets chosen during onboarding
async function saveOnboardingBudgets(
  budgetsByCategoryId: Record<string, string>,
  selectedCategoryIds: string[],
  currencyCode: string
) {
  const db = await getDb();
  const now = new Date().toISOString();
  const currency = (currencyCode || "INR").trim().toUpperCase() || "INR";

  await db.execAsync("BEGIN TRANSACTION;");
  try {
    // Fresh onboarding → safe to clear budgets
    await db.execAsync("DELETE FROM budgets;");

    for (const categoryId of selectedCategoryIds) {
      const raw = budgetsByCategoryId[categoryId];
      if (!raw) continue;

      const parsed = parseFloat(raw);
      if (!Number.isFinite(parsed) || parsed <= 0) continue;

      await db.runAsync(
        `
        INSERT INTO budgets (
          id,
          category_id,
          period,
          period_start_day,
          limit_amount,
          currency,
          alert_threshold_percent,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
        uuidv4(),
        categoryId,
        "monthly",
        1,
        parsed,
        currency,
        80, // 80% alert threshold by default
        1,
        now,
        now
      );
    }

    await db.execAsync("COMMIT;");
  } catch (e) {
    await db.execAsync("ROLLBACK;");
    console.warn("[Onboarding] Failed to save budgets:", e);
    throw e;
  }
}

const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pin, setPinState] = useState("");
  const pinInputRef = useRef<TextInput | null>(null);

  const [categories] = useState<Category[]>(BASE_CATEGORIES);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([
    "food",
    "transport",
    "shopping",
    "entertainment",
  ]);

  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");

  const [budgetsByCategoryId, setBudgetsByCategoryId] = useState<
    Record<string, string>
  >({});

  const [currencyCode, setCurrencyCode] = useState("INR");

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => ((prev - 1) as 1 | 2 | 3 | 4));
    } else {
      navigation.goBack?.();
    }
  };

  const handleNext = async () => {
    if (step < 4) {
      setStep((prev) => ((prev + 1) as 1 | 2 | 3 | 4));
    } else {
      try {
        // Save PIN securely before finishing onboarding
        if (pin.length === 6) {
          await setStoredPin(pin);
        }

        // Save biometric setting
        await setBiometricEnabledDB(biometricEnabled);

        // Save categories + budgets into SQLite
        await saveOnboardingCategories(
          selectedCategoryIds,
          categories,
          customCategoryName
        );
        await saveOnboardingBudgets(
          budgetsByCategoryId,
          selectedCategoryIds,
          currencyCode
        );
      } catch (e) {
        console.warn("[Onboarding] Finish setup error:", e);
        // For now, still continue into app even if persist fails
      }

      navigation.reset({
        index: 0,
        routes: [{ name: "AppTabs" }],
      });
    }
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBudgetChange = (id: string, value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, "");
    setBudgetsByCategoryId((prev) => ({
      ...prev,
      [id]: cleaned,
    }));
  };

  const handlePinChange = (value: string) => {
    const onlyDigits = value.replace(/[^0-9]/g, "");
    if (onlyDigits.length <= 6) {
      setPinState(onlyDigits);
    }
  };

  const selectedCategories = categories.filter((c) =>
    selectedCategoryIds.includes(c.id)
  );

  const renderProgressBar = () => {
    return (
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map((i) => {
          const isActive = i <= step;
          const isFinal = i === 4 && step >= 4;
          const activeColor = isFinal ? "#22C55E" : colors.primary;
          return (
            <View
              key={i}
              style={[
                styles.progressSegment,
                isActive && { backgroundColor: activeColor },
              ]}
            />
          );
        })}
        <Text style={styles.progressLabel}>{step} of 4</Text>
      </View>
    );
  };

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.heroIconWrapper}>
        <View style={styles.heroIconCircle}>
          <Text style={styles.heroEmoji}>💙</Text>
        </View>
      </View>

      <Text style={styles.title}>Welcome to Bachat AI</Text>
      <Text style={styles.subtitle}>
        Your privacy-first smart budgeting companion
      </Text>

      <View style={styles.featureCard}>
        <Text style={styles.featureTitle}>Private by Design</Text>
        <Text style={styles.featureSubtitle}>
          End-to-end encryption keeps your financial data secure.
        </Text>
      </View>

      <View style={styles.featureCard}>
        <Text style={styles.featureTitle}>AI Insights that stay local</Text>
        <Text style={styles.featureSubtitle}>
          Smart categorization without sending data to servers.
        </Text>
      </View>

      <View style={styles.featureCard}>
        <Text style={styles.featureTitle}>Your Data is Encrypted</Text>
        <Text style={styles.featureSubtitle}>
          Military-grade encryption protects every transaction.
        </Text>
      </View>

      <View style={styles.featureCard}>
        <Text style={styles.featureTitle}>Protected on Every Device</Text>
        <Text style={styles.featureSubtitle}>
          Multi-layer security across all your devices.
        </Text>
      </View>
    </View>
  );

  const renderPinDots = () => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => pinInputRef.current?.focus()}
      style={styles.pinDotsRow}
    >
      {Array.from({ length: 6 }).map((_, idx) => {
        const filled = idx < pin.length;
        return (
          <View
            key={idx}
            style={[styles.pinDot, filled && styles.pinDotFilled]}
          />
        );
      })}
    </TouchableOpacity>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.title}>Secure Your App</Text>
      <Text style={styles.subtitle}>
        Add extra protection every time you open Bachat AI
      </Text>

      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardIconCircle}>
            <Text style={styles.cardIconText}>🔐</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Enable Biometric Authentication</Text>
            <Text style={styles.cardSubtitle}>
              Use Face ID or Fingerprint to unlock
            </Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={setBiometricEnabled}
            trackColor={{ false: "#E5E7EB", true: "#BFDBFE" }}
            thumbColor={biometricEnabled ? colors.primary : "#FFFFFF"}
          />
        </View>
      </View>

      <View style={[styles.card, { marginTop: 16 }]}>
        <Text style={styles.sectionLabel}>Create 6-Digit PIN</Text>
        <Text style={styles.sectionHint}>
          This PIN will be required to access your app.
        </Text>

        {renderPinDots()}

        {/* Hidden TextInput to capture PIN digits */}
        <TextInput
          ref={pinInputRef}
          value={pin}
          onChangeText={handlePinChange}
          keyboardType="number-pad"
          maxLength={6}
          style={styles.hiddenPinInput}
          autoFocus={false}
        />

        <View style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <Text style={styles.bulletText}>
            App locks automatically every time you open it.
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <Text style={styles.bulletText}>
            No one else can access your data.
          </Text>
        </View>
        <View style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <Text style={styles.bulletText}>
            Even offline, your app stays protected.
          </Text>
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.title}>Choose Your Categories</Text>
      <Text style={styles.subtitle}>
        Select the types of expenses you want to track
      </Text>

      <View style={{ marginTop: 12 }}>
        {categories.map((cat) => {
          const selected = selectedCategoryIds.includes(cat.id);
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryCard,
                selected && styles.categoryCardSelected,
              ]}
              activeOpacity={0.9}
              onPress={() => toggleCategory(cat.id)}
            >
              <View style={styles.categoryLeft}>
                <View
                  style={[
                    styles.categoryIconCircle,
                    { backgroundColor: `${cat.color}22` },
                  ]}
                >
                  <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                </View>
                <Text style={styles.categoryName}>{cat.name}</Text>
              </View>

              {selected && <Text style={styles.checkMark}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={styles.customCategoryButton}
        activeOpacity={0.9}
        onPress={() => setShowCustomInput((prev) => !prev)}
      >
        <Text style={styles.customCategoryPlus}>＋</Text>
        <Text style={styles.customCategoryText}>Add Custom Category</Text>
      </TouchableOpacity>

      {showCustomInput && (
        <View style={styles.customCategoryInputWrapper}>
          <TextInput
            value={customCategoryName}
            onChangeText={setCustomCategoryName}
            placeholder="Custom category name"
            placeholderTextColor={colors.placeholder}
            style={styles.customCategoryInput}
          />
        </View>
      )}

      <Text style={styles.selectedCountText}>
        {selectedCategoryIds.length} categories selected
      </Text>
    </View>
  );

  const renderStep4 = () => {
    const symbol =
      currencyCode.trim().toUpperCase() === "INR"
        ? "₹"
        : currencyCode.trim().toUpperCase() || "₹";

    return (
      <View style={styles.stepContent}>
        <Text style={styles.title}>Set Your Budgets</Text>
        <Text style={styles.subtitle}>
          Stay on top of your spending by assigning monthly limits
        </Text>

        {/* Currency input at top */}
        <View style={styles.currencyRow}>
          <Text style={styles.currencyLabel}>Currency</Text>
          <View style={styles.currencyInputWrapper}>
            <Text style={styles.currencySymbolPreview}>{symbol}</Text>
            <TextInput
              style={styles.currencyInput}
              value={currencyCode}
              onChangeText={setCurrencyCode}
              placeholder="INR"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <View style={{ marginTop: 16 }}>
          {selectedCategories.length === 0 ? (
            <Text style={styles.emptyHint}>
              No categories selected. You can add budgets later in the Budget
              tab.
            </Text>
          ) : (
            selectedCategories.map((cat) => (
              <View key={cat.id} style={styles.budgetCard}>
                <View style={styles.budgetHeaderRow}>
                  <View
                    style={[
                      styles.budgetDot,
                      { backgroundColor: cat.color },
                    ]}
                  />
                  <Text style={styles.budgetCategoryName}>{cat.name}</Text>
                </View>
                <View style={styles.budgetInputRow}>
                  <Text style={styles.currencySymbol}>{symbol}</Text>
                  <TextInput
                    style={styles.budgetInput}
                    value={budgetsByCategoryId[cat.id] ?? ""}
                    onChangeText={(v) => handleBudgetChange(cat.id, v)}
                    placeholder="0.00"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.tipCard}>
          <Text style={styles.tipEmoji}>💡</Text>
          <Text style={styles.tipText}>
            Pro Tip: You can skip budgets now and set them later in the Budget
            tab.
          </Text>
        </View>

        <Text style={styles.footerHint}>
          You can always adjust these settings later.
        </Text>
      </View>
    );
  };

  const isContinueDisabled = step === 2 && pin.length < 6;

  const primaryButtonLabel = step < 4 ? "Continue" : "Finish Setup";

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={handleBack}
              style={styles.backButton}
              activeOpacity={0.8}
            >
              <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>
          </View>

          {renderProgressBar()}

          {/* Step content */}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}

          {/* Primary button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              isContinueDisabled && { opacity: 0.6 },
            ]}
            activeOpacity={0.85}
            onPress={handleNext}
            disabled={isContinueDisabled}
          >
            <Text style={styles.primaryButtonText}>{primaryButtonLabel}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    marginBottom: 8,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: {
    fontSize: 24,
    color: colors.textPrimary,
  },
  progressContainer: {
    marginTop: 4,
    marginBottom: 24,
    alignItems: "center",
  },
  progressSegment: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 4,
  },
  progressLabel: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
  },
  stepContent: {
    marginBottom: 24,
  },
  heroIconWrapper: {
    alignItems: "center",
    marginBottom: 16,
  },
  heroIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E0EAFF",
    justifyContent: "center",
    alignItems: "center",
  },
  heroEmoji: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  featureCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E0EAFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  cardIconText: {
    fontSize: 18,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  pinDotsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    marginTop: 4,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
  },
  pinDotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  hiddenPinInput: {
    position: "absolute",
    opacity: 0,
    height: 0,
    width: 0,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 8,
  },
  bulletText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  categoryCardSelected: {
    borderColor: colors.primary,
    backgroundColor: "#EEF5FF",
  },
  categoryLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  categoryEmoji: {
    fontSize: 18,
  },
  categoryName: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  checkMark: {
    fontSize: 18,
    color: colors.primary,
  },
  customCategoryButton: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#D1D5DB",
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  customCategoryPlus: {
    fontSize: 18,
    color: colors.primary,
    marginRight: 6,
  },
  customCategoryText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: "500",
  },
  customCategoryInputWrapper: {
    marginTop: 8,
  },
  customCategoryInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  selectedCountText: {
    marginTop: 10,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  budgetCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 10,
  },
  budgetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  budgetDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  budgetCategoryName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  budgetInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
  },
  currencySymbol: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 6,
  },
  budgetInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  tipCard: {
    marginTop: 8,
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#E0F2FE",
    flexDirection: "row",
    alignItems: "center",
  },
  tipEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  tipText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  emptyHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10,
  },
  footerHint: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  primaryButton: {
    marginTop: 12,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  currencyRow: {
    marginTop: 12,
    marginBottom: 4,
  },
  currencyLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  currencyInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
  },
  currencySymbolPreview: {
    fontSize: 15,
    color: colors.textPrimary,
    marginRight: 8,
  },
  currencyInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
});

export default OnboardingScreen;
