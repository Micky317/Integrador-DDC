import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image,
  Dimensions,
  BackHandler,
} from 'react-native';
import { useToastStore } from '../store/useToastStore';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors, Typography, Spacing, Radius, Shadow } from '../constants/theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { GlassContainer } from '../components/GlassContainer';
import { pacientesService } from '../services/pacientes.service';
import { styles } from './CargarImagenScreen.styles';
import { formatLocalDate } from '../utils/helpers';
import { ZoomViewerModal } from '../features/analisis/components/ZoomViewerModal';

type ImageSource = 'dicom' | 'galeria' | 'camara' | null;

export default function CargarImagenScreen() {
  const { pacienteId, modoRapido, ts } = useLocalSearchParams<{ pacienteId: string; modoRapido: string; ts?: string }>();
  const esRapido = modoRapido === '1';
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<ImageSource>(null);
  const [showFullImage, setShowFullImage] = useState(false);
  
  // Estado para la fecha de la placa
  const [fechaPlaca, setFechaPlaca] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Cada vez que la pantalla gana el foco (cuando entras a hacer un nuevo análisis)
      // reseteamos la fecha al día de hoy y vaciamos la imagen previa.
      setFechaPlaca(new Date());
      setImageUri(null);
      setSelectedSource(null);
    }, [pacienteId, ts]) // El parámetro ts (timestamp) nos ayuda a forzar reset si viene en los params
  );

  const onChangeDate = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) setFechaPlaca(selectedDate);
  };

  const { data: paciente } = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => pacientesService.getPacienteById(pacienteId ?? ''),
    enabled: !!pacienteId && !esRapido,
  });

  // Manejador del botón Atrás
  const handleBack = () => {
    if (imageUri) {
      setImageUri(null);
      setSelectedSource(null);
    } else {
      router.back();
    }
  };

  // Interceptar el botón físico "Atrás" en Android
  React.useEffect(() => {
    const onHardwareBack = () => {
      if (imageUri) {
        setImageUri(null);
        setSelectedSource(null);
        return true; // Evitar el comportamiento por defecto
      }
      return false; 
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => backHandler.remove();
  }, [imageUri]);

  // Vaciar la pantalla si entramos con una pulsación nueva (nuevo "ts")
  React.useEffect(() => {
    setImageUri(null);
    setSelectedSource(null);
  }, [ts, pacienteId]);

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      useToastStore.getState().showToast('Permiso requerido', 'Se necesita acceso a la galería.', 'warning');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3], // Cuadro de recorte rectangular horizontal
      quality: 0.95,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setSelectedSource('galeria');
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      useToastStore.getState().showToast('Permiso requerido', 'Se necesita acceso a la cámara.', 'warning');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true, 
      aspect: [4, 3], // Cuadro de recorte rectangular horizontal para evitar "rebote"
      quality: 0.95,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setSelectedSource('camara');
    }
  };

  const handleDICOM = () => {
    useToastStore.getState().showToast('Próximamente', 'Importación DICOM estará disponible pronto.', 'info');
    setSelectedSource('dicom');
  };

  const handleAnalizarImagen = () => {
    if (!imageUri && selectedSource !== 'dicom') {
      useToastStore.getState().showToast('Sin imagen', 'Seleccione o capture una radiografía primero.', 'error');
      return;
    }
    router.push({ 
      pathname: '/(tabs)/analisis', 
      params: { 
        imageUri: imageUri ?? '',
        pacienteId: pacienteId ?? '',
        modoRapido: esRapido ? '1' : '0',
        fechaRadiografia: formatLocalDate(fechaPlaca),
      } 
    });

    // Vaciamos la foto cargada localmente de manera limpia y silenciosa al mandar la vista al frente
    setTimeout(() => {
      setImageUri(null);
      setSelectedSource(null);
    }, 400);
  };

  const OptionRow = ({
    icon,
    label,
    onPress,
    isSelected,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    isSelected: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.optionRow, isSelected && styles.optionRowSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.optionIcon, isSelected && styles.optionIconSelected]}>
        <Ionicons name={icon} size={20} color={isSelected ? Colors.bgDeep : Colors.primary} />
      </View>
      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={isSelected ? Colors.primary : Colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.gradient}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          <Text style={styles.backText}>Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Carga de Imagen</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner contextual: modo rapido vs expediente */}
        {esRapido ? (
          <View style={[styles.patientBanner, styles.patientBannerRapido]}>
            <Ionicons name="flash" size={16} color="#FFB400" />
            <View style={styles.patientBannerLeft}>
              <Text style={[styles.patientBannerLabel, { color: '#FFB400' }]}>ANÁLISIS RÁPIDO</Text>
              <Text style={styles.patientBannerName}>Sin expediente — solo evaluación IA</Text>
            </View>
          </View>
        ) : (
          <View style={styles.patientBanner}>
            <View style={styles.patientBannerLeft}>
              <Text style={styles.patientBannerLabel}>EXPEDIENTE ACTIVO</Text>
              <Text style={styles.patientBannerName}>
                Paciente: {paciente?.nombreCompleto || 'Cargando...'}
              </Text>
            </View>
            <View style={styles.patientBannerBar} />
          </View>
        )}

        {/* Drop Zone / Image Preview */}
        {imageUri ? (
          <>
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => setShowFullImage(true)}
              style={{ width: '100%' }}
            >
              <GlassContainer intensity={30} style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
                <LinearGradient 
                  colors={['transparent', 'rgba(9, 13, 31, 0.9)']} 
                  style={styles.imageOverlay}
                >
                  <Ionicons name="eye-outline" size={32} color={Colors.primary} />
                  <Text style={styles.imageOverlayText}>Radiografía lista (Toca para ampliar)</Text>
                </LinearGradient>
              </GlassContainer>
            </TouchableOpacity>
            
            {/* DATE PICKER */}
            <View style={{ backgroundColor: Colors.bgCard, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.sm, borderWidth: 1, borderColor: Colors.borderCard, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Ionicons name="calendar-outline" size={24} color={Colors.primary} />
                <View>
                  <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>Fecha de la Radiografía</Text>
                  <Text style={{ color: Colors.textPrimary, fontSize: 16, fontFamily: Typography.fonts.bold }}>
                    {fechaPlaca.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
              </View>
              <PrimaryButton 
                title="Cambiar" 
                onPress={() => setShowDatePicker(true)} 
                variant="secondary" 
                style={{ paddingVertical: 8, paddingHorizontal: 16, minWidth: 0, minHeight: 0 }} 
              />
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={fechaPlaca}
                mode="date"
                display="default"
                onChange={onChangeDate}
                maximumDate={new Date()}
              />
            )}
          </>
        ) : (
          <View style={styles.dropZone}>
            <Ionicons name="scan-outline" size={52} color={Colors.textMuted} />
            <Text style={styles.dropTitle}>Seleccionar Ecografía</Text>
            <Text style={styles.dropSub}>Archivos DICOM, JPG o PNG</Text>
          </View>
        )}

        {/* Options */}
        <View style={styles.optionsCard}>
          <OptionRow
            icon="document-outline"
            label="Importar DICOM"
            onPress={handleDICOM}
            isSelected={selectedSource === 'dicom'}
          />
          <View style={styles.optionDivider} />
          <OptionRow
            icon="images-outline"
            label="Cargar desde Galería"
            onPress={pickFromGallery}
            isSelected={selectedSource === 'galeria'}
          />
          <View style={styles.optionDivider} />
          <OptionRow
            icon="camera-outline"
            label="Tomar Foto"
            onPress={takePhoto}
            isSelected={selectedSource === 'camara'}
          />
        </View>

        {/* Guía */}
        <View style={styles.guideCard}>
          <Ionicons name="bulb-outline" size={24} color={Colors.primary} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.guideBold}>Guía para una foto perfecta:</Text>
            <Text style={styles.guideText}>
              1. Usa tu celular en <Text style={{ fontWeight: 'bold' }}>Horizontal</Text>.{'\n'}
              2. Asegúrate de que no haya reflejos.{'\n'}
              3. Usa la herramienta de <Text style={{ fontWeight: 'bold' }}>Recorte</Text> que aparecerá después para encuadrar solo la placa radiográfica, eliminando bordes y enderezándola si salió chueca.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomBar}>
        <PrimaryButton
          title="Analizar Imagen"
          onPress={handleAnalizarImagen}
          disabled={!imageUri && selectedSource !== 'dicom'}
        />
      </View>

      {/* Modal de Zoom antes de enviar a analizar */}
      <ZoomViewerModal
        visible={showFullImage}
        onClose={() => setShowFullImage(false)}
        imageUri={imageUri ?? undefined}
      />
    </LinearGradient>
  );
}

// Styles were extracted to CargarImagenScreen.styles.ts to respect architecture

