import React from 'react';
import { View, Modal, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { analisisStyles as styles } from '../styles/analisis.styles';

interface ZoomViewerModalProps {
  visible: boolean;
  onClose: () => void;
  imageUri: string | undefined;
}

export const ZoomViewerModal: React.FC<ZoomViewerModalProps> = ({
  visible,
  onClose,
  imageUri
}) => {
  if (!imageUri) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.modalBg}>
        <TouchableOpacity style={styles.closeModalBtn} onPress={onClose}>
          <Ionicons name="close-circle" size={44} color="#FFF" />
        </TouchableOpacity>
        
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
          maximumZoomScale={5}
          minimumZoomScale={1}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          centerContent
        >
          <Image 
            source={{ uri: imageUri }} 
            style={{ width: '100%', height: '100%' }} 
            resizeMode="contain" 
          />
        </ScrollView>
      </View>
    </Modal>
  );
};
