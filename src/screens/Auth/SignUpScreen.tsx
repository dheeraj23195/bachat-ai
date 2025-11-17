import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import colors from '../../lib/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

const SignUpScreen: React.FC<Props> = ({ navigation }) => {
  const [acceptedTerms, setAcceptedTerms] = useState(true);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleSignUp = () => {
    // TODO: wire signup later
    navigation.navigate('AppTabs');
  };

  const goToSignIn = () => {
    navigation.navigate('SignIn');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backIcon}>{'‹'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.subtitle}>
        Join Bachat AI and start managing your finances securely
      </Text>

      {/* Info card */}
      <View style={styles.infoCard}>
        <View style={styles.infoIconCircle}>
          <Text style={styles.infoIcon}>🛡️</Text>
        </View>
        <View style={styles.infoTextContainer}>
          <Text style={styles.infoTitle}>Your data is encrypted</Text>
          <Text style={styles.infoSubtitle}>
            Data is stored locally and protected with encryption
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
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Password</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Create a strong password"
            placeholderTextColor={colors.placeholder}
            secureTextEntry
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Confirm Password</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Re-enter your password"
            placeholderTextColor={colors.placeholder}
            secureTextEntry
          />
        </View>
      </View>

      {/* Terms checkbox */}
      <TouchableOpacity
        style={styles.checkboxRow}
        activeOpacity={0.7}
        onPress={() => setAcceptedTerms(!acceptedTerms)}
      >
        <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
          {acceptedTerms && <Text style={styles.checkboxTick}>✓</Text>}
        </View>
        <Text style={styles.checkboxText}>
          I agree to privacy-first data terms and understand that my data is
          processed locally with end-to-end encryption
        </Text>
      </TouchableOpacity>

      {/* Primary button */}
      <TouchableOpacity
        style={[
          styles.primaryButton,
          !acceptedTerms && { opacity: 0.6 },
        ]}
        activeOpacity={0.8}
        onPress={handleSignUp}
        disabled={!acceptedTerms}
      >
        <Text style={styles.primaryButtonText}>Sign Up</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <TouchableOpacity onPress={goToSignIn}>
          <Text style={styles.footerLink}>Sign In</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 26,
    color: colors.textPrimary,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
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
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '600',
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
    fontWeight: '500',
    color: colors.textPrimary,
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkboxTick: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  checkboxText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  primaryButton: {
    marginTop: 32,
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footerRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default SignUpScreen;
