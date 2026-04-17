import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radius, Typography, Shadow } from '../constants/theme';
import { TouchableScale } from './TouchableScale';
import { Ionicons } from '@expo/vector-icons';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap | React.ReactNode;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  style,
  textStyle,
  variant = 'primary',
  icon,
}) => {
  const isDisabled = disabled || loading;

  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === 'string') {
      const iconColor = 
        variant === 'primary' ? Colors.bgDeep : 
        variant === 'secondary' ? Colors.textPrimary :
        variant === 'outline' ? Colors.primary :
        Colors.textSecondary;
      return <Ionicons name={icon as any} size={20} color={iconColor} />;
    }
    return icon;
  };

  if (variant === 'outline') {
    return (
      <TouchableScale
        style={[styles.outline, isDisabled && styles.disabledOutline, style]}
        onPress={onPress}
        disabled={isDisabled}
      >{renderIcon()}<Text style={[styles.outlineText, textStyle]}>{title}</Text></TouchableScale>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableScale
        style={[styles.secondary, isDisabled && styles.disabled, style]}
        onPress={onPress}
        disabled={isDisabled}
      >{renderIcon()}<Text style={[styles.secondaryText, textStyle]}>{title}</Text></TouchableScale>
    );
  }

  if (variant === 'ghost') {
    return (
      <TouchableScale
        style={[styles.ghost, style]}
        onPress={onPress}
        disabled={isDisabled}
      >{renderIcon()}<Text style={[styles.ghostText, textStyle]}>{title}</Text></TouchableScale>
    );
  }

  return (
    <TouchableScale
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.wrapper, isDisabled && styles.disabled, style]}
    >
      <LinearGradient
        colors={isDisabled ? ['#2A3050', '#1E2540'] : Colors.gradientBtn}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={Colors.bgDeep} size="small" />
        ) : (
          <React.Fragment>
            {renderIcon()}
            <Text style={[styles.text, textStyle]}>{title}</Text>
          </React.Fragment>
        )}
      </LinearGradient>
    </TouchableScale>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadow.glow,
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  text: {
    color: Colors.bgDeep,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.45,
  },
  secondary: {
    borderRadius: Radius.xl,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.bgCardLight,
    borderWidth: 1,
    borderColor: Colors.borderCard,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  disabledOutline: {
    opacity: 0.45,
  },
  secondaryText: {
    color: Colors.textPrimary,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
  },
  outline: {
    borderRadius: Radius.xl,
    paddingVertical: 14,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primaryGlow,
  },
  outlineText: {
    color: Colors.primary,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.semibold,
  },
  ghost: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ghostText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.medium,
  },
});
