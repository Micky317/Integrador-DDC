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
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { AppInput } from '../components/AppInput';
import { PrimaryButton } from '../components/PrimaryButton';
import { UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { authService } from '../services/auth.service';
import { useAppStore } from '../store/useAppStore';
import { useToastStore } from '../store/useToastStore';
import { TouchableScale } from '../components/TouchableScale';
import { GlassContainer } from '../components/GlassContainer';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [role, setRole] = useState<UserRole>('medico');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { setUser } = useAppStore();

  // Limpiar campos al cambiar de rol
  React.useEffect(() => {
    setEmail('');
    setPassword('');
  }, [role]);

  const handleLogin = async () => {
    if (!role || !email || !password) {
      useToastStore.getState().showToast('Campos requeridos', 'Por favor complete correo y contraseña.', 'error');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) throw error;

      if (data.user) {
        const userDetails = await authService.getCurrentUser();
        
        if (userDetails) {
          // VALIDACIÓN DE ROL: Evitar entrar con el rol equivocado seleccionado
          if (userDetails.role !== role) {
            await supabase.auth.signOut(); // Desloguear si no coincide
            throw new Error(`Esta cuenta está registrada como ${userDetails.role === 'medico' ? 'Médico' : 'Padre'}. Por favor selecciona la pestaña correcta.`);
          }

          setUser(userDetails);
          if (userDetails.role === 'medico') {
            router.replace('/(tabs)/pacientes');
          } else {
            router.replace('/(tabs)/progreso');
          }
        }
      }
    } catch (err: any) {
      useToastStore.getState().showToast('Error de acceso', err?.message || 'Credenciales inválidas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    if (provider === 'apple') {
      useToastStore.getState().showToast('Próximamente', 'El inicio con Apple requiere configuración en Apple Developer Portal.', 'info');
      return;
    }

    setLoading(true);
    try {
      // Flujo DIRECTO con Google (Desktop client ID + PKCE)
      // Esto bypasea el redirect de Supabase que rechaza exp://
      const GOOGLE_DESKTOP_CLIENT_ID = '541338065702-8m5ubsh986t4ak5u5u7nme3kcljkvi9g.apps.googleusercontent.com';
      // Google Desktop apps aceptan localhost. iOS 16+ intercepta localhost redirects nativamente.
      const redirectUri = 'http://localhost:8081';
      console.log('=== OAUTH DIRECTO: redirectUri =', redirectUri);

      // Generar PKCE code verifier y challenge
      import('expo-crypto').then(async (Crypto) => {
        const codeVerifier = Array.from(
          { length: 64 },
          () => Math.random().toString(36)[2]
        ).join('');
        
        const digest = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          codeVerifier,
          { encoding: Crypto.CryptoEncoding.BASE64 }
        );
        const codeChallenge = digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

        // Construir URL de autorización de Google directamente
        const params = new URLSearchParams({
          client_id: GOOGLE_DESKTOP_CLIENT_ID,
          redirect_uri: redirectUri,
          response_type: 'code',
          scope: 'openid email profile',
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
          access_type: 'offline',
          prompt: 'select_account',
        });

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        console.log('=== OAUTH DIRECTO: abriendo Google Auth...');

        // Abrir el navegador
        const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
        console.log('=== OAUTH DIRECTO: result.type =', result.type);

        if (result.type === 'success') {
          console.log('=== OAUTH DIRECTO: URL de retorno =', result.url);
          
          // Extraer el código de autorización del URL de retorno
          const returnUrl = new URL(result.url);
          const code = returnUrl.searchParams.get('code');

          if (!code) {
            throw new Error('No se recibió el código de autorización de Google');
          }

          // Intercambiar el código por tokens en Google (PKCE, no necesita client secret)
          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: GOOGLE_DESKTOP_CLIENT_ID,
              code,
              code_verifier: codeVerifier,
              grant_type: 'authorization_code',
              redirect_uri: redirectUri,
            }).toString(),
          });

          const tokens = await tokenResponse.json();
          console.log('=== OAUTH DIRECTO: tokens recibidos, id_token presente:', !!tokens.id_token);

          if (!tokens.id_token) {
            throw new Error('Google no devolvió un ID token válido');
          }

          // Autenticar en Supabase con el ID token de Google
          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: tokens.id_token,
          });

          if (error) throw error;

          if (data.session) {
            const userDetails = await authService.getCurrentUser();
            if (userDetails) {
              setUser(userDetails);
              if (userDetails.role === 'medico') {
                router.replace('/pacientes');
              } else {
                router.replace('/progreso');
              }
            }
          }
        } else {
          setLoading(false);
        }
      }).catch((err) => {
        console.error('=== OAUTH ERROR ===', err);
        useToastStore.getState().showToast('Error', err.message || 'No se pudo conectar con Google.', 'error');
        setLoading(false);
      });

    } catch (err: any) {
      console.error('=== OAUTH ERROR ===', err);
      useToastStore.getState().showToast('Error', err.message || 'No se pudo conectar con Google.', 'error');
      setLoading(false);
    }
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
          {/* Logo / Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#00E5CC', '#4D6EE3']}
                style={styles.logoGradient}
              >
                <Ionicons name="happy-outline" size={28} color="#090D1F" />
              </LinearGradient>
            </View>
            <Text style={styles.appName}>DDC-Check</Text>
            <Text style={styles.tagline}>PASITOS FIRMES</Text>
          </View>

          {/* Role Selector */}
          <View style={styles.roleSelector}>
            <TouchableOpacity
              style={[styles.roleTab, role === 'medico' && styles.roleTabActive]}
              onPress={() => setRole('medico')}
              activeOpacity={0.8}
            >
              {role === 'medico' && (
                <LinearGradient
                  colors={Colors.gradientBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                  // borderRadius
                />
              )}
              <Text
                style={[
                  styles.roleTabText,
                  role === 'medico' && styles.roleTabTextActive,
                ]}
              >
                Soy Doctor
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.roleTab, role === 'padre' && styles.roleTabActive]}
              onPress={() => setRole('padre')}
              activeOpacity={0.8}
            >
              {role === 'padre' && (
                <LinearGradient
                  colors={Colors.gradientBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Text
                style={[
                  styles.roleTabText,
                  role === 'padre' && styles.roleTabTextActive,
                ]}
              >
                Soy Padre
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
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
              icon="lock-closed-outline"
              placeholder="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity style={styles.forgotRow} activeOpacity={0.7}>
              <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>

            <PrimaryButton
              title="Iniciar Sesión"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginBtn}
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o ingresa rápidamente</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <TouchableScale
                style={styles.socialBtnWrapper}
                onPress={() => handleSocialLogin('google')}
              >
                <GlassContainer intensity={20} style={styles.socialBtn}>
                  <Ionicons name="logo-google" size={22} color="#FFF" />
                  <Text style={styles.socialBtnText}>Google</Text>
                </GlassContainer>
              </TouchableScale>

              <TouchableScale
                style={styles.socialBtnWrapper}
                onPress={() => handleSocialLogin('apple')}
              >
                <GlassContainer intensity={20} style={styles.socialBtn}>
                  <Ionicons name="logo-apple" size={24} color="#FFF" style={{ marginBottom: 2 }} />
                  <Text style={styles.socialBtnText}>Apple</Text>
                </GlassContainer>
              </TouchableScale>
            </View>
          </View>

          {/* Register link — contextual by role */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>
              {role === 'medico' ? 'Medico nuevo? ' : 'Primera vez? '}
            </Text>
            <TouchableOpacity
              onPress={() =>
                router.push(role === 'medico' ? '/(auth)/register-doctor' : '/(auth)/register-padre')
              }
              activeOpacity={0.7}
            >
              <Text style={styles.registerLink}>Crear cuenta</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <Text style={styles.footer}>
            TECNOLOGIA MEDICA AVANZADA{'\n'}ESPECIALIZADA EN DISPLASIA DE CADERA
          </Text>
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
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },

  // Header
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  logoContainer: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...{
      shadowColor: '#00E5CC',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 12,
    },
  },
  logoGradient: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    color: Colors.textPrimary,
    fontSize: Typography.size.xxl,
    fontWeight: Typography.weight.extrabold,
    letterSpacing: 1,
  },
  tagline: {
    color: Colors.primary,
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    letterSpacing: 4,
    marginTop: 2,
  },

  // Role selector
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    marginBottom: Spacing.xl,
    padding: 4,
    overflow: 'hidden',
  },
  roleTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  roleTabActive: {
    // gradient applied inside
  },
  roleTabText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.medium,
  },
  roleTabTextActive: {
    color: Colors.bgDeep,
    fontWeight: Typography.weight.bold,
  },

  // Form
  form: { gap: 0 },
  forgotRow: { alignItems: 'flex-end', marginBottom: Spacing.lg, marginTop: 4 },
  forgotText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.medium,
  },
  loginBtn: { marginTop: 4 },

  // Social Auth
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderDefault,
  },
  dividerText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.xs,
    fontFamily: Typography.fonts.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  socialRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  socialBtnWrapper: {
    flex: 1,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 10,
  },
  socialBtnText: {
    color: '#FFF',
    fontSize: Typography.size.md,
    fontFamily: Typography.fonts.semibold,
  },

  // Footer
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  registerText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.regular,
  },
  registerLink: {
    color: Colors.primary,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.semibold,
  },
  footer: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    textAlign: 'center',
    marginTop: Spacing.lg,
    letterSpacing: 1,
    lineHeight: 18,
    fontFamily: Typography.fonts.regular,
  },
});
