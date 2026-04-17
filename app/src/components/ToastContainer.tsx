import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, SafeAreaView, PanResponder } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Radius, Shadow, Spacing } from '../constants/theme';
import { useToastStore, ToastType } from '../store/useToastStore';

const TOAST_ICONS: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  warning: 'warning',
  info: 'information-circle',
};

const TOAST_COLORS: Record<ToastType, string> = {
  success: Colors.statusNormal,
  error: Colors.statusDanger,
  warning: Colors.statusWarning,
  info: Colors.primary,
};

const ToastItem = ({ toast }: { toast: { id: string, title: string, message?: string, type: ToastType } }) => {
  const { hideToast } = useToastStore();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) { // Solo permitir swipe hacia arriba
          pan.y.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -40 || gestureState.vy < -0.5) {
          // Salida rápida hacia arriba
          Animated.timing(translateY, {
            toValue: -200,
            duration: 200,
            useNativeDriver: true,
          }).start(() => hideToast(toast.id));
        } else {
          // Regresar a posición original
          Animated.spring(pan.y, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        speed: 14,
        bounciness: 4,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    if (toast.type === 'error') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } else if (toast.type === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

  return (
    <Animated.View 
      {...panResponder.panHandlers}
      style={[
        styles.toastWrapper, 
        { 
          opacity, 
          transform: [
            { translateY: Animated.add(translateY, pan.y) }
          ] 
        }
      ]}
    >
      <BlurView intensity={60} tint="dark" style={styles.blurContainer}>
        <View style={styles.innerContainer}>
          <View style={[styles.iconContainer, { backgroundColor: TOAST_COLORS[toast.type] + '20' }]}>
            <Ionicons name={TOAST_ICONS[toast.type]} size={24} color={TOAST_COLORS[toast.type]} />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{toast.title}</Text>
            {toast.message ? <Text style={styles.message}>{toast.message}</Text> : null}
          </View>
        </View>
      </BlurView>
    </Animated.View>
  );
};

export function ToastContainer() {
  const { toasts } = useToastStore();
  if (toasts.length === 0) return null;

  return (
    <SafeAreaView style={styles.globalContainer} pointerEvents="box-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  globalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingTop: Spacing.xl, // Espacio desde el notch
  },
  toastWrapper: {
    width: '90%',
    marginBottom: Spacing.sm,
    ...Shadow.glow,
  },
  blurContainer: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: 'rgba(13, 18, 37, 0.5)', // Fondo oscuro translúcido
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
  },
  message: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    marginTop: 2,
  },
});
