import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { Colors } from '../../../constants/theme';
import { Assets } from '../../../constants/assets';
import { analisisStyles as styles } from '../styles/analisis.styles';

interface AnalisisImageCardProps {
  uri: string | undefined;
  isLoading: boolean;
  scanId?: string;
  onPress: () => void;
  loadingText?: string;
}

export const AnalisisImageCard: React.FC<AnalisisImageCardProps> = ({
  uri,
  isLoading,
  scanId,
  onPress,
  loadingText
}) => {
  return (
    <TouchableOpacity style={styles.imageCard} activeOpacity={0.9} onPress={onPress}>
      {uri ? (
        <Image source={{ uri }} style={styles.scanImage} resizeMode="contain" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Ionicons name="scan" size={48} color={Colors.primary} />
        </View>
      )}

      <View style={styles.scanIdTag}>
        <Text style={styles.scanIdText}>SCAN_ID: {scanId || 'NUEVO'}</Text>
      </View>
      
      <View style={styles.zoomHint}>
        <Ionicons name="expand-outline" size={16} color={Colors.primary} />
        <Text style={styles.zoomText}>Toca para ampliar</Text>
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <LottieView
            autoPlay
            style={{ width: 100, height: 100 }}
            source={Assets.lottie.medicalRadar}
            colorFilters={[{ keypath: "Circle", color: Colors.primary }]}
          />
          <Text style={styles.loadingText}>{loadingText || 'Procesando...'}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
