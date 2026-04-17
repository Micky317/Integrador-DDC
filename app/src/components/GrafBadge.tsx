import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';
import { EstadoGraf, colorPorGraf, labelGraf } from '../types';

interface GrafBadgeProps {
  estado: EstadoGraf;
  style?: ViewStyle;
  textStyle?: TextStyle;
  compact?: boolean;
}

export const GrafBadge: React.FC<GrafBadgeProps> = ({
  estado,
  style,
  textStyle,
  compact = false,
}) => {
  const color = colorPorGraf(estado);
  const label = labelGraf(estado);

  return (
    <View
      style={[
        styles.badge,
        { borderColor: color, backgroundColor: `${color}22` },
        compact && styles.compact,
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }, textStyle]}>
        {compact ? estado.replace('_', ' ') : label.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 6,
  },
  compact: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.5,
  },
});
