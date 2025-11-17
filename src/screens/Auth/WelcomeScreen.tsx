import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootNavigator";
import colors from "../../lib/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const handleGetStarted = () => {
    navigation.navigate("SignUp");
  };

  const handleSignIn = () => {
    navigation.navigate("SignIn");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* App icon */}
      <View style={styles.iconWrapper}>
        <View style={styles.iconBox}>
          <Text style={styles.iconEmoji}>🛡️</Text>
        </View>
      </View>

      {/* Title + subtitle */}
      <Text style={styles.title}>Bachat AI</Text>
      <Text style={styles.subtitle}>Privacy-first smart budgeting with AI</Text>

      {/* Feature bullets */}
      <View style={styles.featuresContainer}>
        <FeatureRow title="End-to-end encrypted" />
        <FeatureRow title="Local AI processing" />
        <FeatureRow title="Smart insights & categorizations" />
      </View>

      {/* Primary button */}
      <TouchableOpacity
        style={styles.primaryButton}
        activeOpacity={0.8}
        onPress={handleGetStarted}
      >
        <Text style={styles.primaryButtonText}>Get Started</Text>
      </TouchableOpacity>

      {/* Already have account */}
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <TouchableOpacity onPress={handleSignIn}>
          <Text style={styles.footerLink}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const FeatureRow: React.FC<{ title: string }> = ({ title }) => {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIconCircle}>
        <Text style={styles.featureIconText}>•</Text>
      </View>
      <Text style={styles.featureText}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingHorizontal: 24,
    paddingTop: 80,
  },
  iconWrapper: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  iconEmoji: {
    fontSize: 40,
    color: "#FFFFFF",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  featuresContainer: {
    marginTop: 32,
    marginBottom: 40,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  featureIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    backgroundColor: "#EEF3FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  featureIconText: {
    fontSize: 14,
    color: colors.primary,
  },
  featureText: {
    fontSize: 15,
    color: colors.textPrimary,
  },
  primaryButton: {
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

export default WelcomeScreen;
