import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StatusBar,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';

interface VideoRecorderScreenProps {
  visible: boolean;
  maxDurationSeconds?: number;
  onVideoRecorded: (uri: string) => void;
  onCancel: () => void;
}

export const VideoRecorderScreen: React.FC<VideoRecorderScreenProps> = ({
  visible,
  maxDurationSeconds = 30,
  onVideoRecorded,
  onCancel,
}) => {
  const cameraRef = useRef<CameraView>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(maxDurationSeconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  // Pedir permisos al abrirse
  useEffect(() => {
    if (visible) {
      (async () => {
        if (!cameraPermission?.granted) await requestCameraPermission();
        if (!micPermission?.granted) await requestMicPermission();
      })();
    }
  }, [visible]);

  // Reset timer cuando se abre el modal
  useEffect(() => {
    if (visible) {
      setSecondsLeft(maxDurationSeconds);
      setIsRecording(false);
    }
  }, [visible]);

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;

    try {
      setIsRecording(true);
      setSecondsLeft(maxDurationSeconds);

      // Countdown timer
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      const video = await cameraRef.current.recordAsync({
        maxDuration: maxDurationSeconds,
      });

      if (video?.uri) {
        onVideoRecorded(video.uri);
      }
    } catch (error) {
      console.error('[VideoRecorder] Error al grabar:', error);
      Alert.alert('Error', 'No se pudo grabar el video. Intenta de nuevo.');
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    cameraRef.current?.stopRecording();
    setIsRecording(false);
  };

  const handleCancel = () => {
    if (isRecording) stopRecording();
    onCancel();
  };

  const hasPermissions = cameraPermission?.granted && micPermission?.granted;

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.container}>
        {hasPermissions ? (
        <View style={styles.cameraWrapper}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            facing="back"
            mode="video"
          />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.timerContainer}>
              <View style={[styles.recDot, isRecording && styles.recDotActive]} />
              <Text style={styles.timerText}>
                {isRecording ? `${secondsLeft}s` : `Máx. ${maxDurationSeconds}s`}
              </Text>
            </View>
            <View style={{ width: 44 }} />
          </View>

          {/* Instrucción */}
          {!isRecording && (
            <View style={styles.instructionBox}>
              <Text style={styles.instructionText}>
                Graba al bebé realizando el ejercicio
              </Text>
            </View>
          )}

          {/* Controles */}
          <View style={styles.controls}>
            {isRecording ? (
              <TouchableOpacity onPress={stopRecording} style={styles.stopBtn} activeOpacity={0.8}>
                <View style={styles.stopIcon} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={startRecording} style={styles.recordBtn} activeOpacity={0.8}>
                <View style={styles.recordInner} />
              </TouchableOpacity>
            )}
            <Text style={styles.controlHint}>
              {isRecording ? 'Toca para detener' : 'Toca para grabar'}
            </Text>
          </View>
        </View>
        ) : (
          // Pantalla de permisos denegados
          <View style={styles.permissionContainer}>
            <Ionicons name="videocam-off" size={64} color={Colors.textMuted} />
            <Text style={styles.permissionTitle}>Permisos necesarios</Text>
            <Text style={styles.permissionText}>
              Necesitamos acceso a la cámara y al micrófono para grabar el ejercicio.
            </Text>
            <TouchableOpacity
              style={styles.permissionBtn}
              onPress={async () => {
                await requestCameraPermission();
                await requestMicPermission();
              }}
            >
              <Text style={styles.permissionBtnText}>Otorgar Permisos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: Spacing.md }} onPress={onCancel}>
              <Text style={{ color: Colors.textMuted }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.round,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.textMuted,
  },
  recDotActive: {
    backgroundColor: '#FF4757',
  },
  timerText: {
    color: '#FFF',
    fontSize: Typography.size.base,
    fontFamily: Typography.fonts.bold,
  },
  instructionBox: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
  },
  instructionText: {
    color: '#FFF',
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.medium,
    textAlign: 'center',
  },
  controls: {
    alignItems: 'center',
    paddingBottom: 60,
    gap: Spacing.md,
  },
  recordBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FF4757',
  },
  stopBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FF4757',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,71,87,0.2)',
  },
  stopIcon: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#FF4757',
  },
  controlHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.regular,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
    backgroundColor: '#090D1F',
  },
  permissionTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontFamily: Typography.fonts.bold,
  },
  permissionText: {
    color: Colors.textSecondary,
    fontSize: Typography.size.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    marginTop: Spacing.md,
  },
  permissionBtnText: {
    color: Colors.bgDeep,
    fontSize: Typography.size.base,
    fontFamily: Typography.fonts.bold,
  },
});
