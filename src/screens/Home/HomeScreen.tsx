import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { AppTabParamList } from '../../navigation/AppTabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/RootNavigator';
import colors from '../../lib/colors';

type Props = BottomTabScreenProps<AppTabParamList, 'Home'> & {
  navigation: NativeStackNavigationProp<RootStackParamList>;
};


const HomeScreen: React.FC<Props> = ({ navigation }) => {
    const handleImportPress = () => navigation.navigate('ImportTransactions');
    const handleScanPress = () => {}; // leave empty for now
    const handleChatPress = () => navigation.navigate('Chatbot');
    const handleNotificationsPress = () => navigation.navigate('Alerts');
    const handleAddPress = () => navigation.navigate('Add');

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Blue header section */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.greetingText}>Good Morning</Text>
              <Text style={styles.userName}>Adarsh Bhatt</Text>
            </View>

            <TouchableOpacity style={styles.bellButton} onPress={handleNotificationsPress}>
              <Text style={styles.bellIcon}>🔔</Text>
            </TouchableOpacity>
          </View>

          {/* Monthly summary card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>This Month</Text>
                <Text style={styles.summaryAmount}>₹6,000</Text>
                <Text style={styles.summarySubtext}>Remaining of ₹15,000</Text>
              </View>

              <View style={styles.summaryRight}>
                <Text style={styles.summaryRate}>20%</Text>
                <Text style={styles.summaryRateLabel}>Savings rate</Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={styles.progressBackground}>
              <View style={styles.progressFill} />
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.quickActionsSection}>
          <View style={styles.quickActionsRow}>
            <QuickActionButton label="Add" icon="＋" onPress={handleAddPress} />
            <QuickActionButton
              label="Import"
              icon="⬆️"
              onPress={handleImportPress}
            />
            <QuickActionButton
              label="Scan"
              icon="📷"
              onPress={handleScanPress}
            />
            <QuickActionButton
              label="Chat AI"
              icon="💬"
              onPress={handleChatPress}
            />
          </View>
        </View>

        {/* Category spending section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Spending</Text>

          <View style={styles.card}>
            <View style={styles.donutPlaceholder}>
              <Text style={styles.donutText}>Donut Chart</Text>
            </View>
            <View style={styles.legendContainer}>
              <LegendItem color="#F97316" label="Food & Dining" value="40%" />
              <LegendItem color="#6366F1" label="Transport" value="25%" />
              <LegendItem color="#EC4899" label="Shopping" value="20%" />
              <LegendItem color="#22C55E" label="Others" value="15%" />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

type QuickActionProps = {
  label: string;
  icon: string;
  onPress: () => void;
};

const QuickActionButton: React.FC<QuickActionProps> = ({
  label,
  icon,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={styles.quickIconCircle}>
        <Text style={styles.quickIcon}>{icon}</Text>
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

type LegendProps = {
  color: string;
  label: string;
  value: string;
};

const LegendItem: React.FC<LegendProps> = ({ color, label, value }) => {
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
      <Text style={styles.legendValue}>{value}</Text>
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
    paddingBottom: 24,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 14,
    color: '#E5E7EB',
  },
  userName: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  summaryCard: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryAmount: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summarySubtext: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  summaryRate: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22C55E',
  },
  summaryRateLabel: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textSecondary,
  },
  progressBackground: {
    marginTop: 16,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressFill: {
    width: '40%', // static for now
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  quickActionsSection: {
    paddingHorizontal: 24,
    marginTop: 16,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
  },
  quickIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickIcon: {
    fontSize: 20,
    color: colors.primary,
  },
  quickLabel: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  donutPlaceholder: {
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  donutText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  legendContainer: {
    marginTop: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },
  legendValue: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});

export default HomeScreen;
