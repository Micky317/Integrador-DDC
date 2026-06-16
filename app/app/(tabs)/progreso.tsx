import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, Dimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../src/constants/theme';
import { GlassContainer } from '../../src/components/GlassContainer';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { useVinculosPadre } from '../../src/features/padres/hooks/useVinculos';
import { useNotificacionesPadre } from '../../src/features/padres/hooks/useNotificacionesPadre';
import { PacienteCard } from '../../src/features/pacientes/components/PacienteCard';
import { useAppStore } from '../../src/store/useAppStore';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MisBebesScreen() {
  const { misBebes, isLoading, vincular, isLinking, decodeQRFromImage } = useVinculosPadre();
  const { user } = useAppStore();
  
  // Registrar e iniciar notificaciones locales para el padre
  useNotificacionesPadre(misBebes);
  const [showModal, setShowModal] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isDecodingImage, setIsDecodingImage] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

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

  // Pedir permisos de cámara proactivamente cuando se abre el modal principal de vinculación
  React.useEffect(() => {
    if (showModal) {
      (async () => {
        try {
          if (!permission?.granted) {
            await requestPermission();
          }
        } catch (e) {
          console.warn('Error solicitando permisos de cámara proactivamente:', e);
        }
      })();
    }
  }, [showModal]);

  const handleOpenScanner = async () => {
    try {
      let granted = permission?.granted;
      if (!granted) {
        const res = await requestPermission();
        granted = res.granted;
      }
      
      // Cerramos el primer modal antes de abrir el escáner para evitar conflictos de Modals superpuestos en iOS/Android
      setShowModal(false);
      
      setTimeout(() => {
        setIsScanning(true);
      }, 300);
    } catch (err: any) {
      console.error('[Scanner] Error en handleOpenScanner:', err);
      setShowModal(false);
      setTimeout(() => {
        setIsScanning(true);
      }, 300);
    }
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setIsScanning(false);
    if (data) {
      let code = data.trim();
      if (code.includes('/')) {
        const parts = code.split('/');
        code = parts[parts.length - 1];
      }
      setCodigo(code.toUpperCase());
    }
    
    // Reabrimos el modal original tras un breve delay para que la cámara termine de desmontarse
    setTimeout(() => {
      setShowModal(true);
    }, 350);
  };

  const handleSelectFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso de Galería', 'Se requiere acceso a tu galería para cargar una imagen.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const uri = result.assets[0].uri;
      setIsDecodingImage(true);
      
      const decodedCode = await decodeQRFromImage(uri);
      setIsDecodingImage(false);

      if (decodedCode) {
        let code = decodedCode.trim();
        if (code.includes('/')) {
          const parts = code.split('/');
          code = parts[parts.length - 1];
        }
        setCodigo(code.toUpperCase());
        Alert.alert('Código QR Encontrado', `Se detectó el código: ${code}`);
      } else {
        Alert.alert('Error', 'No se pudo detectar ningún código QR en la imagen seleccionada. Por favor, asegúrate de que sea una foto clara del código QR.');
      }
    } catch (err) {
      setIsDecodingImage(false);
      console.error(err);
      Alert.alert('Error', 'Ocurrió un error al intentar procesar la imagen de la galería.');
    }
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
            <Text style={styles.modalDesc}>Escanea el código QR proporcionado por el médico o ingrésalo manualmente.</Text>

            {/* Opciones de Escaneo */}
            <View style={styles.qrOptionsRow}>
              <TouchableOpacity style={styles.qrOptionBtn} onPress={handleOpenScanner}>
                <Ionicons name="camera" size={20} color={Colors.primary} />
                <Text style={styles.qrOptionText}>Escanear QR</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.qrOptionBtn} onPress={handleSelectFromGallery} disabled={isDecodingImage}>
                {isDecodingImage ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons name="images" size={20} color={Colors.primary} />
                )}
                <Text style={styles.qrOptionText}>Cargar de Galería</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o escribe el código</Text>
              <View style={styles.dividerLine} />
            </View>

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

      {/* Modal para el escáner de cámara */}
      <Modal
        visible={isScanning}
        animationType="slide"
        onRequestClose={() => {
          setIsScanning(false);
          setTimeout(() => {
            setShowModal(true);
          }, 350);
        }}
      >
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={styles.scannerOverlay}>
            <View style={styles.scannerHeader}>
              <TouchableOpacity
                style={styles.scannerCloseBtn}
                onPress={() => {
                  setIsScanning(false);
                  setTimeout(() => {
                    setShowModal(true);
                  }, 350);
                }}
              >
                <Ionicons name="arrow-back" size={24} color="#FFF" />
              </TouchableOpacity>
              <Text style={styles.scannerTitle}>Escanear Código QR</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.scanTargetZone}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>

            <Text style={styles.scannerHint}>Alinea el código QR dentro del recuadro</Text>
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
  modalDesc: { color: Colors.textSecondary, fontSize: Typography.size.sm, textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 18 },
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
  },

  // QR Options in Modal
  qrOptionsRow: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: Spacing.md },
  qrOptionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.bgCardLight, borderWidth: 1, borderColor: Colors.borderDefault, borderRadius: Radius.md, paddingVertical: 12 },
  qrOptionText: { color: Colors.textPrimary, fontSize: Typography.size.sm, fontWeight: Typography.weight.medium },
  dividerRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: Spacing.sm, marginBottom: Spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderDefault },
  dividerText: { color: Colors.textMuted, fontSize: Typography.size.xs, paddingHorizontal: 8, textTransform: 'uppercase' },

  // Scanner Styles
  scannerContainer: { flex: 1, backgroundColor: '#000' },
  scannerOverlay: { flex: 1, justifyContent: 'space-between', padding: Spacing.xl, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  scannerHeader: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', paddingTop: 50 },
  scannerCloseBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  scannerTitle: { color: '#FFF', fontSize: Typography.size.md, fontWeight: Typography.weight.semibold },
  scanTargetZone: { width: 240, height: 240, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  scannerHint: { color: 'rgba(255,255,255,0.8)', fontSize: Typography.size.sm, textAlign: 'center', marginBottom: 60, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: Radius.sm },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: Colors.primary, borderWidth: 3 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
});
