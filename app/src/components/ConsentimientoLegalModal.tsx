import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, Shadow, Typography } from '../constants/theme';
import { GlassContainer } from './GlassContainer';
import { PrimaryButton } from './PrimaryButton';

interface ConsentimientoLegalModalProps {
  visible: boolean;
  onAccept: (dontShowAgain: boolean) => void;
  onCancel: () => void;
}

export const ConsentimientoLegalModal: React.FC<ConsentimientoLegalModalProps> = ({ visible, onAccept, onCancel }) => {
  const [dontShowAgain, setDontShowAgain] = React.useState(false);
  const [hasReadToBottom, setHasReadToBottom] = React.useState(false);

  // Resetear estados cada vez que el modal se abre
  React.useEffect(() => {
    if (visible) {
      setHasReadToBottom(false);
      setDontShowAgain(false);
    }
  }, [visible]);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    // Margen de 20px para mayor tolerancia
    const isAtBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
    if (isAtBottom) {
      setHasReadToBottom(true);
    }
  };

  const handleContentSizeChange = (contentWidth: number, contentHeight: number) => {
    // Si el contenido es más pequeño que el área visible (no hay scroll), lo habilitamos
    if (contentHeight <= 280) {
      setHasReadToBottom(true);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <GlassContainer intensity={40} style={styles.container}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Consentimiento Informado</Text>
          </View>

          <ScrollView 
            style={styles.content} 
            showsVerticalScrollIndicator={true}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={handleContentSizeChange}
          >
            <Text style={styles.legalText}>
              Para validar la técnica de rehabilitación de su bebé, es necesario capturar un video breve del ejercicio realizado.
              {"\n\n"}
              <Text style={styles.boldText}>Privacidad y Protección de Datos:</Text>
              {"\n"}
              • El video será cifrado y almacenado en un servidor médico seguro.
              {"\n"}
              • <Text style={styles.highlight}>ÚNICAMENTE</Text> su médico asignado tendrá acceso para visualizar este material.
              {"\n"}
              • El video no se compartirá con terceros ni se usará para fines publicitarios.
              {"\n"}
              • Usted puede solicitar la eliminación del video en cualquier momento desde la configuración.
              {"\n\n"}
              Al presionar "Aceptar y Grabar", usted autoriza el procesamiento de este material audiovisual estrictamente para fines de supervisión clínica.
            </Text>
          </ScrollView>

          <TouchableOpacity 
            style={styles.checkboxContainer} 
            onPress={() => setDontShowAgain(!dontShowAgain)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={dontShowAgain ? "checkbox" : "square-outline"} 
              size={24} 
              color={dontShowAgain ? Colors.primary : Colors.textMuted} 
            />
            <Text style={styles.checkboxLabel}>No volver a mostrar este mensaje</Text>
          </TouchableOpacity>

          {!hasReadToBottom && (
            <Text style={styles.scrollHint}>
              Por favor, desliza hasta el final para leer todo el texto.
            </Text>
          )}

          <View style={styles.footer}>
            <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <PrimaryButton 
              title="Aceptar y Grabar" 
              onPress={() => onAccept(dontShowAgain)} 
              style={styles.acceptBtn}
              icon="videocam"
              disabled={!hasReadToBottom}
            />
          </View>
        </GlassContainer>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  container: {
    width: '100%',
    maxHeight: '90%',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    color: '#FFF',
    fontSize: 22,
    fontFamily: Typography.fonts.bold,
    textAlign: 'center',
  },
  content: {
    maxHeight: 280,
    marginBottom: Spacing.md,
  },
  legalText: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'justify',
    paddingRight: Spacing.md, // Deja espacio para la barra de scroll
  },
  boldText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  highlight: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: Colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  acceptBtn: {
    flex: 2,
    height: 56,
    borderRadius: Radius.lg,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  checkboxLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginLeft: Spacing.sm,
  },
  scrollHint: {
    color: Colors.accent,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    fontFamily: Typography.fonts.medium,
  },
});
