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
  Animated,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { GlassContainer } from './GlassContainer';
import { useToastStore } from '../store/useToastStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Diámetros del nivelador burbuja
const LEVEL_RADIUS = 60; // Diámetro de 120px
const BUBBLE_RADIUS = 10; // Diámetro de 20px
const MAX_OFFSET = LEVEL_RADIUS - BUBBLE_RADIUS; // 50px de rango máximo de movimiento

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

  // Vectores de gravedad (filtro pasa-bajos)
  const smoothX = useRef(0);
  const smoothY = useRef(0);
  const smoothZ = useRef(-1);
  const alpha = 0.12; // Un poco más de suavizado para una experiencia más premium

  // Estado para refrescar la UI con la gravedad
  const [gravity, setGravity] = useState({ x: 0, y: 0, z: -1 });

  // Detección automática de orientación del dispositivo (PORTRAIT, LANDSCAPE_LEFT, LANDSCAPE_RIGHT)
  const [deviceOrientation, setDeviceOrientation] = useState<'PORTRAIT' | 'LANDSCAPE_LEFT' | 'LANDSCAPE_RIGHT'>('PORTRAIT');
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Estado de calibración
  const [calibratedGravity, setCalibratedGravity] = useState<{ x: number; y: number; z: number } | null>(null);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [isAligned, setIsAligned] = useState(false);

  // Solicitar permisos
  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible, permission]);

  // Suscripción al acelerómetro
  useEffect(() => {
    let subscription: any = null;

    if (visible && permission?.granted) {
      Accelerometer.setUpdateInterval(30);

      subscription = Accelerometer.addListener((data) => {
        // 1. Filtro pasa-bajos
        smoothX.current = alpha * data.x + (1 - alpha) * smoothX.current;
        smoothY.current = alpha * data.y + (1 - alpha) * smoothY.current;
        smoothZ.current = alpha * data.z + (1 - alpha) * smoothZ.current;

        setGravity({
          x: smoothX.current,
          y: smoothY.current,
          z: smoothZ.current,
        });

        // 2. Detección de orientación con histéresis (evita parpadeos en diagonales)
        const ax = data.x;
        const ay = data.y;
        if (Math.abs(ax) > 0.65) {
          const targetOri = ax > 0 ? 'LANDSCAPE_LEFT' : 'LANDSCAPE_RIGHT';
          setDeviceOrientation((prev) => (prev !== targetOri ? targetOri : prev));
        } else if (Math.abs(ay) > 0.65) {
          setDeviceOrientation((prev) => (prev !== 'PORTRAIT' ? 'PORTRAIT' : prev));
        }
      });
    }

    return () => {
      if (subscription) subscription.remove();
    };
  }, [visible, permission]);

  // Animar la rotación de los componentes de la interfaz
  useEffect(() => {
    let toValue = 0;
    if (deviceOrientation === 'LANDSCAPE_LEFT') toValue = 1; // 90 grados
    else if (deviceOrientation === 'LANDSCAPE_RIGHT') toValue = -1; // -90 grados

    Animated.timing(rotateAnim, {
      toValue,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [deviceOrientation]);

  // Función para normalizar vectores
  const normalize = (v: { x: number; y: number; z: number }) => {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len === 0) return { x: 0, y: 0, z: -1 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  };

  // Función para obtener vector de gravedad ideal por defecto (Auto-calibración)
  const getDefaultReference = (x: number, y: number, z: number, orientation: 'PORTRAIT' | 'LANDSCAPE_LEFT' | 'LANDSCAPE_RIGHT') => {
    // Si el teléfono está plano (en mesa / superficie horizontal, predomina z)
    if (Math.abs(z) > 0.75) {
      return { x: 0, y: 0, z: z > 0 ? 1 : -1 };
    }
    // Si está vertical (negatoscopio en pared)
    if (orientation === 'PORTRAIT') {
      return { x: 0, y: y > 0 ? 1 : -1, z: 0 };
    } else if (orientation === 'LANDSCAPE_LEFT') {
      return { x: x > 0 ? 1 : -1, y: 0, z: 0 };
    } else {
      // LANDSCAPE_RIGHT
      return { x: x > 0 ? 1 : -1, y: 0, z: 0 };
    }
  };

  // Cálculos matemáticos del nivelador (burbuja)
  let angleDeg = 0;
  let bubbleX = 0;
  let bubbleY = 0;
  let isAutoHorizontal = false;

  const curNorm = normalize(gravity);
  
  // Si está calibrado manualmente usamos ese vector, si no calculamos el plano ideal en "Auto"
  const refNorm = isCalibrated && calibratedGravity
    ? normalize(calibratedGravity)
    : normalize(getDefaultReference(gravity.x, gravity.y, gravity.z, deviceOrientation));

  // Detectar si el plano auto-detectado es horizontal o vertical
  if (!isCalibrated) {
    isAutoHorizontal = Math.abs(gravity.z) > 0.75;
  }

  // Producto escalar para calcular la desviación en grados
  const dot = curNorm.x * refNorm.x + curNorm.y * refNorm.y + curNorm.z * refNorm.z;
  const clampedDot = Math.max(-1, Math.min(1, dot));
  const angleRad = Math.acos(clampedDot);
  angleDeg = angleRad * (180 / Math.PI);

  // Construir base ortonormal para el plano
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

  // Proyecciones
  const pu = curNorm.x * uNorm.x + curNorm.y * uNorm.y + curNorm.z * uNorm.z;
  const pv = curNorm.x * vx + curNorm.y * vy + curNorm.z * vz;

  const MAX_ANGLE_LIMIT = 15;
  const deviation = Math.min(1.0, angleDeg / MAX_ANGLE_LIMIT);
  const lenProj = Math.sqrt(pu * pu + pv * pv);

  if (lenProj > 0) {
    // pv representa la desviación horizontal de la pantalla
    // pu representa la desviación vertical (cabeceo)
    const rawX = -(pv / lenProj) * deviation * MAX_OFFSET;
    const rawY = -(pu / lenProj) * deviation * MAX_OFFSET;

    if (deviceOrientation === 'LANDSCAPE_LEFT') {
      // Rotación de 90 grados en sentido antihorario
      bubbleX = rawY;
      bubbleY = -rawX;
    } else if (deviceOrientation === 'LANDSCAPE_RIGHT') {
      // Rotación de 90 grados en sentido horario
      bubbleX = -rawY;
      bubbleY = rawX;
    } else {
      bubbleX = rawX;
      bubbleY = rawY;
    }
  }

  // Comprobación de alineación (< 2.0 grados) y respuesta háptica
  const currentlyAligned = angleDeg < 2.0;
  useEffect(() => {
    if (currentlyAligned !== isAligned) {
      setIsAligned(currentlyAligned);
      if (currentlyAligned) {
        // Disparo táctil único al quedar alineado perfectamente
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
    }
  }, [currentlyAligned, isAligned]);

  // Calibrar plano de referencia manual (tara)
  const handleCalibrate = () => {
    setCalibratedGravity({ ...gravity });
    setIsCalibrated(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    useToastStore.getState().showToast(
      'Plano Calibrado',
      'Plano de referencia guardado. Mantenga la burbuja en el centro verde para tomar la foto.',
      'success'
    );
  };

  // Restablecer a calibración automática
  const handleResetCalibration = () => {
    setCalibratedGravity(null);
    setIsCalibrated(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    useToastStore.getState().showToast(
      'Modo Automático',
      'Se restableció el nivelador al plano automático (horizontal/vertical).',
      'info'
    );
  };

  // Capturar foto
  const handleTakePhoto = async () => {
    if (!cameraRef.current || isCapturing) return;

    try {
      setIsCapturing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.95,
      });

      if (photo && photo.uri) {
        onPhotoTaken(photo.uri);
      } else {
        throw new Error('No se pudo capturar la imagen.');
      }
    } catch (error) {
      console.error('[CameraLeveler] Error al capturar:', error);
      useToastStore.getState().showToast(
        'Error de captura',
        'No se pudo tomar la foto. Intente de nuevo.',
        'error'
      );
    } finally {
      setIsCapturing(false);
    }
  };

  // Definir dimensiones dinámicas del marco de encuadre
  // En horizontal usamos 4:3 (ancho > alto), en vertical 3:4 (alto > ancho)
  const isLandscape = deviceOrientation !== 'PORTRAIT';
  const maxFrameHeight = SCREEN_HEIGHT - 280;
  const frameWidth = isLandscape
    ? SCREEN_WIDTH - Spacing.lg * 2
    : Math.min(SCREEN_WIDTH - Spacing.lg * 2, (maxFrameHeight * 3) / 4);
  const frameHeight = isLandscape
    ? (frameWidth * 3) / 4
    : (frameWidth * 4) / 3;

  // Animación de rotación de la UI
  const rotation = rotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['90deg', '0deg', '-90deg'],
  });

  const animatedStyle = {
    transform: [{ rotate: rotation }],
  };

  if (!visible) return null;

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
          {/* Capas oscuras de máscara de recorte */}
          <View style={styles.maskContainer}>
            {/* Superior */}
            <View style={styles.maskDark} />

            <View style={[styles.maskRow, { height: frameHeight }]}>
              {/* Izquierda */}
              <View style={styles.maskDark} />

              {/* Recuadro de encuadre */}
              <View style={[styles.frameOutline, { width: frameWidth, height: frameHeight }]}>
                {/* Esquinas cosméticas */}
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />

                {/* Burbuja niveladora física en el centro */}
                <View style={styles.levelerContainer}>
                  <View style={[styles.levelOuter, currentlyAligned && styles.levelOuterAligned]}>
                    <View style={styles.levelCrosshairH} />
                    <View style={styles.levelCrosshairV} />
                    <View style={[styles.levelInner, currentlyAligned && styles.levelInnerAligned]} />
                    <View
                      style={[
                        styles.bubble,
                        currentlyAligned ? styles.bubbleAligned : styles.bubbleMisaligned,
                        { transform: [{ translateX: bubbleX }, { translateY: bubbleY }] },
                      ]}
                    />
                  </View>
                </View>
              </View>

              {/* Derecha */}
              <View style={styles.maskDark} />
            </View>

            {/* Inferior */}
            <View style={[styles.maskDark, { flex: 1.4 }]} />
          </View>

          {/* Interfaz de Usuario Overlay */}
          <View style={styles.hudOverlay}>
            {/* Header */}
            <View style={styles.header}>
              <Animated.View style={animatedStyle}>
                <TouchableOpacity onPress={onCancel} style={styles.closeBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={26} color="#FFF" />
                </TouchableOpacity>
              </Animated.View>

              {/* Badge del Estado de Calibración / Ángulo */}
              <Animated.View style={animatedStyle}>
                <GlassContainer style={styles.statusBadge}>
                  <View style={styles.badgeContent}>
                    <View
                      style={[
                        styles.statusDot,
                        isCalibrated
                          ? currentlyAligned ? styles.dotGreen : styles.dotYellow
                          : currentlyAligned ? styles.dotCyan : styles.dotYellow,
                      ]}
                    />
                    <Text style={styles.badgeText}>
                      {isCalibrated
                        ? `Calibrado: ${angleDeg.toFixed(1)}°`
                        : `${isAutoHorizontal ? 'Auto Mesa' : 'Auto Pared'}: ${angleDeg.toFixed(1)}°`}
                    </Text>
                  </View>
                </GlassContainer>
              </Animated.View>

              <View style={{ width: 44 }} />
            </View>

            {/* Caja de instrucciones de apoyo */}
            <View style={styles.instructionContainer}>
              <Animated.View style={[animatedStyle, { width: '90%' }]}>
                <GlassContainer style={styles.instructionBox}>
                  <Text style={styles.instructionText}>
                    {!isCalibrated
                      ? `Enmarque la placa ${isLandscape ? 'horizontal' : 'vertical'}. Mantenga la burbuja en el centro verde.`
                      : currentlyAligned
                      ? '✓ Teléfono alineado con la referencia. ¡Tome la foto!'
                      : 'Mueva el celular para alinear la burbuja con el plano calibrado.'}
                  </Text>
                </GlassContainer>
              </Animated.View>
            </View>

            {/* Panel de Controles Inferiores */}
            <View style={styles.bottomControls}>
              {/* Botón de Calibración */}
              <Animated.View style={animatedStyle}>
                {isCalibrated ? (
                  <TouchableOpacity
                    onPress={handleResetCalibration}
                    style={[styles.actionBtn, styles.actionBtnActive]}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="refresh-outline" size={22} color={Colors.primary} />
                    <Text style={[styles.actionBtnText, styles.actionBtnTextActive]}>Auto</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    onPress={handleCalibrate}
                    style={styles.actionBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="locate-outline" size={22} color="#FFF" />
                    <Text style={styles.actionBtnText}>Calibrar</Text>
                  </TouchableOpacity>
                )}
              </Animated.View>

              {/* Botón de Obturador */}
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

              {/* Recalibrar o Info */}
              <Animated.View style={animatedStyle}>
                {isCalibrated ? (
                  <TouchableOpacity
                    onPress={handleCalibrate}
                    style={styles.actionBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="locate-outline" size={22} color="#FFF" />
                    <Text style={styles.actionBtnText}>Calibrar</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.actionBtn}
                    activeOpacity={0.7}
                    onPress={() => {
                      useToastStore.getState().showToast(
                        'Modo Automático Activo',
                        'El nivelador detecta si la radiografía está vertical (pared) u horizontal (mesa). Si su negatoscopio está inclinado, presione "Calibrar" para fijar un plano personalizado.',
                        'info'
                      );
                    }}
                  >
                    <Ionicons name="information-circle-outline" size={22} color="#FFF" />
                    <Text style={styles.actionBtnText}>Ayuda</Text>
                  </TouchableOpacity>
                )}
              </Animated.View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  maskRow: {
    flexDirection: 'row',
    width: '100%',
  },
  frameOutline: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
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
    width: 20,
    height: 20,
    borderRadius: 10,
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
  dotCyan: {
    backgroundColor: Colors.primary,
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
    width: 100,
    height: 40,
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
});
