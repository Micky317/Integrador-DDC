import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/theme';
import { styles } from '../styles/rehabilitacion.styles';

interface VoiceSelectorProps {
  availableVoices: any[];
  selectedVoice: any;
  onSelectVoice: (voice: any) => void;
}

export const VoiceSelector: React.FC<VoiceSelectorProps> = ({
  availableVoices,
  selectedVoice,
  onSelectVoice
}) => {
  const [showVoices, setShowVoices] = useState(false);

  if (availableVoices.length === 0) return null;

  return (
    <View style={{ marginBottom: 30 }}>
      <TouchableOpacity
        style={styles.dropdownHeader}
        onPress={() => setShowVoices(!showVoices)}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.voiceIconCircle}>
            <Ionicons name="mic-outline" size={18} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.dropdownLabel}>Voz del Asistente</Text>
            <Text style={styles.selectedVoiceName}>
              {selectedVoice?.name || 'Seleccionar voz...'}
            </Text>
          </View>
        </View>
        <Ionicons
          name={showVoices ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Colors.textMuted}
        />
      </TouchableOpacity>

      {showVoices && (
        <View style={styles.dropdownList}>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {availableVoices.map((voice) => (
              <TouchableOpacity
                key={voice.identifier}
                style={[
                  styles.dropdownItem,
                  selectedVoice?.identifier === voice.identifier && { backgroundColor: Colors.primary + '10' }
                ]}
                onPress={() => {
                  onSelectVoice(voice);
                  setShowVoices(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    selectedVoice?.identifier === voice.identifier && { color: Colors.primary, fontWeight: 'bold' }
                  ]}
                >
                  {voice.name} ({voice.language})
                </Text>
                {selectedVoice?.identifier === voice.identifier && (
                  <Ionicons name="checkmark" size={18} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};
