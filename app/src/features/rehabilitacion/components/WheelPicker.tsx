import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, NativeSyntheticEvent, NativeScrollEvent, Dimensions } from 'react-native';
import { Colors } from '../../../constants/theme';

const ITEM_HEIGHT = 50;

interface WheelPickerProps {
  data: number[];
  selectedValue: number;
  onValueChange: (val: number) => void;
  label: string;
}

export const WheelPicker: React.FC<WheelPickerProps> = ({ data, selectedValue, onValueChange, label }) => {
  const scrollRef = useRef<FlatList>(null);
  const displayData = [null, ...data, null];
  const isInitialScroll = useRef(true);

  useEffect(() => {
    if (isInitialScroll.current && scrollRef.current) {
      const index = data.indexOf(selectedValue);
      if (index !== -1) {
        setTimeout(() => {
          scrollRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: false });
          isInitialScroll.current = false;
        }, 150);
      }
    }
  }, [selectedValue]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    isInitialScroll.current = false;
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_HEIGHT);
    if (data[index] !== undefined && data[index] !== selectedValue) {
      onValueChange(data[index]);
    }
  };

  return (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <View style={styles.pickerWindow}>
        <View style={styles.selectionHighlight} />
        <FlatList
          ref={scrollRef}
          data={displayData}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item }) => (
            <View style={styles.pickerItem}>
              <Text style={[styles.pickerText, item === selectedValue && styles.pickerTextSelected]}>
                {item !== null ? item.toString().padStart(2, '0') : ''}
              </Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          onScroll={onScroll}
          scrollEventThrottle={16}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pickerContainer: { alignItems: 'center', width: 80 },
  pickerLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 8 },
  pickerWindow: { height: ITEM_HEIGHT * 3, width: '100%', overflow: 'hidden' },
  selectionHighlight: { position: 'absolute', top: ITEM_HEIGHT, left: 0, right: 0, height: ITEM_HEIGHT, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 },
  pickerItem: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  pickerText: { color: 'rgba(255,255,255,0.2)', fontSize: 22, fontWeight: '600' },
  pickerTextSelected: { color: '#FFF', fontSize: 32, fontWeight: '800' },
});
