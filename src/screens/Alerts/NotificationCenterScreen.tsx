import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAlertsStore } from '../../store/useAlertsStore';
import colors from '../../lib/colors';
import { format, parseISO } from 'date-fns';

const NotificationCenterScreen: React.FC = () => {
  const history = useAlertsStore((s) => s.history);
  const markAsRead = useAlertsStore((s) => s.markAsRead);
  const markAllAsRead = useAlertsStore((s) => s.markAllAsRead);

  const navigation = useNavigation();

  const renderItem = ({ item }: { item: typeof history[0] }) => {
    return (
      <TouchableOpacity
        style={[styles.alertCard, item.read ? styles.alertCardRead : styles.alertCardUnread]}
        onPress={() => {
          if (!item.read) markAsRead(item.id);
        }}
      >
        <View style={styles.alertHeader}>
          <Text style={[styles.alertTitle, !item.read && styles.textBold]}>
            {item.title}
          </Text>
          <Text style={styles.alertDate}>
            {format(parseISO(item.date), 'MMM d, h:mm a')}
          </Text>
        </View>
        <Text style={[styles.alertBody, item.read && styles.textMuted]}>
          {item.body}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>{'‹'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>You have no notifications.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backButtonText: {
    fontSize: 28,
    color: colors.textPrimary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  markAllText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  alertCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  alertCardUnread: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  alertCardRead: {
    borderColor: '#E5E7EB',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  alertTitle: {
    fontSize: 15,
    color: colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  textBold: {
    fontWeight: '700',
  },
  alertDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  alertBody: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  textMuted: {
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});

export default NotificationCenterScreen;
