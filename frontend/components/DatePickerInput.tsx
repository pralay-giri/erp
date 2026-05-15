/**
 * Cross-platform date picker button.
 *
 * - Web: renders a visible dark-styled <input type="date"> directly.
 *   The opacity-0 overlay approach fails inside React Native Web Modal
 *   portals — Chrome suppresses the picker popup when anchoring to an
 *   invisible element. Making the input the visible element fixes this.
 *
 * - Native (iOS / Android): renders a TouchableOpacity that opens
 *   @react-native-community/datetimepicker.
 */

import React, { useState } from 'react';
import { Platform, View, Text, TouchableOpacity } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { Colors } from '../constants/Colors';
import { format } from 'date-fns';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DatePickerInputProps {
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = 'Select Date',
}: DatePickerInputProps) {
  const [showNativePicker, setShowNativePicker] = useState(false);
  const displayText = value ? format(value, 'yyyy-MM-dd') : placeholder;

  if (Platform.OS === 'web') {
    return (
      <input
        type="date"
        value={value ? format(value, 'yyyy-MM-dd') : ''}
        placeholder={placeholder}
        style={{
          width: '100%',
          height: 56,
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16,
          padding: '0 16px',
          color: value ? '#ffffff' : 'rgba(255,255,255,0.35)',
          fontSize: 16,
          cursor: 'pointer',
          outline: 'none',
          // Tells the browser to use its dark-mode calendar widget
          colorScheme: 'dark',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
        } as React.CSSProperties}
        onChange={(e) => {
          console.log('[DatePickerInput] onChange — raw:', e.target.value);
          const d = e.target.value
            ? new Date(e.target.value + 'T00:00:00')
            : null;
          if (d) onChange(d);
        }}
      />
    );
  }

  // ── Native ────────────────────────────────────────────────────────────────
  return (
    <>
      <TouchableOpacity
        onPress={() => setShowNativePicker(true)}
        className="bg-background border border-border rounded-2xl px-4 h-14 flex-row items-center justify-between"
      >
        <Text className="text-white text-base">{displayText}</Text>
        <Calendar size={18} color={Colors.muted} />
      </TouchableOpacity>

      {showNativePicker && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display="default"
          onChange={(_event, date) => {
            setShowNativePicker(false);
            if (date) onChange(date);
          }}
        />
      )}
    </>
  );
}

