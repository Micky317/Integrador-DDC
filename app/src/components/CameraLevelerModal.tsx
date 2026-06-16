import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { GlassContainer } from './GlassContainer';
import { useToastStore } from '../store/useToastStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Dimensiones de la caja de encuadre (4:3 horizontal)
const FRAME_WIDTH = SCREEN_WIDTH - Spacing.lg * 2;
const FRAME_HEIGHT = (FRAME_WIDTH * 3) / 4;

// Radio del nivelador burbuja
const LEVEL_RADIUS = 60; // Diámetro de 120px
const BUBBLE_RADIUS = 10; // Diámetro de 20px
const MAX_OFFSET = LEVEL_RADIUS - BUBBLE_RADIUS; // 50px de rango máximo de movimiento
const TARGET_RADIUS = 10; // Radio del círculo central (umbral de 2 grados)

interface CameraLevelerModalProps {
  visible: boolean;
  onPhotoTaken: (uri: string) => void;
  onCancel: () => void;
}

export const CameraLevelerModal: React.FC<CameraLevelerModalProps> = ({
  visible,
  onPhotoTaken,
  onCancel,
}) => {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);

  // Vectores de gravedad
  const smoothX = useRef(0);
  const smoothY = useRef(0);
  const smoothZ = useRef(-1); // Inicializamos apuntando hacia atrás por defecto
  const alpha = 0.15; // Factor de suavizado del filtro pasa-bajos

  // Estado para forzar re-renderizado del HUD con los datos del sensor
  const [gravity, setGravity] = useState({ x: 0, y: 0, z: -1 });

  // Vector de calibración (referencia)
  const [calibratedGravity, setCalibratedGravity] = useState<{ x: number; y: number; z: number } | null>(null);
  const [isAligned, setIsAligned] = useState(false);

  // Solicitar permisos al abrir el modal
  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible, permission]);

  // Suscripción al acelerómetro
  useEffect(() => {
    let subscription: any = null;

    if (visible && permission?.granted) {
      // Configuramos el acelerómetro a ~30ms para animación fluida (aprox. 30 fps)
      Accelerometer.setUpdateInterval(30);

      subscription = Accelerometer.addListener((data) => {
        // Filtro pasa-bajos para eliminar ruido de temblores de la mano
        smoothX.current = alpha * data.x + (1 - alpha) * smoothX.current;
        smoothY.current = alpha * data.y + (1 - alpha) * smoothY.current;
        smoothZ.current = alpha * data.z + (1 - alpha) * smoothZ.current;

        setGravity({
          x: smoothX.current,
          y: smoothY.current,
          z: smoothZ.current,
        });
      });
    }

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [visible, permission]);

  // Función para normalizar vectores 3D
  const normalize = (v: { x: number; y: number; z: number }) => {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len === 0) return { x: 0, y: 0, z: -1 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  };

  // Cálculos matemáticos del nivelador
  let angleDeg = 0;
  let bubbleX = 0;
  let bubbleY = 0;

  if (calibratedGravity) {
    const curNorm = normalize(gravity);
    const refNorm = normalize(calibratedGravity);

    // Producto escalar para calcular el ángulo de desviación
    const dot = curNorm.x * refNorm.x + curNorm.y * refNorm.y + curNorm.z * refNorm.z;
    const clampedDot = Math.max(-1, Math.min(1, dot));
    const angleRad = Math.acos(clampedDot);
    angleDeg = angleRad * (180 / Math.PI);

    // Construir base ortonormal para el plano de calibración
    let tx = 1, ty = 0, tz = 0;
    if (Math.abs(refNorm.x) > 0.9) {
      tx = 0;
      ty = 1;
      tz = 0;
    }

    // u = refNorm x t
    const ux = refNorm.y * tz - refNorm.z * ty;
    const uy = refNorm.z * tx - refNorm.x * tz;
    const uz = refNorm.x * ty - refNorm.y * tx;
    const lenU = Math.sqrt(ux * ux + uy * uy + uz * uz);
    const uNorm = { x: ux / lenU, y: uy / lenU, z: uz / lenU };

    // v = refNorm x uNorm
    const vx = refNorm.y * uNorm.z - refNorm.z * uNorm.y;
    const vy = refNorm.z * uNorm.x - refNorm.x * uNorm.z;
    const vz = refNorm.x * uNorm.y - refNorm.y * uNorm.x;

    // Proyecciones sobre los ejes u y v del plano calibrado
    const pu = curNorm.x * uNorm.x + curNorm.y * uNorm.y + curNorm.z * uNorm.z;
    const pv = curNorm.x * vx + curNorm.y * vy + curNorm.z * vz;

    // Mapeo lineal de la desviación (escala máxima a 15 grados)
    const MAX_ANGLE_LIMIT = 15;
    const deviation = Math.min(1.0, angleDeg / MAX_ANGLE_LIMIT);
    const lenProj = Math.sqrt(pu * pu + pv * pv);

    if (lenProj > 0) {
      // Dirección del movimiento de la burbuja
      const dirX = pu / lenProj;
      const dirY = pv / lenProj;

      // El signo negativo simula la burbuja flotando hacia la parte más alta (física de nivel)
      // Ajustamos los ejes para que coincida intuitivamente con los movimientos del celular
      bubbleX = -dirX * deviation * MAX_OFFSET;
      bubbleY = dirY * deviation * MAX_OFFSET;
    }
  }

  // Comprobación de alineación (< 2.0 grados) y disparo de respuesta háptica
  const currentlyAligned = calibratedGravity !== null && angleDeg < 2.0;
  useEffect(() => {
    if (calibratedGravity !== null) {
      if (currentlyAligned !== isAligned) {
        setIsAligned(currentlyAligned);
        if (currentlyAligned) {
          // Vibración mediana al alinearse perfectamente
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        }
      }
    }
  }, [currentlyAligned, isAligned, calibratedGravity]);

  // Calibrar plano de referencia
  const handleCalibrate = () => {
    setCalibratedGravity({ ...gravity });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    useToastStore.getState().showToast(
      'Superficie Calibrada',
      'Plano de referencia guardado con éxito. Ahora encuadre la radiografía.',
      'success'
    );
  };

  // Capturar foto
  const handleTakePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      // Vibración de confirmación de captura
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.95,
      });

      if (photo && photo.uri) {
        onPhotoTaken(photo.uri);
      } else {
        throw new Error('No se obtuvo la URI de la imagen.');
      }
    } catch (error) {
      console.error('[CameraLeveler] Error al capturar foto:', error);
      useToastStore.getState().showToast(
        'Error de captura',
        'No se pudo tomar la foto. Por favor intente de nuevo.',
        'error'
      );
    } finally {
      setIsCapturing(false);
    }
  };

  if (!visible) return null;

  // Renderizar pantalla de carga o error de permisos
  if (!permission) {
    return (
      <Modal visible={visible} animationType="fade" statusBarTranslucent>
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" statusBarTranslucent>
        <View style={styles.permissionContainer}>
          <Ionicons name="videocam-off" size={64} color={Colors.textMuted} />
          <Text style={styles.permissionTitle}>Permisos de Cámara Requeridos</Text>
          <Text style={styles.permissionText}>
            Para tomar una radiografía directamente desde la aplicación y garantizar que la angulación sea correcta, necesitamos acceso a la cámara.
          </Text>
          <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Conceder Permiso</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: Spacing.lg }} onPress={onCancel}>
            <Text style={{ color: Colors.textSecondary, fontFamily: Typography.fonts.medium }}>
              Cancelar y Regresar
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" mode="picture">
          {/* Capas negras de recorte para simular máscara 4:3 en el centro */}
          <View style={styles.maskContainer}>
            {/* Superior */}
            <View style={styles.maskDark} />

            <View style={styles.maskRow}>
              {/* Izquierda */}
              <View style={styles.maskDark} />

              {/* Recuadro de encuadre */}
              <View style={styles.frameOutline}>
                {/* Esquinas de diseño del marco */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />

                {/* Burbuja niveladora flotante en el centro del marco */}
                {calibratedGravity ? (
                  <View style={styles.levelerContainer}>
                    {/* Círculo Exterior (Nivel) */}
                    <View style={[styles.levelOuter, currentlyAligned && styles.levelOuterAligned]}>
                      {/* Ejes de mira (cruz) */}
                      <View style={styles.levelCrosshairH} />
                      <View style={styles.levelCrosshairV} />

                      {/* Círculo Central (Target) */}
                      <View style={[styles.levelInner, currentlyAligned && styles.levelInnerAligned]} />

                      {/* Burbuja Móvil */}
                      <View
                        style={[
                          styles.bubble,
                          currentlyAligned ? styles.bubbleAligned : styles.bubbleMisaligned,
                          {
                            transform: [{ translateX: bubbleX }, { translateY: bubbleY }],
                          },
                        ]}
                      />
                    </View>
                  </View>
                ) : null}
              </View>

              {/* Derecha */}
              <View style={styles.maskDark} />
            </View>

            {/* Inferior */}
            <View style={[styles.maskDark, { flex: 1.5 }]} />
          </View>

          {/* Interfaz de Usuario Overlay */}
          <View style={styles.hudOverlay}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onCancel} style={styles.closeBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={26} color="#FFF" />
              </TouchableOpacity>

              {/* Badge del Estado de Calibración / Ángulo */}
              <GlassContainer style={styles.statusBadge}>
                {calibratedGravity ? (
                  <View style={styles.badgeContent}>
                    <View style={[styles.statusDot, currentlyAligned ? styles.dotGreen : styles.dotYellow]} />
                    <Text style={styles.badgeText}>
                      {currentlyAligned
                        ? `Ángulo correcto: ${angleDeg.toFixed(1)}°`
                        : `Desviación: ${angleDeg.toFixed(1)}°`}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.badgeContent}>
                    <View style={[styles.statusDot, styles.dotRed]} />
                    <Text style={styles.badgeText}>Sin calibrar plano</Text>
                  </View>
                )}
              </GlassContainer>
              <View style={{ width: 44 }} />
            </View>

            {/* Caja de instrucciones de apoyo */}
            <View style={styles.instructionContainer}>
              <GlassContainer style={styles.instructionBox}>
                <Text style={styles.instructionText}>
                  {!calibratedGravity
                    ? '1. Apoye el celular plano sobre la placa de rayos X y presione "Calibrar"'
                    : currentlyAligned
                    ? '✓ Teléfono alineado. ¡Tome la fotografía!'
                    : '2. Enmarque la cadera y mueva el celular para centrar la burbuja (Verde)'}
                </Text>
              </GlassContainer>
            </View>

            {/* Panel de Controles Inferiores */}
            <View style={styles.bottomControls}>
              {/* Botón de Calibrar a la izquierda */}
              <TouchableOpacity
                onPress={handleCalibrate}
                style={[styles.actionBtn, calibratedGravity && styles.actionBtnActive]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={calibratedGravity ? 'git-compare-outline' : 'locate-outline'}
                  size={24}
                  color={calibratedGravity ? Colors.primary : '#FFF'}
                />
                <Text style={[styles.actionBtnText, calibratedGravity && styles.actionBtnTextActive]}>
                  {calibratedGravity ? 'Recalibrar' : 'Calibrar'}
                </Text>
              </TouchableOpacity>

              {/* Botón de Shutter (Tomar Foto) */}
              <TouchableOpacity
                onPress={handleTakePhoto}
                disabled={isCapturing}
                style={[
                  styles.shutterBtn,
                  currentlyAligned && styles.shutterBtnAligned,
                  isCapturing && { opacity: 0.5 },
                ]}
                activeOpacity={0.8}
              >
                <View style={[styles.shutterInner, currentlyAligned && styles.shutterInnerAligned]} />
              </TouchableOpacity>

              {/* Botón de ayuda para guiar al médico */}
              <View style={styles.helpPlaceholder}>
                <Ionicons
                  name="information-circle-outline"
                  size={24}
                  color="rgba(255,255,255,0.4)"
                  onPress={() => {
                    useToastStore.getState().showToast(
                      'Instrucciones de Nivel',
                      'Apoye el teléfono en la misma inclinación que el negatoscope, presione Calibrar, luego retírelo para tomar la foto manteniéndolo paralelo al plano calibrado.',
                      'info'
                    );
                  }}
                />
              </View>
            </View>
          </View>
        </CameraView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.bgDeep,
    gap: Spacing.md,
  },
  permissionTitle: {
    color: '#FFF',
    fontSize: Typography.size.lg,
    fontFamily: Typography.fonts.bold,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  permissionText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.base,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  permissionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
  },
  permissionBtnText: {
    color: Colors.bgDeep,
    fontSize: Typography.size.base,
    fontFamily: Typography.fonts.bold,
  },
  // Máscara oscura para encuadrar la radiografía
  maskContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  maskDark: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  maskRow: {
    flexDirection: 'row',
    height: FRAME_HEIGHT,
  },
  frameOutline: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Esquinas cosméticas de cámara
  corner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: '#FFF',
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  // Burbuja y miras del nivelador
  levelerContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelOuter: {
    width: LEVEL_RADIUS * 2,
    height: LEVEL_RADIUS * 2,
    borderRadius: LEVEL_RADIUS,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(13, 18, 37, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelOuterAligned: {
    borderColor: 'rgba(0, 229, 204, 0.6)',
    backgroundColor: 'rgba(0, 229, 204, 0.08)',
  },
  levelCrosshairH: {
    position: 'absolute',
    width: LEVEL_RADIUS * 2 - 10,
    height: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  levelCrosshairV: {
    position: 'absolute',
    width: 0.5,
    height: LEVEL_RADIUS * 2 - 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  levelInner: {
    position: 'absolute',
    width: TARGET_RADIUS * 2,
    height: TARGET_RADIUS * 2,
    borderRadius: TARGET_RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderStyle: 'dashed',
  },
  levelInnerAligned: {
    borderColor: Colors.primary,
    borderStyle: 'solid',
  },
  bubble: {
    width: BUBBLE_RADIUS * 2,
    height: BUBBLE_RADIUS * 2,
    borderRadius: BUBBLE_RADIUS,
    position: 'absolute',
    ...Platform.select({
      ios: {
        shadowColor: '#00E5CC',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  bubbleMisaligned: {
    backgroundColor: '#FFF',
  },
  bubbleAligned: {
    backgroundColor: Colors.primary,
  },
  // HUD UI Overlay
  hudOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingVertical: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 15 : 10,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: {
    backgroundColor: Colors.statusNormal,
  },
  dotYellow: {
    backgroundColor: Colors.statusWarning,
  },
  dotRed: {
    backgroundColor: Colors.statusDanger,
  },
  badgeText: {
    color: '#FFF',
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.semibold,
  },
  instructionContainer: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  instructionBox: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  instructionText: {
    color: '#FFF',
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.medium,
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 10 : 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: 120,
    justifyContent: 'center',
  },
  actionBtnActive: {
    borderColor: Colors.primaryGlow,
    backgroundColor: 'rgba(0, 229, 204, 0.08)',
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.semibold,
  },
  actionBtnTextActive: {
    color: Colors.primary,
  },
  shutterBtn: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#FFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  shutterBtnAligned: {
    borderColor: Colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOpacity: 0.6,
        shadowRadius: 15,
      },
    }),
  },
  shutterInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#FFF',
  },
  shutterInnerAligned: {
    backgroundColor: Colors.primary,
  },
  helpPlaceholder: {
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
