import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../../navigation/AppTabs';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import colors from '../../lib/colors';

type Props = BottomTabScreenProps<AppTabParamList, 'Settings'>;

const SettingsScreen: React.FC<Props> = ({}) => {
  const [pinLockEnabled, setPinLockEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [aiSuggestionsEnabled, setAiSuggestionsEnabled] = useState(true);
  const [budgetAlertsEnabled, setBudgetAlertsEnabled] = useState(true);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleProfilePress = () => navigation.navigate('Profile');


  const handleExportData = () => {
    // later: open export flow
    console.log('Export data');
  };

  const handleWipeData = () => {
    // later: open confirm-wipe modal
    console.log('Wipe data');
  };

  const handleAboutPress = () => {
    // later: navigate to About / Info page
    console.log('About pressed');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>
            Control privacy, security & app behaviour
          </Text>
        </View>

        {/* Profile card */}
        <TouchableOpacity
          style={styles.profileCard}
          activeOpacity={0.8}
          onPress={handleProfilePress}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>A</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Adarsh Bhatt</Text>
            <Text style={styles.profileEmail}>you@example.com</Text>
          </View>
          <Text style={styles.chevron}>{'›'}</Text>
        </TouchableOpacity>

        {/* Data & security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Security</Text>
          <Text style={styles.sectionSubtitle}>
            All sensitive data stays encrypted on your device
          </Text>

          <View style={styles.card}>
            <SettingsRow
              title="Local, offline storage"
              subtitle="All transactions and budgets are stored only on this device"
              rightElement={
                <PillLabel text="Enabled" variant="success" />
              }
            />
            <View style={styles.divider} />

            <SettingsRow
              title="Encryption"
              subtitle="AES-GCM with keys stored in secure enclave"
              rightElement={
                <PillLabel text="On-device" variant="default" />
              }
            />
            <View style={styles.divider} />

            <SettingsSwitchRow
              title="PIN / passcode lock"
              subtitle="Require a PIN to open Bachat AI"
              value={pinLockEnabled}
              onValueChange={setPinLockEnabled}
            />
            <View style={styles.divider} />

            <SettingsSwitchRow
              title="Biometric unlock"
              subtitle="Use Face ID / fingerprint where available"
              value={biometricEnabled}
              onValueChange={setBiometricEnabled}
            />
          </View>
        </View>

        {/* AI & insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI & Insights</Text>
          <Text style={styles.sectionSubtitle}>
            All AI runs locally. No data leaves your device.
          </Text>

          <View style={styles.card}>
            <SettingsSwitchRow
              title="AI category suggestions"
              subtitle="Get suggested categories when adding expenses"
              value={aiSuggestionsEnabled}
              onValueChange={setAiSuggestionsEnabled}
            />
            <View style={styles.divider} />

            <SettingsSwitchRow
              title="Budget alerts"
              subtitle="Smart alerts when you approach budget limits"
              value={budgetAlertsEnabled}
              onValueChange={setBudgetAlertsEnabled}
            />
          </View>
        </View>

        {/* Data control */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your data</Text>
          <Text style={styles.sectionSubtitle}>
            Export or wipe your data any time. You&apos;re in control.
          </Text>

          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionRow}
              activeOpacity={0.8}
              onPress={handleExportData}
            >
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Export data</Text>
                <Text style={styles.actionSubtitle}>
                  Export all transactions and budgets as encrypted backup or CSV
                </Text>
              </View>
              <Text style={styles.chevron}>{'›'}</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionRow}
              activeOpacity={0.8}
              onPress={handleWipeData}
            >
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionTitle, styles.dangerText]}>
                  Wipe all data
                </Text>
                <Text style={styles.actionSubtitle}>
                  Permanently delete all local data from this device
                </Text>
              </View>
              <Text style={[styles.chevron, styles.dangerText]}>{'›'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionRow}
              activeOpacity={0.8}
              onPress={handleAboutPress}
            >
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>About Bachat AI</Text>
                <Text style={styles.actionSubtitle}>
                  Version 1.0 · Local-first · Made for privacy
                </Text>
              </View>
              <Text style={styles.chevron}>{'›'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

type SettingsRowProps = {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
};

const SettingsRow: React.FC<SettingsRowProps> = ({
  title,
  subtitle,
  rightElement,
}) => (
  <View style={styles.row}>
    <View style={styles.rowTextContainer}>
      <Text style={styles.rowTitle}>{title}</Text>
      {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
    </View>
    {rightElement}
  </View>
);

type SettingsSwitchRowProps = {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
};

const SettingsSwitchRow: React.FC<SettingsSwitchRowProps> = ({
  title,
  subtitle,
  value,
  onValueChange,
}) => (
  <View style={styles.row}>
    <View style={styles.rowTextContainer}>
      <Text style={styles.rowTitle}>{title}</Text>
      {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#E5E7EB', true: '#BFDBFE' }}
      thumbColor={value ? colors.primary : '#FFFFFF'}
    />
  </View>
);

type PillLabelProps = {
  text: string;
  variant?: 'default' | 'success';
};

const PillLabel: React.FC<PillLabelProps> = ({ text, variant = 'default' }) => {
  const bg =
    variant === 'success' ? '#DCFCE7' : '#E5E7EB';
  const fg =
    variant === 'success' ? '#16A34A' : colors.textSecondary;

  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: fg }]}>{text}</Text>
    </View>
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
    paddingBottom: 24,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  profileEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  rowTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  actionTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  actionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dangerText: {
    color: '#EF4444',
  },
});

export default SettingsScreen;
