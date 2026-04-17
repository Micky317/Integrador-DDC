import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Modal, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { KeyPoint } from '../services/analisis.service';

// Importaciones de la nueva arquitectura de Features
import { useAnalisisIA, useRecalcularAnalisis, useGuardarAnalisis, useAnalisisHistorial } from '../features/analisis/hooks/useAnalisis';
import { EditorPuntosModal } from '../features/analisis/components/EditorPuntosModal';
import { AnalysisResultCard } from '../features/analisis/components/AnalysisResultCard';
import LottieView from 'lottie-react-native';

export default function AnalisisScreen() {
  const params = useLocalSearchParams<{ imageUri?: string; pacienteId?: string; modoRapido?: string; analisisId?: string }>();
  const esRapido = params.modoRapido === '1';
  const esHistorial = !!params.analisisId;
  
  // Hooks custom de TanStack Query
  const { data: iaResult, isLoading: isLoadingIA, isError: isErrorIA, error: errorIA } = useAnalisisIA(params.imageUri);
  const { data: dbResult, isLoading: isLoadingDB } = useAnalisisHistorial(params.analisisId);
  
  const recalcularMutation = useRecalcularAnalisis();
  const guardarMutation = useGuardarAnalisis();

  const isLoading = isLoadingIA || isLoadingDB;
  const isError = isErrorIA;
  const error = errorIA;

  // Normalizamos la data para que los componentes no se rompan
  const displayData = esHistorial ? {
    angulo_izquierda: dbResult?.anguloIzq || 0,
    angulo_derecha: dbResult?.anguloDer || 0,
    diagnostico_izquierda: dbResult?.diagnosticoIzq || 'NORMAL',
    diagnostico_derecha: dbResult?.diagnosticoDer || 'NORMAL',
    imagen_anotada_url: dbResult?.imagenAnotadaUrl,
    puntos_clave: [] as KeyPoint[],
  } : {
    angulo_izquierda: iaResult?.angulo_izquierda || 0,
    angulo_derecha: iaResult?.angulo_derecha || 0,
    diagnostico_izquierda: iaResult?.diagnostico_izquierda || 'NORMAL',
    diagnostico_derecha: iaResult?.diagnostico_derecha || 'NORMAL',
    puntos_clave: iaResult?.puntos_clave || [],
  };

  // Estados Locales UI
  const [showFullImage, setShowFullImage] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [imgOriginalSize, setImgOriginalSize] = useState({ w: 1000, h: 1000 });
  const [puntosActivos, setPuntosActivos] = useState<KeyPoint[]>([]);

  useEffect(() => {
    if (params.imageUri) {
      Image.getSize(params.imageUri, (w, h) => setImgOriginalSize({ w, h }), (err) => console.warn(err));
    }
  }, [params.imageUri]);

  // Manejo de Errores amigables (ej. foto que no es hueso)
  useEffect(() => {
    if (isError) {
      Alert.alert(
        'Análisis Fallido', 
        error?.message || 'No se pudo procesar la radiografía. Intente con otra imagen.',
        [{ text: 'Aceptar', onPress: () => router.back() }]
      );
    }
  }, [isError]);

  const handleValidar = () => {
    if (!iaResult || !params.imageUri || !params.pacienteId) {
      Alert.alert('Error', 'Faltan datos para guardar el análisis.');
      return;
    }

    Alert.alert('¿Validar diagnóstico?', 'Confirma que revisaste el análisis y está correcto para guardarlo en el historial.', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Validar y Guardar', 
        onPress: () => {
          guardarMutation.mutate({
            pacienteId: params.pacienteId!,
            originalUri: params.imageUri!,
            result: iaResult!
          });
        } 
      },
    ]);
  };

  const handleAjustarManual = () => {
    setPuntosActivos(displayData.puntos_clave ? JSON.parse(JSON.stringify(displayData.puntos_clave)) : []);
    setShowEditor(true);
  };

  const handleBack = () => {
    if (esHistorial && params.pacienteId) {
      // Si venimos del historial, forzamos el regreso al detalle del paciente
      router.replace({ pathname: '/(tabs)/paciente-detalle', params: { id: params.pacienteId } });
    } else {
      router.back();
    }
  };

  const currentImageUri = esHistorial 
    ? displayData.imagen_anotada_url
    : (iaResult?.imagen_anotada_base64 
        ? `data:image/jpeg;base64,${iaResult.imagen_anotada_base64}` 
        : params.imageUri);

  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.gradient}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          <Text style={styles.backText}>Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Clinical Analysis</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.subHeader}>
          <Text style={styles.subLabel}>DDC-CHECK: PASITOS FIRMES</Text>
          <Text style={styles.mainTitle}>Análisis <Text style={styles.mainTitleBold}>Automatizado</Text></Text>
        </View>

        {/* Scan Image Card */}
        <TouchableOpacity style={styles.imageCard} activeOpacity={0.9} onPress={() => setShowFullImage(true)}>
          {currentImageUri ? (
            <Image source={{ uri: currentImageUri }} style={styles.scanImage} resizeMode="contain" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="scan" size={48} color={Colors.primary} />
            </View>
          )}

          <View style={styles.scanIdTag}><Text style={styles.scanIdText}>SCAN_ID: {esHistorial ? dbResult?.scanId : 'NUEVO'}</Text></View>
          <View style={styles.zoomHint}><Ionicons name="expand-outline" size={16} color={Colors.primary} /><Text style={styles.zoomText}>Toca para ampliar</Text></View>

          {(isLoading || guardarMutation.isPending) && (
            <View style={styles.loadingOverlay}>
              <LottieView
                autoPlay
                style={{ width: 100, height: 100 }}
                source={require('../../assets/lottie/medical-radar.json')}
                colorFilters={[
                  { keypath: "Circle", color: Colors.primary }
                ]}
              />
              <Text style={styles.loadingText}>
                {guardarMutation.isPending ? 'Guardando en historial...' : (esHistorial ? 'Cargando registro...' : 'Procesando con YOLOv8...')}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Results Section */}
        {isLoading ? (
          <View style={styles.loadingSection}>
            <Text style={styles.loadingSubText}>El modelo YOLOv8 está detectando los puntos clave de la cadera</Text>
          </View>
        ) : (iaResult || dbResult) ? (
          <>
            <AnalysisResultCard 
              angulo_izquierda={displayData.angulo_izquierda}
              angulo_derecha={displayData.angulo_derecha}
              diagnostico_izquierda={displayData.diagnostico_izquierda as any}
              diagnostico_derecha={displayData.diagnostico_derecha as any}
            />
            {esHistorial ? (
              <View style={styles.historialBadge}>
                <Ionicons name="archive-outline" size={18} color={Colors.textMuted} />
                <Text style={styles.historialBadgeText}>Este análisis ya forma parte del historial clínico.</Text>
              </View>
            ) : esRapido ? (
              // Modo rapido: no hay paciente, ofrecer crear expediente
              <>
                <View style={styles.rapidoBanner}>
                  <Ionicons name="information-circle-outline" size={18} color="#FFB400" />
                  <Text style={styles.rapidoBannerText}>
                    Este análisis no se ha guardado. Registra al paciente para vincularlo.
                  </Text>
                </View>
                <PrimaryButton
                  title="Crear Expediente con este Análisis"
                  onPress={() =>
                    router.push({
                      pathname: '/(tabs)/nuevo-paciente',
                      params: {
                        imageUri: params.imageUri ?? '',
                        analisisRapido: '1',
                      },
                    })
                  }
                  style={styles.validateBtn}
                />
                <PrimaryButton title="✂  Ajustar Puntos Manualmente" onPress={handleAjustarManual} variant="secondary" />
              </>
            ) : (
              // Flujo normal: guardar en historial del paciente
              <>
                <PrimaryButton
                  title={guardarMutation.isPending ? 'Guardando...' : '✓  Guardar Diagnóstico'}
                  onPress={handleValidar}
                  style={styles.validateBtn}
                  disabled={guardarMutation.isPending}
                />
                <PrimaryButton title="≘  Ajustar Puntos Manualmente" onPress={handleAjustarManual} variant="secondary" disabled={guardarMutation.isPending} />
              </>
            )}
          </>
        ) : null}
      </ScrollView>

      {/* Solo visualización Full Image Modal */}
      <Modal visible={showFullImage} transparent={true} animationType="fade">
        <View style={styles.modalBg}>
          <TouchableOpacity style={styles.closeModalBtn} onPress={() => setShowFullImage(false)}>
            <Ionicons name="close-circle" size={44} color="#FFF" />
          </TouchableOpacity>
          {currentImageUri && (
            <ScrollView
              style={{ flex: 1, width: '100%' }}
              contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
              maximumZoomScale={5}
              minimumZoomScale={1}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              centerContent
            >
              <Image 
                source={{ uri: currentImageUri }} 
                style={{ width: Dimensions.get('window').width, height: Dimensions.get('window').height }} 
                resizeMode="contain" 
              />
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Editor Modal */}
      <EditorPuntosModal
        visible={showEditor}
        onClose={() => setShowEditor(false)}
        imageUri={params.imageUri || ''}
        originalSize={imgOriginalSize}
        puntos={puntosActivos}
        setPuntos={setPuntosActivos}
        calculando={recalcularMutation.isPending}
        onSave={() => {
          recalcularMutation.mutate(
            { imageUri: params.imageUri!, puntos: puntosActivos },
            { onSuccess: () => setShowEditor(false) }
          );
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingTop: 58, paddingBottom: Spacing.sm },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: Colors.textPrimary, fontSize: Typography.size.base },
  headerTitle: { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  subHeader: { marginBottom: Spacing.md },
  subLabel: { color: Colors.primary, fontSize: Typography.size.xs, fontWeight: Typography.weight.bold, letterSpacing: 1.5, marginBottom: 4 },
  mainTitle: { color: Colors.textSecondary, fontSize: Typography.size.xxl, fontWeight: Typography.weight.regular },
  mainTitleBold: { color: Colors.textPrimary, fontWeight: Typography.weight.extrabold },
  imageCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, overflow: 'hidden', marginBottom: Spacing.md, height: 220, borderWidth: 1, borderColor: Colors.borderCard, ...Shadow.card },
  scanImage: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.bgCardLight },
  scanIdTag: { position: 'absolute', top: 8, left: 10, backgroundColor: Colors.bgDeep + 'CC', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  scanIdText: { color: Colors.primary, fontSize: 10, fontWeight: Typography.weight.bold, letterSpacing: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.bgDeep + 'CC', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textPrimary, fontSize: Typography.size.sm },
  loadingSection: { alignItems: 'center', paddingVertical: Spacing.xl },
  loadingSubText: { color: Colors.textSecondary, fontSize: Typography.size.sm, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
  rapidoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 180, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 0, 0.25)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  rapidoBannerText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    lineHeight: 18,
  },
  validateBtn: { marginBottom: Spacing.sm },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '100%', height: '80%' },
  closeModalBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  zoomHint: { position: 'absolute', bottom: 10, right: 12, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  zoomText: { color: Colors.primary, fontSize: 10, fontWeight: 'bold' },
  historialBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.bgCard, padding: 12, borderRadius: Radius.md, borderLeftWidth: 3, borderLeftColor: Colors.textMuted },
  historialBadgeText: { color: Colors.textSecondary, fontSize: 12 },
});
