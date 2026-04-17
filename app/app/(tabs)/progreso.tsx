import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadow } from '../../src/constants/theme';
import { GlassContainer } from '../../src/components/GlassContainer';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { useVinculosPadre } from '../../src/features/padres/hooks/useVinculos';
import { PacienteCard } from '../../src/features/pacientes/components/PacienteCard';

export default function MisBebesScreen() {
  const { misBebes, isLoading, vincular, isLinking } = useVinculosPadre();
  const [showModal, setShowModal] = useState(false);
  const [codigo, setCodigo] = useState('');

  const handleCloseModal = () => {
    setShowModal(false);
    setCodigo('');
  };

  const handleVincular = () => {
    if (!codigo) return;
    vincular(codigo, {
      onSuccess: () => {
        handleCloseModal();
      }
    });
  };

  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.gradient}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hola,</Text>
          <Text style={styles.title}>Mis Bebés</Text>
        </View>
        <TouchableOpacity 
          style={styles.addBtn} 
          onPress={() => setShowModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color={Colors.bgDeep} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : misBebes && misBebes.length > 0 ? (
          misBebes.map((bebe) => (
            <PacienteCard 
              key={bebe.id}
              paciente={bebe}
              onPress={() => router.push({ pathname: '/(tabs)/paciente-detalle', params: { id: bebe.id } })}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <GlassContainer intensity={10} style={styles.emptyCard}>
              <Ionicons name="heart-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Aún no tienes bebés vinculados</Text>
              <Text style={styles.emptySub}>
                Pide el código DDC al médico de tu bebé y regístralo aquí para ver sus resultados.
              </Text>
              <PrimaryButton 
                title="Vincular con Código" 
                onPress={() => setShowModal(true)} 
                style={{ width: '100%', marginTop: Spacing.md }}
              />
            </GlassContainer>
          </View>
        )}
      </ScrollView>

      {/* Modal para ingresar código */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={handleCloseModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TouchableOpacity style={styles.closeBtn} onPress={handleCloseModal}>
              <Ionicons name="close" size={24} color={Colors.textMuted} />
            </TouchableOpacity>
            
            <Ionicons name="link" size={40} color={Colors.primary} style={{ marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Vincular Bebé</Text>
            <Text style={styles.modalDesc}>Ingresa el código que te proporcionó el médico (Ej: DDC-A1B2)</Text>
            
            <TextInput
              style={styles.input}
              placeholder="DDC-XXXX"
              placeholderTextColor={Colors.textMuted}
              value={codigo}
              onChangeText={setCodigo}
              autoCapitalize="characters"
              maxLength={10}
            />

            <PrimaryButton 
              title="Confirmar Vínculo" 
              onPress={handleVincular} 
              loading={isLinking}
              disabled={!codigo || isLinking}
              style={{ width: '100%' }}
            />
          </View>
        </View>
      </Modal>

    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.xl, 
    paddingTop: 70, 
    paddingBottom: Spacing.md 
  },
  welcomeText: { color: Colors.textSecondary, fontSize: Typography.size.base },
  title: { color: Colors.textPrimary, fontSize: Typography.size.xxl, fontWeight: Typography.weight.bold },
  addBtn: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: Colors.primary, 
    alignItems: 'center', 
    justifyContent: 'center',
    ...Shadow.glow 
  },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100, paddingTop: Spacing.md },
  center: { marginTop: 100, alignItems: 'center' },
  emptyContainer: { marginTop: 40 },
  emptyCard: { padding: Spacing.xl, alignItems: 'center', textAlign: 'center' },
  emptyTitle: { color: Colors.textPrimary, fontSize: Typography.size.md, fontWeight: Typography.weight.bold, marginTop: 16 },
  emptySub: { color: Colors.textSecondary, fontSize: Typography.size.sm, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: Spacing.xl },
  modalCard: { backgroundColor: Colors.bgCard, borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center' },
  modalTitle: { color: Colors.textPrimary, fontSize: Typography.size.lg, fontWeight: Typography.weight.bold, marginBottom: 8 },
  modalDesc: { color: Colors.textSecondary, fontSize: Typography.size.sm, textAlign: 'center', marginBottom: 24, lineHeight: 18 },
  closeBtn: { position: 'absolute', top: 16, right: 16 },
  input: { 
    width: '100%', 
    height: 56, 
    backgroundColor: Colors.bgCardLight, 
    borderRadius: Radius.md, 
    borderWidth: 1, 
    borderColor: Colors.borderDefault, 
    color: Colors.textPrimary, 
    fontSize: Typography.size.lg, 
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: Spacing.xl
  }
});
