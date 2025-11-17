import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import colors from '../../lib/colors';
import { useNavigation } from '@react-navigation/native';


const ImportTransactionsScreen: React.FC = () => {
    
  const navigation = useNavigation();  
  const handleBack = () => navigation.goBack();

  const handleImportCsv = () => {
    // later: open file picker + CSV parsing
    console.log('Import CSV pressed');
  };

  const handleViewSample = () => {
    // later: show sample CSV format
    console.log('View sample CSV');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backIcon}>{'‹'}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Import Transactions</Text>
            <Text style={styles.headerSubtitle}>
              Bring your existing data into Bachat AI
            </Text>
          </View>
        </View>

        {/* Import method pill row (CSV primary, others disabled for now) */}
        <View style={styles.methodPillsRow}>
          <View style={[styles.methodPill, styles.methodPillActive]}>
            <Text style={styles.methodPillTextActive}>CSV file</Text>
          </View>
          <View style={[styles.methodPill, styles.methodPillDisabled]}>
            <Text style={styles.methodPillTextDisabled}>Bank sync (soon)</Text>
          </View>
          <View style={[styles.methodPill, styles.methodPillDisabled]}>
            <Text style={styles.methodPillTextDisabled}>SMS / receipts (soon)</Text>
          </View>
        </View>

        {/* CSV card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Import from CSV</Text>
          <Text style={styles.cardSubtitle}>
            Upload a CSV export from your bank, credit card, or any other app.
          </Text>

          <View style={styles.stepsContainer}>
            <StepRow index={1} text="Export your transactions as a .csv file from your bank/app." />
            <StepRow index={2} text="Tap Import CSV and choose the file from your device." />
            <StepRow index={3} text="Map the columns (date, amount, description, etc.)." />
            <StepRow index={4} text="Review and confirm before saving locally." />
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={handleImportCsv}
          >
            <Text style={styles.primaryButtonText}>Import CSV</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.8}
            onPress={handleViewSample}
          >
            <Text style={styles.secondaryButtonText}>View sample CSV format</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy card */}
        <View style={styles.card}>
          <View style={styles.privacyRow}>
            <View style={styles.privacyIconCircle}>
              <Text style={styles.privacyIcon}>🔒</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.privacyTitle}>Local-only import</Text>
              <Text style={styles.privacySubtitle}>
                CSV files are processed entirely on this device. No data is sent to
                servers or cloud storage.
              </Text>
            </View>
          </View>
        </View>

        {/* Coming soon / roadmap */}
        <View style={styles.cardMuted}>
          <Text style={styles.cardMutedTitle}>Coming soon</Text>
          <Text style={styles.cardMutedText}>
            • Smart parsing of SMS alerts for transactions{'\n'}
            • Receipt scanning with on-device OCR{'\n'}
            • More import presets for popular banks and apps
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

type StepRowProps = {
  index: number;
  text: string;
};

const StepRow: React.FC<StepRowProps> = ({ index, text }) => (
  <View style={styles.stepRow}>
    <View style={styles.stepIndexCircle}>
      <Text style={styles.stepIndexText}>{index}</Text>
    </View>
    <Text style={styles.stepText}>{text}</Text>
  </View>
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
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  backIcon: {
    fontSize: 26,
    color: colors.textPrimary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  methodPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 16,
  },
  methodPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
  },
  methodPillActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  methodPillDisabled: {
    backgroundColor: '#E5E7EB',
  },
  methodPillTextActive: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  methodPillTextDisabled: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  stepsContainer: {
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  stepIndexCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  stepIndexText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    borderRadius: 24,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.primary,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  privacyIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  privacyIcon: {
    fontSize: 18,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  privacySubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  cardMuted: {
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    padding: 16,
    marginTop: 4,
  },
  cardMutedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  cardMutedText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});

export default ImportTransactionsScreen;
