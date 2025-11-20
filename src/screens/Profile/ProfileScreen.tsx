// src/screens/Profile/ProfileScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import colors from "../../lib/colors";
import { useNavigation } from "@react-navigation/native";
import { supabase, getCurrentUser } from "../../services/supabaseClient";
import { getDb } from "../../services/db";
import { CurrencyCode } from "../../lib/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

const USER_SETTINGS_ID = "default";
const AVATAR_STORAGE_KEY = "bachat:user_avatar_uri";

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [currency, setCurrency] = useState<CurrencyCode>("INR");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const handleBack = () => navigation.goBack();

  useEffect(() => {
    (async () => {
      try {
        // Load Supabase user
        const user = await getCurrentUser();
        if (user) {
          const metaName =
            (user.user_metadata as any)?.full_name as string | undefined;
          setName(metaName || "");
          setEmail(user.email ?? "");
        }

        // Load avatar from local storage
        let storedAvatar = await AsyncStorage.getItem(AVATAR_STORAGE_KEY);
        if (!storedAvatar) {
          // Fallback: try user_settings.avatar_base64 (e.g. on a freshly restored device)
          const db = await getDb();
          const us = await db.getFirstAsync<{ avatar_base64?: string }>(
            "SELECT avatar_base64 FROM user_settings WHERE id = ?",
            USER_SETTINGS_ID
          );
          if (us?.avatar_base64) {
            storedAvatar = `data:image/jpeg;base64,${us.avatar_base64}`;
            // cache for next time
            await AsyncStorage.setItem(AVATAR_STORAGE_KEY, storedAvatar);
          }
        }

        if (storedAvatar) {
          setAvatarUri(storedAvatar);
        }

        // Load currency from user_settings table
        const db = await getDb();
        const row = await db.getFirstAsync<{ currency: string }>(
          "SELECT currency FROM user_settings WHERE id = ?",
          USER_SETTINGS_ID
        );
        if (row?.currency) {
          setCurrency(row.currency as CurrencyCode);
        }
      } catch (e) {
        console.warn("[Profile] Failed to load profile data", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission needed",
          "We need access to your photos to set a profile picture."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const uri = asset?.uri;
      if (!uri) return;

      setAvatarUri(uri);
      await AsyncStorage.setItem(AVATAR_STORAGE_KEY, uri);

      // 🔽 NEW: save base64 into user_settings so it gets synced
      if (asset.base64) {
        try {
          const db = await getDb();
          const now = new Date().toISOString();
          await db.runAsync(
            `
              UPDATE user_settings
              SET avatar_base64 = ?, updated_at = ?
              WHERE id = ?;
            `,
            asset.base64,
            now,
            USER_SETTINGS_ID
          );
        } catch (e) {
          console.warn("[Profile] Failed to persist avatar_base64", e);
        }
      }
    } catch (e) {
      console.warn("[Profile] Avatar pick failed", e);
      Alert.alert("Error", "Something went wrong while picking image.");
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // Update Supabase user
      const user = await getCurrentUser();
      if (!user) {
        throw new Error("No logged-in user found.");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        email: email || undefined,
        data: {
          full_name: name || undefined,
        },
      });

      if (updateError) {
        throw updateError;
      }

      // Upsert user_settings currency in SQLite
      const db = await getDb();
      const existing = await db.getFirstAsync<any>(
        "SELECT * FROM user_settings WHERE id = ?",
        USER_SETTINGS_ID
      );
      const now = new Date().toISOString();

      if (existing) {
        await db.runAsync(
          `
            UPDATE user_settings
            SET currency = ?, updated_at = ?
            WHERE id = ?;
          `,
          currency,
          now,
          USER_SETTINGS_ID
        );
      } else {
        // Insert with sensible defaults for other required columns
        await db.runAsync(
          `
            INSERT INTO user_settings (
              id,
              currency,
              theme,
              pin_enabled,
              biometric_enabled,
              ai_suggestions_enabled,
              budget_alerts_enabled,
              onboarding_completed,
              created_at,
              updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
          `,
          USER_SETTINGS_ID,
          currency,
          "system", // theme
          1, // pin_enabled (PIN will be mandatory)
          0, // biometric_enabled
          1, // ai_suggestions_enabled
          1, // budget_alerts_enabled
          0, // onboarding_completed
          now,
          now
        );
      }

      Alert.alert("Saved", "Your profile has been updated.");
      navigation.goBack();
    } catch (e: any) {
      console.error("[Profile] Save failed", e);
      Alert.alert(
        "Save failed",
        e?.message ?? "Something went wrong while saving your profile."
      );
    } finally {
      setSaving(false);
    }
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
          <TouchableOpacity
            style={styles.avatarCircle}
            activeOpacity={0.85}
            onPress={handlePickAvatar}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {name
                  ? name.trim().charAt(0).toUpperCase()
                  : email
                  ? email.trim().charAt(0).toUpperCase()
                  : "B"}
              </Text>
            )}
          </TouchableOpacity>
          <Text style={styles.avatarLabel}>Tap to change photo</Text>
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
            autoCapitalize="words"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={colors.placeholder}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
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
            <Pill
              label="GBP"
              selected={currency === "GBP"}
              onPress={() => setCurrency("GBP")}
            />
            <Pill
              label="Other"
              selected={currency === "OTHER"}
              onPress={() => setCurrency("OTHER")}
            />
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={styles.saveButton}
          activeOpacity={0.85}
          onPress={handleSave}
          disabled={saving || loading}
        >
          <Text style={styles.saveButtonText}>
            {saving ? "Saving..." : "Save Changes"}
          </Text>
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
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 40,
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
