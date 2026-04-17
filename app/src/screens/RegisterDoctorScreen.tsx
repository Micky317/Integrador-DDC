import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { AppInput } from '../components/AppInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { TouchableScale } from '../components/TouchableScale';
import { GlassContainer } from '../components/GlassContainer';
import { supabase } from '../lib/supabase';
import { useToastStore } from '../store/useToastStore';

export default function RegisterDoctorScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [matricula, setMatricula] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { showToast } = useToastStore();

  const handleRegister = async () => {
    if (!fullName || !email || !matricula || !password || !confirmPassword) {
      showToast('Campos incompletos', 'Por favor completa todos los campos.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      showToast('Contraseñas distintas', 'Las contraseñas no coinciden.', 'error');
      return;
    }
    if (password.length < 8) {
      showToast('Contraseña débil', 'La contraseña debe tener al menos 8 caracteres.', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre_completo: fullName,
            rol: 'medico',
            matricula_profesional: matricula,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Insertar perfil en la tabla profiles
        await supabase.from('profiles').upsert({
          id: data.user.id,
          nombre_completo: fullName,
          rol: 'medico',
          matricula_profesional: matricula,
          matricula_validada: false,
        });

        showToast(
          'Registro exitoso',
          'Revisa tu correo para confirmar tu cuenta.',
          'success',
          5000
        );
        router.replace('/(auth)/login');
      }
    } catch (err: any) {
      showToast('Error al registrarse', err?.message || 'Inténtalo de nuevo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: 'google' | 'apple') => {
    showToast(
      'Próximamente',
      `Configura el Client ID de ${provider === 'google' ? 'Google' : 'Apple'} en Supabase Auth.`,
      'info',
      4000
    );
  };

  return (
    <LinearGradient
      colors={['#090D1F', '#0D1B3E', '#090D1F']}
      locations={[0, 0.5, 1]}
      style={styles.gradient}
    >
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
            <Text style={styles.backText}>Volver</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconWrapper}>
              <LinearGradient colors={['#00E5CC', '#4D6EE3']} style={styles.iconGrad}>
                <Ionicons name="medical-outline" size={26} color="#090D1F" />
              </LinearGradient>
            </View>
            <Text style={styles.title}>Registro Médico</Text>
            <Text style={styles.subtitle}>
              Accede a análisis de IA especializados{'\n'}en displasia de cadera
            </Text>
          </View>

          {/* Social Auth */}
          <View style={styles.socialRow}>
            <TouchableScale style={styles.socialBtnWrapper} onPress={() => handleSocialLogin('google')}>
              <GlassContainer intensity={20} style={styles.socialBtn}>
                <Ionicons name="logo-google" size={20} color="#FFF" />
                <Text style={styles.socialBtnText}>Google</Text>
              </GlassContainer>
            </TouchableScale>
            <TouchableScale style={styles.socialBtnWrapper} onPress={() => handleSocialLogin('apple')}>
              <GlassContainer intensity={20} style={styles.socialBtn}>
                <Ionicons name="logo-apple" size={22} color="#FFF" style={{ marginBottom: 2 }} />
                <Text style={styles.socialBtnText}>Apple</Text>
              </GlassContainer>
            </TouchableScale>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o regístrate con correo</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            <AppInput
              icon="person-outline"
              placeholder="Nombre completo"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
            <AppInput
              icon="at-outline"
              placeholder="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <AppInput
              icon="ribbon-outline"
              placeholder="Matrícula profesional"
              value={matricula}
              onChangeText={setMatricula}
              autoCapitalize="characters"
            />
            <AppInput
              icon="lock-closed-outline"
              placeholder="Contraseña (mín. 8 caracteres)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <AppInput
              icon="shield-checkmark-outline"
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            {/* Info card */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={18} color={Colors.primary} />
              <Text style={styles.infoText}>
                Tu matrícula será validada por el equipo antes de tu primer análisis.
              </Text>
            </View>

            <PrimaryButton
              title="Crear cuenta médica"
              onPress={handleRegister}
              loading={loading}
              style={styles.registerBtn}
            />
          </View>

          {/* Login link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Iniciar sesión</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gradient: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
  },

  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  backText: {
    color: Colors.textPrimary,
    fontSize: Typography.size.base,
    fontFamily: Typography.fonts.medium,
  },

  // Header
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  iconWrapper: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    shadowColor: '#00E5CC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  iconGrad: {
    width: 60,
    height: 60,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.size.xl,
    fontFamily: Typography.fonts.bold,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.regular,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 20,
  },

  // Social
  socialRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl },
  socialBtnWrapper: { flex: 1 },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 8,
  },
  socialBtnText: {
    color: '#FFF',
    fontSize: Typography.size.base,
    fontFamily: Typography.fonts.semibold,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderDefault },
  dividerText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.xs,
    fontFamily: Typography.fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Form
  form: { gap: 0 },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0,229,204,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,204,0.2)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  infoText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.regular,
    lineHeight: 18,
  },

  registerBtn: { marginTop: Spacing.md },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.regular,
  },
  footerLink: {
    color: Colors.primary,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.semibold,
  },
});
