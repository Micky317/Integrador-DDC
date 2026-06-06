import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../constants/theme';
import { AppInput } from '../components/AppInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { TouchableScale } from '../components/TouchableScale';
import { GlassContainer } from '../components/GlassContainer';
import { supabase } from '../lib/supabase';
import { useToastStore } from '../store/useToastStore';
import { authStyles as styles } from '../features/auth/styles/auth.styles';

export default function RegisterPadreScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { showToast } = useToastStore();

  const handleRegister = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      showToast('Campos incompletos', 'Por favor completa nombre, correo y contraseña.', 'error');
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
            rol: 'padre',
            telefono: phone,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Insertar perfil en la tabla profiles
        await supabase.from('profiles').upsert({
          id: data.user.id,
          nombre_completo: fullName,
          rol: 'padre',
          telefono: phone,
        });

        showToast(
          '¡Bienvenido!',
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
      `La integración con ${provider} requiere configuración de IDs.`,
      'info'
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
              <LinearGradient colors={['#FFB400', '#FF8000']} style={styles.iconGrad}>
                <Ionicons name="people-outline" size={26} color="#090D1F" />
              </LinearGradient>
            </View>
            <Text style={styles.title}>Registro Familiar</Text>
            <Text style={styles.subtitle}>
              Acompaña el desarrollo de tu pequeño{'\n'}con el respaldo de especialistas
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
            <Text style={styles.dividerText}>o con tu correo</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            <AppInput
              icon="person-outline"
              placeholder="Nombre completo"
              value={fullName}
              onChangeText={fullName => setFullName(fullName)}
              autoCapitalize="words"
            />
            <AppInput
              icon="at-outline"
              placeholder="Correo electrónico"
              value={email}
              onChangeText={email => setEmail(email)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <AppInput
              icon="call-outline"
              placeholder="Teléfono (opcional)"
              value={phone}
              onChangeText={phone => setPhone(phone)}
              keyboardType="phone-pad"
            />
            <AppInput
              icon="lock-closed-outline"
              placeholder="Contraseña (mín. 8 caracteres)"
              value={password}
              onChangeText={pass => setPassword(pass)}
              secureTextEntry
            />
            <AppInput
              icon="shield-checkmark-outline"
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChangeText={pass => setConfirmPassword(pass)}
              secureTextEntry
            />

            <PrimaryButton
              title="Crear cuenta"
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
