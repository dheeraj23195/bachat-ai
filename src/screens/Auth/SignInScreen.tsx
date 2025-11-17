import React from 'react';
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

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

const SignInScreen: React.FC<Props> = ({ navigation }) => {
  const handleBack = () => {
    navigation.goBack();
  };

  const handleSignIn = () => {
    // TODO: wire auth later
    navigation.navigate('AppTabs');
  };

  const goToSignUp = () => {
    navigation.navigate('SignUp');
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
          <Text style={styles.backIcon}>{'‹'}</Text>
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
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Password</Text>
          <TouchableOpacity>
            <Text style={styles.linkText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor={colors.placeholder}
            secureTextEntry
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        activeOpacity={0.8}
        onPress={handleSignIn}
      >
        <Text style={styles.primaryButtonText}>Sign In</Text>
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
    backgroundColor: '#E9F7EE',
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontWeight: '500',
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

export default SignInScreen;
