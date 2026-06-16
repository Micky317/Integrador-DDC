import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Modal, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors, Spacing, Radius, Shadow, Typography } from '../constants/theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { GlassContainer } from '../components/GlassContainer';
import { KeyPoint } from '../services/analisis.service';
import { useToastStore } from '../store/useToastStore';

// Hooks & Logic
import { 
  useAnalisisIA, 
  useRecalcularAnalisis, 
  useGuardarAnalisis, 
  useAnalisisHistorial 
} from '../features/analisis/hooks/useAnalisis';

// Components
import { EditorPuntosModal } from '../features/analisis/components/EditorPuntosModal';
import { AnalysisResultCard } from '../features/analisis/components/AnalysisResultCard';
import { AnalisisImageCard } from '../features/analisis/components/AnalisisImageCard';
import { ZoomViewerModal } from '../features/analisis/components/ZoomViewerModal';

// Styles
import { analisisStyles as styles } from '../features/analisis/styles/analisis.styles';

export default function AnalisisScreen() {
  const params = useLocalSearchParams<{ imageUri?: string; pacienteId?: string; modoRapido?: string; analisisId?: string }>();
  const esRapido = params.modoRapido === '1';
  const esHistorial = !!params.analisisId;

  // Persistir la URI local para evitar que se pierda debido a actualizaciones de rutas de tabs
  const [localImageUri, setLocalImageUri] = useState<string>(params.imageUri || '');

  useEffect(() => {
    if (params.imageUri && params.imageUri !== localImageUri) {
      setLocalImageUri(params.imageUri);
    }
  }, [params.imageUri]);
  
  // Hooks custom de TanStack Query
  const { data: iaResult, isLoading: isLoadingIA, isError: isErrorIA, error: errorIA } = useAnalisisIA(localImageUri);
  const { data: dbResult, isLoading: isLoadingDB } = useAnalisisHistorial(params.analisisId);
  
  const recalcularMutation = useRecalcularAnalisis();
  const guardarMutation = useGuardarAnalisis();

  const isLoading = isLoadingIA || isLoadingDB;
  const isError = isErrorIA;

  // Normalizamos la data
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
    if (localImageUri) {
      Image.getSize(localImageUri, (w, h) => setImgOriginalSize({ w, h }), (err) => console.warn(err));
    }
  }, [localImageUri]);

  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (isError) {
      useToastStore.getState().showToast(
        'Análisis Fallido', 
        errorIA?.message || 'No se pudo procesar la radiografía. Intente con otra imagen.',
        'error'
      );
      router.back();
    }
  }, [isError]);

  const handleValidar = () => {
    if (!iaResult || !localImageUri || !params.pacienteId) {
      useToastStore.getState().showToast('Error', 'Faltan datos para guardar el análisis.', 'error');
      return;
    }
    setShowConfirmModal(true);
  };

  const executeGuardar = () => {
    setShowConfirmModal(false);
    guardarMutation.mutate({
      pacienteId: params.pacienteId!,
      originalUri: localImageUri,
      result: iaResult!,
      fechaRadiografia: (params as any).fechaRadiografia,
    });
  };

  const handleAjustarManual = () => {
    setPuntosActivos(displayData.puntos_clave ? JSON.parse(JSON.stringify(displayData.puntos_clave)) : []);
    setShowEditor(true);
  };

  const handleBack = () => {
    if (esHistorial && params.pacienteId) {
      router.replace({ pathname: '/(tabs)/paciente-detalle', params: { id: params.pacienteId } });
    } else {
      router.back();
    }
  };

  const currentImageUri = esHistorial 
    ? displayData.imagen_anotada_url
    : (iaResult?.imagen_anotada_base64 
        ? `data:image/jpeg;base64,${iaResult.imagen_anotada_base64}` 
        : localImageUri);

  return (
    <LinearGradient colors={['#090D1F', '#0D1B3E']} style={styles.gradient}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          <Text style={styles.backText}>Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Análisis Clínico</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.subHeader}>
          <Text style={styles.subLabel}>DDC-CHECK: PASITOS FIRMES</Text>
          <Text style={styles.mainTitle}>Análisis <Text style={styles.mainTitleBold}>IA YOLOv8</Text></Text>
        </View>

        {/* Tarjeta de Imagen Modular */}
        <AnalisisImageCard 
          key={currentImageUri}
          uri={currentImageUri}
          isLoading={isLoading || guardarMutation.isPending}
          scanId={esHistorial ? dbResult?.scanId : undefined}
          onPress={() => setShowFullImage(true)}
          loadingText={guardarMutation.isPending ? 'Guardando...' : (esHistorial ? 'Cargando...' : 'Analizando con IA...')}
        />

        {/* Resultados */}
        {isLoading ? (
          <View style={styles.loadingSection}>
            <Text style={styles.loadingSubText}>Detectando puntos clave de la cadera en tiempo real...</Text>
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
                <Text style={styles.historialBadgeText}>Este análisis ya está guardado en el historial clínico.</Text>
              </View>
            ) : esRapido ? (
              <>
                <View style={styles.rapidoBanner}>
                  <Ionicons name="information-circle-outline" size={18} color="#FFB400" />
                  <Text style={styles.rapidoBannerText}>
                    Análisis temporal. Crea un expediente para guardarlo permanentemente.
                  </Text>
                </View>
                <PrimaryButton
                  title="Crear Expediente Médico"
                  onPress={() => router.push({ pathname: '/(tabs)/nuevo-paciente', params: { imageUri: localImageUri || '', analisisRapido: '1' } })}
                  style={styles.validateBtn}
                />
                <PrimaryButton title="Ajustar Puntos Manualmente" onPress={handleAjustarManual} variant="secondary" />
              </>
            ) : (
              <>
                <PrimaryButton
                  title={guardarMutation.isPending ? 'Guardando...' : '✓ Validar y Guardar'}
                  onPress={handleValidar}
                  style={styles.validateBtn}
                  disabled={guardarMutation.isPending}
                />
                <PrimaryButton title="≘ Ajustar Puntos Manualmente" onPress={handleAjustarManual} variant="secondary" disabled={guardarMutation.isPending} />
              </>
            )}
          </>
        ) : null}
      </ScrollView>

      {/* Modales Modulares */}
      {showFullImage && (
        <ZoomViewerModal 
          visible={showFullImage}
          onClose={() => setShowFullImage(false)}
          imageUri={currentImageUri}
          originalSize={imgOriginalSize}
        />
      )}

      {showEditor && (
        <EditorPuntosModal
          visible={showEditor}
          onClose={() => setShowEditor(false)}
          imageUri={localImageUri}
          originalSize={imgOriginalSize}
          puntos={puntosActivos}
          setPuntos={setPuntosActivos}
          calculando={recalcularMutation.isPending}
          onSave={() => {
            recalcularMutation.mutate(
              { imageUri: localImageUri, puntos: puntosActivos },
              { onSuccess: () => setShowEditor(false) }
            );
          }}
        />
      )}

      {/* Modal de Confirmación de Guardado */}
      <Modal visible={showConfirmModal} animationType="fade" transparent={true}>
        <View style={customStyles.modalOverlay}>
          <GlassContainer intensity={40} style={customStyles.modalContainer}>
            <View style={customStyles.modalHeader}>
              <View style={customStyles.iconCircle}>
                <Ionicons name="help-circle-outline" size={32} color={Colors.primary} />
              </View>
              <Text style={customStyles.modalTitle}>¿Validar diagnóstico?</Text>
            </View>
            <Text style={customStyles.modalText}>
              Confirma que revisaste el análisis y está correcto. Se guardará permanentemente en el historial clínico.
            </Text>
            <View style={customStyles.modalFooter}>
              <TouchableOpacity 
                onPress={() => setShowConfirmModal(false)} 
                style={customStyles.cancelBtn}
                activeOpacity={0.7}
              >
                <Text style={customStyles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <PrimaryButton 
                title="Validar y Guardar" 
                onPress={executeGuardar} 
                style={customStyles.acceptBtn}
              />
            </View>
          </GlassContainer>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const customStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: Typography.size.lg,
    fontFamily: Typography.fonts.bold,
    textAlign: 'center',
  },
  modalText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.sm,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.base,
    fontFamily: Typography.fonts.semibold,
  },
  acceptBtn: {
    flex: 1.5,
    height: 50,
    borderRadius: Radius.md,
    minHeight: 0,
  },
});
