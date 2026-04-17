import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { PacienteCard } from '../features/pacientes/components/PacienteCard';
import { useListaPacientes } from '../features/pacientes/hooks/usePacientes';
import { Skeleton } from '../components/Skeleton';
import { useAppStore } from '../store/useAppStore';
import LottieView from 'lottie-react-native';

// Animacion de pulso para el icono de scan
function usePulse() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.18, duration: 900, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [scale]);
  return scale;
}

export default function PacientesScreen() {
  const { user } = useAppStore();
  const { search, setSearch, activeFilter, setActiveFilter, filteredPacientes, isLoading, FILTER_TABS } = useListaPacientes();
  const pulseScale = usePulse();

  useEffect(() => {
    if (user?.role === 'padre') {
      router.replace('/progreso');
    }
  }, [user]);

  if (user?.role === 'padre') return null;

  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.gradient}>
      <StatusBar style="light" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.topGreeting}>Panel Médico</Text>
          <Text style={styles.topTitle}>Mis Pacientes</Text>
        </View>
        <TouchableOpacity style={styles.avatarBtn} activeOpacity={0.8}>
          <LinearGradient colors={['#4D6EE3', '#00E5CC']} style={styles.avatarGrad}>
            <Ionicons name="person" size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ============================================ */}
      {/*   HERO CARD — Análisis Rápido               */}
      {/* ============================================ */}
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/(tabs)/cargar-imagen', params: { modoRapido: '1', ts: Date.now() } })}
        activeOpacity={0.92}
        style={styles.heroCard}
      >
        {/* Glassmorphism base */}
        <BlurView intensity={25} tint="dark" style={StyleSheet.absoluteFill} />

        {/* Capa de color con gradiente */}
        <LinearGradient
          colors={['rgba(77, 110, 227, 0.35)', 'rgba(0, 229, 204, 0.08)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Borde de fibra optica */}
        <View style={styles.heroBorder} />

        {/* Circulo de "glow" decorativo de fondo */}
        <View style={styles.heroGlowOrb} />

        {/* Contenido */}
        <View style={styles.heroContent}>
          <View style={styles.heroLeft}>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>MODO IA</Text>
            </View>
            <Text style={styles.heroTitle}>Análisis Rápido</Text>
            <Text style={styles.heroSub}>
              Evalúa una radiografía{'\n'}sin registrar al paciente.
            </Text>
            <View style={styles.heroCta}>
              <Text style={styles.heroCtaText}>Escanear ahora</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
            </View>
          </View>

          {/* Icono animado con glow */}
          <View style={styles.heroIconArea}>
            <View style={styles.heroGlowRing}>
              <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
                <View style={styles.heroIconCircle}>
                  <Ionicons name="scan" size={36} color={Colors.primary} />
                </View>
              </Animated.View>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nombre o ID..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity key={tab.key} onPress={() => setActiveFilter(tab.key)} activeOpacity={0.8}>
            {activeFilter === tab.key ? (
              <LinearGradient colors={Colors.gradientBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.filterTabActive}>
                <Text style={styles.filterTextActive}>{tab.label}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.filterTab}>
                <Text style={styles.filterText}>{tab.label}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.list}>
          <Skeleton height={90} borderRadius={Radius.lg} style={{ marginBottom: 12 }} />
          <Skeleton height={90} borderRadius={Radius.lg} style={{ marginBottom: 12 }} />
          <Skeleton height={90} borderRadius={Radius.lg} style={{ marginBottom: 12 }} />
        </View>
      ) : (
        <FlatList
          data={filteredPacientes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PacienteCard 
              paciente={item} 
              onPress={() => router.push({ pathname: '/(tabs)/paciente-detalle', params: { id: item.id } })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <LottieView
                autoPlay
                style={{ width: 150, height: 150 }}
                source={require('../../assets/lottie/empty-state.json')}
              />
              <Text style={styles.emptyText}>Sin pacientes todavía</Text>
            </View>
          }
        />
      )}

      {/* FAB — Nuevo Paciente */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => router.push('/(tabs)/nuevo-paciente')}>
        <LinearGradient colors={Colors.gradientBtn} style={styles.fabGrad}>
          <Ionicons name="add" size={28} color={Colors.bgDeep} />
        </LinearGradient>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 58,
    paddingBottom: Spacing.md,
  },
  topGreeting: {
    color: Colors.textMuted,
    fontSize: Typography.size.xs,
    fontFamily: Typography.fonts.medium,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  topTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.xl,
    fontFamily: Typography.fonts.bold,
    marginTop: 2,
  },
  avatarBtn: { borderRadius: Radius.round, overflow: 'hidden' },
  avatarGrad: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },

  // ==========================================
  // Hero Card
  // ==========================================
  heroCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    height: 140,
    // Shadow de glow intenso
    shadowColor: '#4D6EE3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 16,
  },
  heroBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(77, 110, 227, 0.55)',
  },
  heroGlowOrb: {
    position: 'absolute',
    right: -30,
    bottom: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(0, 229, 204, 0.07)',
  },
  heroContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  heroLeft: {
    flex: 1,
    gap: 4,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 229, 204, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 204, 0.3)',
    borderRadius: Radius.round,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  heroBadgeText: {
    color: Colors.primary,
    fontSize: Typography.size.xs,
    fontFamily: Typography.fonts.bold,
    letterSpacing: 1.5,
  },
  heroTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontFamily: Typography.fonts.bold,
    letterSpacing: 0.3,
  },
  heroSub: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.regular,
    lineHeight: 18,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  heroCtaText: {
    color: Colors.primary,
    fontSize: Typography.size.xs,
    fontFamily: Typography.fonts.semibold,
    letterSpacing: 0.5,
  },

  heroIconArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: Spacing.md,
  },
  heroGlowRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(77, 110, 227, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(77, 110, 227, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 229, 204, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 204, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ==========================================
  // Search & Filtros
  // ==========================================
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.xl,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    paddingVertical: 12,
    fontSize: Typography.size.base,
    fontFamily: Typography.fonts.regular,
  },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  filterTabActive: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.round },
  filterText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.xs,
    fontFamily: Typography.fonts.semibold,
  },
  filterTextActive: {
    color: Colors.bgDeep,
    fontSize: Typography.size.xs,
    fontFamily: Typography.fonts.bold,
  },

  list: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: Colors.textMuted, fontSize: Typography.size.md, fontFamily: Typography.fonts.regular },

  fab: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    borderRadius: 28,
    overflow: 'hidden',
    ...Shadow.glow,
  },
  fabGrad: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
});
