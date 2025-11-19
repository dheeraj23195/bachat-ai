// src/components/ModalDatePicker.tsx

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import colors from '../lib/colors';

type ModalDatePickerProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (date: Date) => void;
  mode?: 'date' | 'time' | 'datetime'; // You can extend this if needed
};

const ModalDatePicker: React.FC<ModalDatePickerProps> = ({ visible, onCancel, onConfirm, mode = 'date' }) => {
  const [date, setDate] = React.useState<Date>(new Date());

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setDate(currentDate);
  };

  const handleConfirm = () => {
    onConfirm(date);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Select Date</Text>
          
          <DateTimePicker
            value={date}
            mode={mode}
            display="default"
            onChange={onDateChange}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onCancel} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} style={[styles.modalButton, styles.modalButtonConfirm]}>
              <Text style={styles.modalButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: 300,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: colors.surface,
    marginHorizontal: 10,
  },
  modalButtonConfirm: {
    backgroundColor: colors.primary,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});

export default ModalDatePicker;
