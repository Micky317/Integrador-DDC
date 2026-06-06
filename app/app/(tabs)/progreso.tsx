import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../src/constants/theme';
import { GlassContainer } from '../../src/components/GlassContainer';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { useVinculosPadre } from '../../src/features/padres/hooks/useVinculos';
import { PacienteCard } from '../../src/features/pacientes/components/PacienteCard';
import { useAppStore } from '../../src/store/useAppStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MisBebesScreen() {
  const { misBebes, isLoading, vincular, isLinking } = useVinculosPadre();
  const { user } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [codigo, setCodigo] = useState('');

  const handleCloseModal = () => {
    setShowModal(false);
    setCodigo('');
  };

  const handleVincular = () => {
    if (!codigo) return;
    vincular(codigo, {
      onSuccess: () => {
        handleCloseModal();
      }
    });
  };

  const renderEducationalCards = () => {
    const tips = [
      { id: 1, title: 'Apego y Displasia', desc: 'El porteo ergonómico ayuda al tratamiento.', icon: 'heart' },
      { id: 2, title: 'Ejercicios en Casa', desc: '10 min al día marcan la diferencia.', icon: 'fitness' },
      { id: 3, title: 'Control de Pañal', desc: 'Aprende a cambiarlo con el arnés.', icon: 'leaf' },
    ];

    return (
      <View style={styles.eduSection}>
        <Text style={styles.sectionTitle}>Biblioteca de Cuidados</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eduScroll}>
          {tips.map((tip) => (
            <GlassContainer key={tip.id} style={styles.eduCard}>
              <View style={styles.eduIconContainer}>
                <Ionicons name={tip.icon as any} size={24} color={Colors.primary} />
              </View>
              <Text style={styles.eduCardTitle}>{tip.title}</Text>
              <Text style={styles.eduCardDesc} numberOfLines={2}>{tip.desc}</Text>
            </GlassContainer>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderHeroStats = (bebe: any) => {
    // Lógica de seguridad para evitar crashes
    if (!bebe) return null;
    const nombre = bebe.nombreCompleto || bebe.nombre || 'Bebé';
    const inicial = nombre.charAt(0).toUpperCase();

    // Lógica de color consistente con las tarjetas del médico
    const avatarColor = Colors.avatarVariants[Math.abs(bebe.id.charCodeAt(0)) % Colors.avatarVariants.length];

    return (
      <View style={styles.heroContainer}>
        <GlassContainer style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={[styles.heroAvatar, { backgroundColor: `${avatarColor}20`, borderColor: avatarColor }]}>
              <Text style={[styles.heroAvatarText, { color: avatarColor }]}>{inicial}</Text>
            </View>
            <View>
              <Text style={styles.heroName}>{nombre}</Text>
              <Text style={styles.heroStatus}>En tratamiento activo</Text>
            </View>
            <TouchableOpacity
              style={styles.heroBadge}
              onPress={() => router.push({ pathname: '/(tabs)/paciente-detalle', params: { id: bebe.id } })}
            >
              <Ionicons name="chevron-forward" size={20} color={avatarColor} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Último Análisis</Text>
              <Text style={[styles.statValue, { color: Colors.statusNormal }]}>Normal</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Racha Ejercicios</Text>
              <Text style={styles.statValue}>5 días</Text>
            </View>
          </View>

          <PrimaryButton
            title="Iniciar Rehabilitación"
            icon="play-circle"
            onPress={() => {
              console.log('[Progreso] Navegando a rehab con bebe.id:', bebe.id);
              router.push({ pathname: '/rehabilitacion', params: { id: bebe.id } });
            }}
            style={styles.heroActionBtn}
          />
        </GlassContainer>
      </View>
    );
  };

  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.gradient}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hola, {user?.name?.split(' ')[0] || 'Padre'}</Text>
          <Text style={styles.title}>Panel de Control</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add" size={22} color={Colors.bgDeep} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : misBebes && misBebes.length > 0 ? (
          <>
            {/* Si solo hay uno, mostramos el Hero masivo */}
            {misBebes.length === 1 ? (
              renderHeroStats(misBebes[0])
            ) : (
              <View style={styles.listSection}>
                <Text style={styles.sectionTitle}>Tus Bebés</Text>
                {misBebes.map((bebe) => (
                  <PacienteCard
                    key={bebe.id}
                    paciente={bebe}
                    onPress={() => router.push({ pathname: '/(tabs)/paciente-detalle', params: { id: bebe.id } })}
                  />
                ))}
              </View>
            )}

            {renderEducationalCards()}

            <View style={styles.extraMargin} />
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <GlassContainer intensity={10} style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="heart-half" size={48} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Bienvenido a Pasitos Firmes</Text>
              <Text style={styles.emptySub}>
                Aquí centralizarás todo el seguimiento médico y ejercicios de tus hijos. Comienza vinculando a tu primer bebé.
              </Text>
              <PrimaryButton
                title="Vincular con Código"
                icon="link-outline"
                onPress={() => setShowModal(true)}
                style={{ width: '100%', marginTop: Spacing.xl }}
              />
            </GlassContainer>
          </View>
        )}
      </ScrollView>

      {/* Modal para ingresar código */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={handleCloseModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TouchableOpacity style={styles.closeBtn} onPress={handleCloseModal}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>

            <Ionicons name="link" size={40} color={Colors.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Vincular Bebé</Text>
            <Text style={styles.modalDesc}>El médico te proporcionó un código único para cada paciente.</Text>

            <TextInput
              style={styles.input}
              placeholder="DDC-A1B2"
              placeholderTextColor={Colors.textMuted}
              value={codigo}
              onChangeText={setCodigo}
              autoCapitalize="characters"
              maxLength={10}
            />

            <PrimaryButton
              title="Confirmar Vínculo"
              onPress={handleVincular}
              loading={isLinking}
              disabled={!codigo || isLinking}
              style={{ width: '100%' }}
            />
          </View>
        </View>
      </Modal>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.xl,
    paddingTop: 70,
    paddingBottom: Spacing.md
  },
  welcomeText: { color: Colors.textSecondary, fontSize: Typography.size.base },
  title: { color: Colors.textPrimary, fontSize: Typography.size.xxl, fontWeight: Typography.weight.bold },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.glow
  },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100, paddingTop: Spacing.md },
  center: { marginTop: 100, alignItems: 'center' },

  // Hero Styles
  heroContainer: { marginBottom: Spacing.xl },
  heroCard: { padding: Spacing.lg },
  heroHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xl },
  heroAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.accent
  },
  heroAvatarText: { color: Colors.accent, fontSize: 24, fontWeight: 'bold' },
  heroName: { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },
  heroStatus: { color: Colors.textSecondary, fontSize: Typography.size.sm },
  heroBadge: { marginLeft: 'auto', padding: 8 },

  heroStatsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.xl },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)' },
  statLabel: { color: Colors.textSecondary, fontSize: Typography.size.xs, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { color: Colors.textPrimary, fontSize: Typography.size.md, fontWeight: Typography.weight.bold },
  heroActionBtn: { width: '100%' },

  // List Section
  listSection: { marginBottom: Spacing.xl },
  sectionTitle: { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, marginBottom: Spacing.md, paddingLeft: 4 },

  // Educational Section
  eduSection: { marginBottom: Spacing.xl },
  eduScroll: { paddingRight: Spacing.xl },
  eduCard: { width: SCREEN_WIDTH * 0.7, padding: Spacing.md, marginRight: Spacing.md },
  eduIconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(0, 229, 204, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  eduCardTitle: { color: Colors.textPrimary, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, marginBottom: 4 },
  eduCardDesc: { color: Colors.textSecondary, fontSize: Typography.size.sm, lineHeight: 18 },

  // Empty State
  emptyContainer: { marginTop: 20 },
  emptyCard: { padding: Spacing.xl, alignItems: 'center', textAlign: 'center' },
  emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(0, 229, 204, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, textAlign: 'center' },
  emptySub: { color: Colors.textSecondary, fontSize: Typography.size.md, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  extraMargin: { height: 40 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: Spacing.xl },
  modalCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center' },
  modalTitle: { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, marginBottom: 8 },
  modalDesc: { color: Colors.textSecondary, fontSize: Typography.size.sm, textAlign: 'center', marginBottom: 24, lineHeight: 18 },
  closeBtn: { position: 'absolute', top: 16, right: 16 },
  input: {
    width: '100%',
    height: 60,
    backgroundColor: Colors.bgCardLight,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderDefault,
    color: Colors.textPrimary,
    fontSize: Typography.size.xl,
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: Spacing.xl
  }
});
