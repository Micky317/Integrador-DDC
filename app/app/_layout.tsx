import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { supabase } from '../src/lib/supabase';
import { authService } from '../src/services/auth.service';
import { useAppStore } from '../src/store/useAppStore';
import { View, ActivityIndicator } from 'react-native';

import { ToastContainer } from '../src/components/ToastContainer';

// Instanciar el QueryClient (La caché global)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3, // Reintentar 3 veces antes de fallar (resiliencia de red)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponencial
    },
    mutations: {
      retry: 2,
    }
  },
});

import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

// Prevent auto hide of splash screen while fonts load
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { setUser } = useAppStore();
  const [isInitializing, setIsInitializing] = useState(true);

  // Load premium fonts
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    let isMounted = true;

    async function checkUserSession() {
      if (!isMounted) return;
      console.log('--- LOGIN DEBUG: Iniciando verificación de sesión ---');
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('--- LOGIN DEBUG: Sesión obtenida:', session ? 'Existe' : 'No existe');
        
        if (session) {
          const userDetails = await authService.getCurrentUser();
          if (userDetails && isMounted) {
            setUser(userDetails);
            // Solo redirigir si el usuario está aterrizando en la raíz o login
            // Usar setImmediate para asegurar que el router esté listo
            setTimeout(() => {
              if (userDetails.role === 'medico') {
                router.replace('/pacientes');
              } else {
                router.replace('/progreso');
              }
            }, 100);
          }
        } else {
          console.log('--- LOGIN DEBUG: No hay sesión, redirigiendo a Login ---');
          // Solo redirigir si no estamos ya en el proceso de login
          setTimeout(() => {
            router.replace('/login');
          }, 100);
        }
      } catch (error) {
        console.error('--- LOGIN DEBUG ERROR ---', error);
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    }

    checkUserSession();

    // Reaccionar a cambios de sesión de supabase (login/logout de otras pestañas o expiración)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        router.replace('/login');
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        const userDetails = await authService.getCurrentUser();
        if (userDetails && isMounted) {
          setUser(userDetails);
          if (userDetails.role === 'medico') {
            router.replace('/pacientes');
          } else {
            router.replace('/progreso');
          }
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    console.log(`--- DEBUG: fontsLoaded=${fontsLoaded}, isInitializing=${isInitializing} ---`);
    if (!isInitializing && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isInitializing, fontsLoaded]);

  if (isInitializing || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#090D1F', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00E5CC" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <ToastContainer />
    </QueryClientProvider>
  );
}

