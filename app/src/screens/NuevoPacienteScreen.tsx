import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Share, Linking, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { AppInput } from '../components/AppInput';
import { SectionTitle, AntecedentRow } from '../features/pacientes/components/FormAtoms';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useNuevoPaciente } from '../features/pacientes/hooks/useNuevoPaciente';
import { PrimaryButton } from '../components/PrimaryButton';

export default function NuevoPacienteScreen() {
  const { state, setters, handleContinuar, proceedToFeature } = useNuevoPaciente();
  const qrRef = useRef<any>(null);

  const handleShare = async () => {
    if (!state.successData || !qrRef.current) return;
    
    try {
      qrRef.current.toDataURL(async (data: string) => {
        // Eliminar el encabezado data:image/png;base64, para que FileSystem lo entienda
        const base64Data = data.replace(/^data:image\/png;base64,/, '');
        const tempUri = `${FileSystem.cacheDirectory}DDC-${state.successData?.codigo}.png`;
        
        try {
          await FileSystem.writeAsStringAsync(tempUri, base64Data, {
            encoding: 'base64',
          });

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(tempUri, {
              mimeType: 'image/png',
              dialogTitle: 'Compartir Código del Paciente',
              UTI: 'public.png'
            });
          } else {
            await Share.share({
              message: `¡Hola! Descarga la app DDC Pasitos Firmes y usa este código para ver los resultados de tu bebé: ${state.successData?.codigo}`,
            });
          }
        } catch (err) {
          console.error("FileSystem Error:", err);
        }
      });
    } catch (error) {
      console.log('Error sharing image', error);
    }
  };

  const handleWhatsAppShare = () => {
    if (!state.successData?.codigo) return;
    
    const parentPhone = state.telefono.replace(/\D/g, '');
    const message = `¡Hola! Le comparto el código de vinculación para la aplicación DDC Pasitos Firmes de su bebé: *${state.successData.codigo}*. Úselo para ver las radiografías, análisis y evoluciones médicas.`;
    const encodedMessage = encodeURIComponent(message);
    
    let url = '';
    if (parentPhone) {
      url = `https://wa.me/${parentPhone}?text=${encodedMessage}`;
    } else {
      url = `https://wa.me/?text=${encodedMessage}`;
    }
    
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'No se pudo abrir WhatsApp en este dispositivo.');
    });
  };

  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.gradient}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          <Text style={styles.backText}>Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nuevo Paciente</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Datos del Bebé */}
        <SectionTitle icon="person-outline" title="DATOS DEL BEBÉ" />
        <View style={styles.section}>
          <AppInput
            placeholder="Nombre completo"
            value={state.nombreCompleto}
            onChangeText={setters.setNombreCompleto}
          />
          <View style={styles.rowInputs}>
            <AppInput
              placeholder="12/05/24"
              value={state.fechaNac}
              onChangeText={setters.setFechaNac}
              containerStyle={styles.inputHalf}
              rightIcon="calendar-outline"
            />
            {/* Sexo Selector */}
            <View style={styles.sexoSelector}>
              <Text style={styles.sexoLabel}>Sexo</Text>
              <View style={styles.sexoRow}>
                {(['M', 'F'] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setters.setSexo(s)}
                    style={[styles.sexoBtn, state.sexo === s && styles.sexoBtnActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sexoBtnText, state.sexo === s && styles.sexoBtnTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          <AppInput
            placeholder="Edad gestacional (Semanas)"
            value={state.edadGestacional}
            onChangeText={setters.setEdadGestacional}
            keyboardType="numeric"
          />
        </View>

        {/* Datos de los Padres */}
        <SectionTitle icon="people-outline" title="DATOS DE LOS PADRES" />
        <View style={styles.section}>
          <AppInput
            placeholder="Nombre del Tutor"
            value={state.nombreTutor}
            onChangeText={setters.setNombreTutor}
          />
          <AppInput
            placeholder="+54 000 000 000"
            value={state.telefono}
            onChangeText={setters.setTelefono}
            keyboardType="phone-pad"
            rightIcon="call-outline"
          />
        </View>

        {/* Antecedentes */}
        <SectionTitle icon="alert-circle-outline" title="ANTECEDENTES RELEVANTES" />
        <View style={styles.antecedentCard}>
          <AntecedentRow
            label="Presentación Pélvica"
            sub="Factor de riesgo detectado"
            value={state.presentacionNalgas}
            onToggle={setters.setPresentacionNalgas}
          />
          <View style={styles.divider} />
          <AntecedentRow
            label="Antecedentes familiares"
            value={state.antecedenteFamiliar}
            onToggle={setters.setAntecedenteFamiliar}
          />
        </View>

        {/* Action Button */}
        <PrimaryButton
          title="Guardar y Generar Código ›"
          onPress={handleContinuar}
          loading={state.loading}
          style={styles.continueBtn}
        />
      </ScrollView>

      {/* MODAL DEL QR */}
      <Modal
        visible={!!state.successData}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name="checkmark-circle" size={48} color={Colors.statusNormal} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={styles.modalTitle}>¡Paciente Registrado!</Text>
            <Text style={styles.modalDesc}>
              Papá o mamá puede escanear este código QR para vincularse al expediente médico.
            </Text>

            <View style={styles.qrContainer}>
              {state.successData?.codigo ? (
                <QRCode
                  getRef={(c) => (qrRef.current = c)}
                  value={state.successData.codigo}
                  size={180}
                  color={Colors.bgDeep}
                  backgroundColor="#FFFFFF"
                />
              ) : null}
            </View>

            <Text style={styles.codigoText}>{state.successData?.codigo}</Text>

            <View style={styles.modalBtns}>
              <View style={styles.shareRow}>
                <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                  <Ionicons name="share-social-outline" size={20} color={Colors.primary} />
                  <Text style={styles.shareBtnText}>Compartir</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.shareBtn, styles.whatsappBtn]} onPress={handleWhatsAppShare}>
                  <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
                  <Text style={[styles.shareBtnText, { color: '#25D366' }]}>WhatsApp</Text>
                </TouchableOpacity>
              </View>

              <PrimaryButton
                title="Ir a Análisis"
                onPress={proceedToFeature}
                style={{ width: '100%' }}
              />
            </View>
          </View>
        </View>
      </Modal>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingTop: 58, paddingBottom: Spacing.md },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText: { color: Colors.textPrimary, fontSize: Typography.size.base },
  headerTitle: { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  section: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderCard },
  rowInputs: { flexDirection: 'row', gap: 12 },
  inputHalf: { flex: 1, marginBottom: 0 },
  sexoSelector: { backgroundColor: Colors.bgInput, borderRadius: Radius.md, padding: 10, borderWidth: 1.5, borderColor: Colors.borderDefault, minHeight: 52, justifyContent: 'center' },
  sexoLabel: { color: Colors.textMuted, fontSize: 10, letterSpacing: 0.5, marginBottom: 4 },
  sexoRow: { flexDirection: 'row', gap: 6 },
  sexoBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.sm, backgroundColor: Colors.bgCardLight },
  sexoBtnActive: { backgroundColor: Colors.primary },
  sexoBtnText: { color: Colors.textSecondary, fontWeight: Typography.weight.bold, fontSize: Typography.size.sm },
  sexoBtnTextActive: { color: Colors.bgDeep },
  antecedentCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.borderCard, overflow: 'hidden' },
  divider: { height: 1, backgroundColor: Colors.borderDefault, marginHorizontal: Spacing.md },
  continueBtn: { marginTop: Spacing.xl },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  modalCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.xl, width: '100%', alignItems: 'center' },
  modalTitle: { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, marginBottom: 8 },
  modalDesc: { color: Colors.textSecondary, fontSize: Typography.size.sm, textAlign: 'center', marginBottom: Spacing.xl },
  qrContainer: { padding: 16, backgroundColor: '#FFF', borderRadius: Radius.lg, marginBottom: 12 },
  codigoText: { color: Colors.primary, fontSize: Typography.size.xl, fontWeight: Typography.weight.bold, letterSpacing: 2, marginBottom: Spacing.xl },
  modalBtns: { gap: Spacing.sm, width: '100%' },
  shareRow: { flexDirection: 'row', gap: Spacing.md, width: '100%', marginBottom: Spacing.xs },
  shareBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 12 },
  whatsappBtn: { borderColor: '#25D366' },
  shareBtnText: { color: Colors.primary, fontWeight: Typography.weight.semibold },
});
