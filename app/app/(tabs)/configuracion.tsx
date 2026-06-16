import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../../src/constants/theme';

type SettingItem = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  onPress: () => void;
  danger?: boolean;
};

export default function ConfiguracionScreen() {
  const items: SettingItem[] = [
    {
      icon: 'person-circle-outline',
      label: 'Mi Perfil',
      sub: 'Editar información personal',
      onPress: () => Alert.alert('Próximamente'),
    },
    {
      icon: 'server-outline',
      label: 'URL del Backend',
      sub: 'Configurar IP del servidor FastAPI',
      onPress: () => Alert.alert('Backend URL', 'Próximamente — editar EXPO_PUBLIC_API_URL'),
    },
    {
      icon: 'notifications-outline',
      label: 'Notificaciones',
      sub: 'Alertas y recordatorios',
      onPress: () => Alert.alert('Próximamente'),
    },
    {
      icon: 'shield-checkmark-outline',
      label: 'Privacidad y Datos',
      sub: 'HIPAA / Protección de datos médicos',
      onPress: () => Alert.alert('Próximamente'),
    },
    {
      icon: 'information-circle-outline',
      label: 'Acerca de DDC-Check',
      sub: 'v1.0.0 · Universidad Franz Tamayo',
      onPress: () => Alert.alert('DDC-Check Pasitos Firmes', 'Proyecto de grado - Ing. Sistemas\nUniversidad Franz Tamayo, Cochabamba, Bolivia'),
    },
    {
      icon: 'log-out-outline',
      label: 'Cerrar Sesión',
      sub: 'Cerrar la sesión de la cuenta actual',
      onPress: () =>
        Alert.alert('¿Cerrar sesión?', '', [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Salir', style: 'destructive', onPress: () => router.replace('/(auth)/login') },
        ]),
      danger: true,
    },
  ];

  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.gradient}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>Configuración</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {items.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.row}
            onPress={item.onPress}
            activeOpacity={0.75}
          >
            <View style={[styles.iconBox, item.danger && styles.iconBoxDanger]}>
              <Ionicons
                name={item.icon}
                size={20}
                color={item.danger ? Colors.statusDanger : Colors.primary}
              />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, item.danger && { color: Colors.statusDanger }]}>
                {item.label}
              </Text>
              {item.sub && <Text style={styles.rowSub}>{item.sub}</Text>}
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={item.danger ? `${Colors.statusDanger}66` : Colors.textMuted}
            />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 58,
    paddingBottom: Spacing.md,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.bold,
  },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderCard,
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxDanger: {
    backgroundColor: `${Colors.statusDanger}22`,
  },
  rowText: { flex: 1 },
  rowLabel: { color: Colors.textPrimary, fontSize: Typography.size.base, fontWeight: Typography.weight.medium },
  rowSub: { color: Colors.textMuted, fontSize: Typography.size.xs, marginTop: 2 },
});
