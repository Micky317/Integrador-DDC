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
  const alpha = 0.12;

  // Estado para refrescar la UI
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

        // 2. Detección de orientación con histéresis adaptable (para modo Mesa)
        const ax = data.x;
        const ay = data.y;
        const az = data.z;

        const isFlatDetect = Math.abs(az) > 0.75;
        const threshold = isFlatDetect ? 0.08 : 0.55;

        if (Math.abs(ax) > threshold && Math.abs(ax) > Math.abs(ay)) {
          const targetOri = ax > 0 ? 'LANDSCAPE_LEFT' : 'LANDSCAPE_RIGHT';
          setDeviceOrientation((prev) => (prev !== targetOri ? targetOri : prev));
        } else if (Math.abs(ay) > threshold && Math.abs(ay) >= Math.abs(ax)) {
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
    if (Math.abs(z) > 0.75) {
      return { x: 0, y: 0, z: z > 0 ? 1 : -1 };
    }
    if (orientation === 'PORTRAIT') {
      return { x: 0, y: y > 0 ? 1 : -1, z: 0 };
    } else if (orientation === 'LANDSCAPE_LEFT') {
      return { x: x > 0 ? 1 : -1, y: 0, z: 0 };
    } else {
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

  // Producto escalar para calcular la desviación en grados de paralelismo 3D
  const safeDot = curNorm.x * refNorm.x + curNorm.y * refNorm.y + curNorm.z * refNorm.z;
  const clampedDot = Math.max(-1, Math.min(1, safeDot));
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
    const rawX = -(pv / lenProj) * deviation * MAX_OFFSET;
    const rawY = -(pu / lenProj) * deviation * MAX_OFFSET;

    if (deviceOrientation === 'LANDSCAPE_LEFT') {
      bubbleX = rawY;
      bubbleY = -rawX;
    } else if (deviceOrientation === 'LANDSCAPE_RIGHT') {
      bubbleX = -rawY;
      bubbleY = rawX;
    } else {
      bubbleX = rawX;
      bubbleY = rawY;
    }
  }

  // CALCULO DE GIRO LATERAL (ROLL) RESPECTO A LA GRAVEDAD ABSOLUTA
  const isFlat = Math.abs(gravity.z) > 0.75;
  let rollAngle = 0;
  if (!isFlat) {
    if (deviceOrientation === 'PORTRAIT') {
      rollAngle = Math.atan2(gravity.x, -gravity.y) * (180 / Math.PI);
    } else if (deviceOrientation === 'LANDSCAPE_LEFT') {
      rollAngle = Math.atan2(gravity.y, gravity.x) * (180 / Math.PI);
    } else if (deviceOrientation === 'LANDSCAPE_RIGHT') {
      rollAngle = Math.atan2(-gravity.y, -gravity.x) * (180 / Math.PI);
    }
  }

  // COMBINACIÓN DE LA ROTACIÓN DE LA PANTALLA Y EL GIRO FÍSICO
  // screenAngle representa la rotación base en grados de las líneas para mantenerse horizontal al usuario
  let screenAngle = 0;
  if (deviceOrientation === 'LANDSCAPE_LEFT') {
    screenAngle = -90;
  } else if (deviceOrientation === 'LANDSCAPE_RIGHT') {
    screenAngle = 90;
  }
  const horizonRotation = screenAngle - rollAngle;

  // Comprobación de alineación de ambos ejes
  const currentlyAligned = angleDeg < 2.0;
  const currentlyLeveled = isFlat || Math.abs(rollAngle) < 1.5;
  const isAlignedBoth = currentlyAligned && currentlyLeveled;

  useEffect(() => {
    if (isAlignedBoth !== isAligned) {
      setIsAligned(isAlignedBoth);
      if (isAlignedBoth) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      }
    }
  }, [isAlignedBoth, isAligned]);

  // Calibrar plano de referencia manual (tara)
  const handleCalibrate = () => {
    setCalibratedGravity({ ...gravity });
    setIsCalibrated(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    useToastStore.getState().showToast(
      'Plano Calibrado',
      'Plano de referencia guardado. Mantenga el celular paralelo y nivelado para tomar la foto.',
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
          
          {/* Indicador de horizonte lateral (DSLR style) para evitar fotos torcidas */}
          {!isFlat && (
            <View
              style={[
                styles.horizonContainer,
                {
                  transform: [{ rotate: `${horizonRotation}deg` }],
                },
              ]}
            >
              <View style={[styles.horizonLine, currentlyLeveled && styles.horizonLineLeveled]} />
              <View style={{ width: LEVEL_RADIUS * 2 + 20 }} />
              <View style={[styles.horizonLine, currentlyLeveled && styles.horizonLineLeveled]} />
            </View>
          )}

          {/* Burbuja niveladora física en el centro */}
          <View style={styles.levelerContainer}>
            <View style={[styles.levelOuter, isAlignedBoth && styles.levelOuterAligned]}>
              <View style={styles.levelCrosshairH} />
              <View style={styles.levelCrosshairV} />
              <View style={[styles.levelInner, isAlignedBoth && styles.levelInnerAligned]} />
              <View
                style={[
                  styles.bubble,
                  isAlignedBoth ? styles.bubbleAligned : styles.bubbleMisaligned,
                  { transform: [{ translateX: bubbleX }, { translateY: bubbleY }] },
                ]}
              />
            </View>
          </View>

          {/* Interfaz de Usuario Overlay */}
          <View style={styles.hudOverlay}>
            
            {/* Header y Texto de Instrucción Integrado */}
            <View style={styles.headerContainer}>
              <View style={styles.header}>
                {/* Botón de Cierre a la izquierda */}
                <Animated.View style={animatedStyle}>
                  <TouchableOpacity onPress={onCancel} style={styles.closeBtn} activeOpacity={0.7}>
                    <Ionicons name="close" size={26} color="#FFF" />
                  </TouchableOpacity>
                </Animated.View>

                {/* Badge Único del Estado de Calibración / Instrucción Simplificada */}
                <Animated.View style={animatedStyle}>
                  <GlassContainer style={styles.statusBadge}>
                    <View style={styles.badgeContent}>
                      <View
                        style={[
                          styles.statusDot,
                          isAlignedBoth
                            ? isCalibrated ? styles.dotGreen : styles.dotCyan
                            : styles.dotYellow,
                        ]}
                      />
                      <Text style={[styles.badgeText, isAlignedBoth && styles.badgeTextAligned]}>
                        {isAlignedBoth
                          ? `Listo (${angleDeg.toFixed(1)}°)`
                          : !currentlyAligned
                          ? `Incline (${angleDeg.toFixed(1)}°)`
                          : `Gire (${Math.abs(rollAngle).toFixed(1)}°)`}
                      </Text>
                    </View>
                  </GlassContainer>
                </Animated.View>

                {/* Badge de Modo Activo a la derecha para equilibrar visualmente */}
                <Animated.View style={animatedStyle}>
                  <GlassContainer style={styles.modeBadge}>
                    <Text style={styles.modeBadgeText}>
                      {isCalibrated ? 'MANUAL' : (isAutoHorizontal ? 'MESA' : 'PARED')}
                    </Text>
                  </GlassContainer>
                </Animated.View>
              </View>
            </View>

            {/* Panel de Controles Inferiores */}
            <View style={styles.bottomContainer}>
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
                    isAlignedBoth && styles.shutterBtnAligned,
                    isCapturing && { opacity: 0.5 },
                  ]}
                  activeOpacity={0.8}
                >
                  <View style={[styles.shutterInner, isAlignedBoth && styles.shutterInnerAligned]} />
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
                          'Doble Nivelador Activo',
                          'Burbuja: Alinea la profundidad paralela a la placa.\nLíneas laterales: Nivelan el giro (roll) para evitar que la foto salga chueca hacia los lados.',
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
  horizonContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT / 2 - 1,
    left: 0,
    width: SCREEN_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizonLine: {
    height: 1.5,
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  horizonLineLeveled: {
    backgroundColor: Colors.primary,
    height: 2,
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 5,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  levelerContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT / 2 - LEVEL_RADIUS,
    left: SCREEN_WIDTH / 2 - LEVEL_RADIUS,
    width: LEVEL_RADIUS * 2,
    height: LEVEL_RADIUS * 2,
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
  },
  headerContainer: {
    width: '100%',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    backgroundColor: 'rgba(9, 13, 31, 0.55)',
    paddingBottom: Spacing.md,
    borderBottomWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.round,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: 75,
    alignItems: 'center',
  },
  modeBadgeText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 10,
    fontFamily: Typography.fonts.bold,
    letterSpacing: 0.5,
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  badgeTextAligned: {
    color: Colors.primary,
    fontFamily: Typography.fonts.bold,
  },
  bottomContainer: {
    width: '100%',
    backgroundColor: 'rgba(9, 13, 31, 0.55)',
    paddingBottom: Platform.OS === 'ios' ? 40 : 25,
    paddingTop: Spacing.md,
    borderTopWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: Spacing.xl,
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
