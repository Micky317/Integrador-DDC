import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../../constants/theme';
import { Texts } from '../../../constants/texts';
import { AppInput } from '../../../components/AppInput';
import { PrimaryButton } from '../../../components/PrimaryButton';

interface RevisionVideoModalProps {
  visible: boolean;
  videoUrl: string; // URL pública del video en Supabase
  ejercicioNombre: string;
  pacienteNombre: string;
  onClose: () => void;
  onEvaluate: (estado: 'Aprobado' | 'Rechazado', comentario?: string) => Promise<void>;
}

export const RevisionVideoModal: React.FC<RevisionVideoModalProps> = ({
  visible,
  videoUrl,
  ejercicioNombre,
  pacienteNombre,
  onClose,
  onEvaluate
}) => {
  const [comentario, setComentario] = useState('');
  const [showComentarioInput, setShowComentarioInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Nuevo reproductor de Expo Video
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = true;
    player.play();
  });

  const handleApprove = async () => {
    setIsSubmitting(true);
    await onEvaluate('Aprobado', 'Excelente técnica. Sigue así.');
    setIsSubmitting(false);
    onClose();
  };

  const handleReject = async () => {
    if (!showComentarioInput) {
      setShowComentarioInput(true); // Mostrar input para justificar el rechazo
      return;
    }

    if (!comentario.trim()) return; // No permitir rechazo sin justificación
    
    setIsSubmitting(true);
    await onEvaluate('Rechazado', comentario);
    setIsSubmitting(false);
    setComentario('');
    setShowComentarioInput(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>Evaluación Técnica</Text>
                <Text style={styles.subtitle}>{pacienteNombre} - {ejercicioNombre}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Reproductor de Video */}
            <View style={styles.videoContainer}>
              <VideoView
                player={player}
                style={styles.video}
                allowsFullscreen
                allowsPictureInPicture
              />
            </View>

            {/* Zona de Evaluación — scrolleable para que no tape el teclado */}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.evaluationArea}
            >
              {showComentarioInput ? (
                <View style={styles.feedbackContainer}>
                  <Text style={styles.feedbackTitle}>¿Qué debe corregir el paciente?</Text>
                  <AppInput
                    placeholder="Ej: Necesita bajar más la cadera..."
                    value={comentario}
                    onChangeText={setComentario}
                    multiline
                    numberOfLines={3}
                  />
                  <View style={styles.feedbackActions}>
                    <TouchableOpacity 
                      style={styles.cancelBtn} 
                      onPress={() => setShowComentarioInput(false)}
                    >
                      <Text style={styles.cancelText}>{Texts.common.cancel}</Text>
                    </TouchableOpacity>
                    <PrimaryButton 
                      title="Enviar Corrección" 
                      onPress={handleReject}
                      loading={isSubmitting}
                      disabled={!comentario.trim()}
                      style={{ flex: 1 }}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[styles.evalBtn, styles.btnReject]} 
                    onPress={handleReject}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="alert-circle-outline" size={24} color="#FF4757" />
                    <Text style={styles.btnRejectText}>Pedir Corrección</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.evalBtn, styles.btnApprove]} 
                    onPress={handleApprove}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#00E5CC', '#10B981']}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <Ionicons name="checkmark-circle-outline" size={24} color="#090D1F" />
                    <Text style={styles.btnApproveText}>Aprobar Técnica</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 13, 31, 0.92)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.size.lg,
    fontFamily: Typography.fonts.bold,
  },
  subtitle: {
    color: Colors.primary,
    fontSize: Typography.size.sm,
    fontFamily: Typography.fonts.medium,
    marginTop: 4,
  },
  closeBtn: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radius.round,
  },
  videoContainer: {
    height: 260,          // Altura fija: ocupa lo justo sin aplastar los botones
    backgroundColor: '#000',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadow.card,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  evaluationArea: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: Colors.borderDefault,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  evalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: Radius.xl,
    gap: 8,
    overflow: 'hidden',
  },
  btnReject: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 71, 87, 0.3)',
  },
  btnRejectText: {
    color: '#FF4757',
    fontSize: Typography.size.base,
    fontFamily: Typography.fonts.bold,
  },
  btnApprove: {
    // bg via gradient
  },
  btnApproveText: {
    color: Colors.bgDeep,
    fontSize: Typography.size.base,
    fontFamily: Typography.fonts.bold,
  },
  feedbackContainer: {
    gap: Spacing.md,
  },
  feedbackTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.size.md,
    fontFamily: Typography.fonts.semibold,
    marginBottom: Spacing.xs,
  },
  feedbackActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  cancelBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
  },
  cancelText: {
    color: Colors.textMuted,
    fontFamily: Typography.fonts.medium,
  }
});
