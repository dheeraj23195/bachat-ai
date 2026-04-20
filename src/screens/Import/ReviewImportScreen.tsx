import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import colors from '../../lib/colors';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { importTransactionsBatch, CreateTransactionInput } from '../../services/transactions';
import { Category } from '../../lib/types';
import { listCategories } from '../../services/categories';
import { useTransactionsStore } from '../../store/useTransactionsStore';
import { mlService } from '../../ml/MLService';
import { format, parseISO } from 'date-fns';

type ReviewImportRouteProp = RouteProp<RootStackParamList, 'ReviewImport'>;

const ReviewImportScreen: React.FC = () => {
  const route = useRoute<ReviewImportRouteProp>();
  const navigation = useNavigation();
  const { parsedData } = route.params;

  const [data, setData] = useState(parsedData);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Category picker modal
  const [pickerVisible, setPickerVisible] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const loadTransactions = useTransactionsStore((s) => s.loadTransactions);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const rows = await listCategories();
        setCategories(rows);
      } catch (error) {
        console.error('Failed to load categories', error);
      }
    };
    fetchCategories();
  }, []);

  const handleBack = () => navigation.goBack();

  const openPicker = (id: string) => {
    setActiveItemId(id);
    setPickerVisible(true);
  };

  const handleSelectCategory = (category: Category) => {
    if (!activeItemId) return;
    
    setData(prev => prev.map(item => {
      if (item.id === activeItemId) {
        return {
          ...item,
          categoryId: category.id,
          categoryName: category.name
        };
      }
      return item;
    }));
    
    setPickerVisible(false);
    setActiveItemId(null);
  };

  const handleSave = async () => {
    // Ensure all have a category
    const missing = data.filter(d => !d.categoryId);
    if (missing.length > 0) {
      Alert.alert('Missing categories', 'Please select a category for all transactions.');
      return;
    }

    setIsSaving(true);
    try {
      const inputs: CreateTransactionInput[] = data.map(item => ({
        type: 'expense',
        amount: item.amount,
        currency: 'INR',
        date: item.date, // expecting ISO string
        categoryId: item.categoryId!,
        paymentMethod: 'Other',
        note: item.note,
        source: 'imported'
      }));

      // 1. Import to DB
      const imported = await importTransactionsBatch(inputs);
      
      // 2. Reload global store
      await loadTransactions();

      // 3. Train ML sequentially (fire-and-forget but run async loop safely)
      setTimeout(async () => {
        for (const item of imported) {
          try {
            await mlService.trainOnTransaction({
              id: item.id,
              note: item.encryptedNote || '',
              categoryId: item.categoryId!
            });
          } catch (e) {
            console.error("ML train error on import", e);
          }
        }
      }, 500);

      Alert.alert('Success', `Imported ${imported.length} transactions.`, [
        { text: 'OK', onPress: () => navigation.navigate('AppTabs' as any) }
      ]);

    } catch (err) {
      console.error('Import failed', err);
      Alert.alert('Error', 'Failed to import transactions.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backIcon}>{'‹'}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Review Import</Text>
          <Text style={styles.headerSubtitle}>
            {data.length} transactions (₹{totalAmount.toLocaleString()})
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.saveHeaderBtn, isSaving && { opacity: 0.5 }]} 
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveHeaderBtnText}>{isSaving ? 'Saving...' : 'Save All'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {data.map((item, index) => {
          let dateStr = item.date;
          try {
             dateStr = format(parseISO(item.date), 'dd MMM yyyy');
          } catch {}

          const catColor = categories.find(c => c.id === item.categoryId)?.colorHex || '#E5E7EB';

          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTopRow}>
                <Text style={styles.itemNote}>{item.note || 'Untitled'}</Text>
                <Text style={styles.itemAmount}>-₹{item.amount.toLocaleString()}</Text>
              </View>
              
              <View style={styles.cardBottomRow}>
                <Text style={styles.itemDate}>{dateStr}</Text>
                
                <TouchableOpacity 
                  style={[styles.categoryPill, { borderColor: catColor }]}
                  onPress={() => openPicker(item.id)}
                >
                  <View style={[styles.catDot, { backgroundColor: catColor }]} />
                  <Text style={styles.categoryPillText}>
                    {item.categoryName || 'Select Category'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Category Picker Modal */}
      <Modal visible={pickerVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {categories.map(c => (
                <TouchableOpacity 
                  key={c.id} 
                  style={styles.modalCatRow}
                  onPress={() => handleSelectCategory(c)}
                >
                  <View style={[styles.catDot, { backgroundColor: c.colorHex }]} />
                  <Text style={styles.modalCatText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPickerVisible(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  contentContainer: { padding: 16 },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFF'
  },
  backButton: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  backIcon: { fontSize: 26, color: colors.textPrimary },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary },
  saveHeaderBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  saveHeaderBtnText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
  
  card: {
    backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#E5E7EB'
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  itemNote: { fontSize: 15, fontWeight: '500', color: colors.textPrimary, flex: 1, marginRight: 12 },
  itemAmount: { fontSize: 15, fontWeight: '700', color: '#DC2626' },
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemDate: { fontSize: 13, color: colors.textSecondary },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#FAFAFA'
  },
  catDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  categoryPillText: { fontSize: 12, fontWeight: '500', color: colors.textPrimary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  modalCatRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalCatText: { fontSize: 15, color: colors.textPrimary },
  modalCloseBtn: { marginTop: 16, padding: 14, backgroundColor: '#F3F4F6', borderRadius: 12, alignItems: 'center' },
  modalCloseText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary }
});

export default ReviewImportScreen;
