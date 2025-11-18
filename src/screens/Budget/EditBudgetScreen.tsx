import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../navigation/RootNavigator';
import colors from '../../lib/colors';
import { CurrencyCode } from '../../lib/types';
import { updateBudget, getBudgetById } from '../../services/budgets';
import { listCategories } from '../../services/categories';
import { Category } from '../../lib/types'; // Adjust the path according to your file structure

type Props = NativeStackScreenProps<RootStackParamList, 'EditBudget'>;

const ALERT_THRESHOLDS = [70, 80, 90, 100];

const EditBudgetScreen: React.FC<Props> = ({ route, navigation }) => {
  const { budgetId } = route.params;

  const [categories, setCategories] = useState<Category[]>([]); // <- specify Category[] type
  const [budget, setBudget] = useState<any>(null); // stores current budget
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(''); // Initialize with empty string
  const [limitAmount, setLimitAmount] = useState<string>('');
  const [alertThreshold, setAlertThreshold] = useState<number>(80);
  const [categoryColor, setCategoryColor] = useState<string>(colors.primary); // Ensure it's never undefined or null
  const [isSaving, setIsSaving] = useState(false);

  const currency: CurrencyCode = 'INR';

  // Fetch categories and current budget
  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoryRows, currentBudget] = await Promise.all([
          listCategories(),
          getBudgetById(budgetId),
        ]);

        setCategories(categoryRows);
        setBudget(currentBudget);

        if (currentBudget) {
          setSelectedCategoryId(currentBudget.categoryId || '');  // Default to empty string if categoryId is null
          setLimitAmount(currentBudget.limitAmount.toString());
          setAlertThreshold(currentBudget.alertThresholdPercent);
          setCategoryColor(currentBudget.categoryId ? categoryRows.find((cat) => cat.id === currentBudget.categoryId)?.colorHex ?? colors.primary : colors.primary);
        }
      } catch (e) {
        console.error('Failed to load data', e);
      }
    };

    loadData();
  }, [budgetId]);

  const handleSave = async () => {
    if (isSaving) return;

    // Validate the limit
    const numericLimit = parseFloat(limitAmount.replace(/[^0-9.]/g, ''));
    if (!numericLimit || numericLimit <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid monthly budget.');
      return;
    }

    // Create or update the budget
    try {
      setIsSaving(true);

      await updateBudget(budgetId, {
        categoryId: selectedCategoryId,
        limitAmount: numericLimit,
        alertThresholdPercent: alertThreshold,
        isActive: true,
      });

      navigation.goBack();
    } catch (e) {
      console.error('Failed to save budget', e);
      Alert.alert('Error', 'Something went wrong while saving your budget.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle category selection (other category selection logic)
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    const selectedCategory = categories.find((cat) => cat.id === categoryId);
    setCategoryColor(selectedCategory?.colorHex ?? colors.primary);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <Text style={styles.headerTitle}>Edit Budget</Text>
        <Text style={styles.headerSubtitle}>Update your budget details</Text>

        {/* Category selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Category</Text>
          <View style={styles.chipRowWrap}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.chip,
                  selectedCategoryId === cat.id && styles.chipSelected,
                ]}
                onPress={() => handleCategorySelect(cat.id)}
                activeOpacity={0.8}
              >
                <View
                  style={[styles.chipColorDot, { backgroundColor: cat.colorHex || colors.primary }]}  // Use fallback color
                />
                <Text
                  style={[
                    styles.chipText,
                    selectedCategoryId === cat.id && styles.chipTextSelected,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Limit amount */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Monthly limit</Text>
          <TextInput
            style={styles.amountInput}
            value={limitAmount}
            onChangeText={setLimitAmount}
            placeholder="Enter amount"
            keyboardType="numeric"
          />
        </View>

        {/* Alert threshold */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Alert threshold</Text>
          <View style={styles.thresholdRow}>
            {ALERT_THRESHOLDS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.thresholdChip,
                  alertThreshold === t && styles.thresholdChipSelected,
                ]}
                onPress={() => setAlertThreshold(t)}
              >
                <Text style={styles.thresholdText}>{t}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 'Save Budget'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  headerSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  sectionHint: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },

  chipRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
  chipText: { fontSize: 13, color: colors.textPrimary },
  chipTextSelected: { color: '#FFFFFF', fontWeight: '600' },
  chipColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },

  amountInput: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  thresholdRow: { flexDirection: 'row', flexWrap: 'wrap' },
  thresholdChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: colors.surface,
    marginRight: 8,
    marginBottom: 8,
  },
  thresholdChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  thresholdText: { fontSize: 13, color: colors.textPrimary },

  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
});

export default EditBudgetScreen;
