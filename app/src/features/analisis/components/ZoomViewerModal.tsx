import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { analisisStyles as styles } from '../styles/analisis.styles';

interface ZoomViewerModalProps {
  visible: boolean;
  onClose: () => void;
  imageUri: string | undefined;
  originalSize?: { w: number; h: number };
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ZoomViewerModal: React.FC<ZoomViewerModalProps> = ({
  visible,
  onClose,
  imageUri,
  originalSize
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const [zoomKey, setZoomKey] = useState(Date.now());
  const [maxZoom, setMaxZoom] = useState(5);

  useEffect(() => {
    if (visible) {
      setZoomKey(Date.now());
      setMaxZoom(5);
    }
  }, [visible]);

  // Si la pantalla padre ya midió el tamaño original, lo usamos de forma síncrona
  // e instantánea para evitar llamadas asíncronas lentas o fallidas sobre base64.
  const initialSize = (originalSize && originalSize.w && originalSize.h && originalSize.w !== 1000)
    ? originalSize
    : null;

  const [measuredSize, setMeasuredSize] = useState<{ w: number; h: number } | null>(initialSize);

  useEffect(() => {
    if (!measuredSize && imageUri) {
      Image.getSize(
        imageUri,
        (w, h) => setMeasuredSize({ w, h }),
        () => setMeasuredSize(originalSize && originalSize.w && originalSize.h ? originalSize : { w: 1000, h: 750 })
      );
    }
  }, [imageUri, measuredSize]);

  if (!imageUri) return null;

  if (!measuredSize) {
    return (
      <Modal visible={visible} transparent={false} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#00FFCC', fontSize: 16 }}>Cargando vista...</Text>
        </View>
      </Modal>
    );
  }

  const aspect = measuredSize.w / measuredSize.h;
  const containerHeight = SCREEN_WIDTH / aspect;
  const displayHeight = SCREEN_HEIGHT - 90;
  const paddingTop = containerHeight < displayHeight ? (displayHeight - containerHeight) / 2 : 0;

  const resetZoomAndClose = (callback: () => void) => {
    try {
      const responder = scrollRef.current?.getScrollResponder() as any;
      if (responder) {
        if (typeof responder.scrollResponderZoomTo === 'function') {
          responder.scrollResponderZoomTo({
            x: 0,
            y: 0,
            width: SCREEN_WIDTH,
            height: containerHeight,
            animated: true
          });
        } else if (typeof responder.zoomToRect === 'function') {
          responder.zoomToRect({
            x: 0,
            y: 0,
            width: SCREEN_WIDTH,
            height: containerHeight,
            animated: true
          });
        } else if (typeof responder.scrollTo === 'function') {
          responder.scrollTo({ x: 0, y: 0, animated: true });
        }
      } else if (scrollRef.current) {
        if (typeof (scrollRef.current as any).zoomToRect === 'function') {
          (scrollRef.current as any).zoomToRect({
            x: 0,
            y: 0,
            width: SCREEN_WIDTH,
            height: containerHeight,
            animated: true
          });
        } else {
          scrollRef.current.scrollTo({ x: 0, y: 0, animated: true });
        }
      }
    } catch (e) {
      console.warn('Error resetting zoom:', e);
    }
    
    setTimeout(() => {
      setMaxZoom(1);
      setZoomKey(Date.now());
      callback();
    }, 350);
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={() => resetZoomAndClose(onClose)}
    >
      <View style={{ flex: 1, backgroundColor: '#111' }}>
        {/* Header matching EditorPuntosModal */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#222', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => resetZoomAndClose(onClose)}>
            <Text style={{ color: '#FFF', fontSize: 16 }}>Cerrar</Text>
          </TouchableOpacity>
          <Text style={{ color: '#00FFCC', fontSize: 16, fontWeight: 'bold' }}>Vista Ampliada</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView
          key={`zoom-scroll-${zoomKey}`}
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            alignItems: 'center'
          }}
          maximumZoomScale={maxZoom}
          minimumZoomScale={1}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ width: SCREEN_WIDTH, height: Math.max(displayHeight, containerHeight), position: 'relative' }}>
            <Image
              key={imageUri}
              source={{ uri: imageUri }}
              style={{ width: SCREEN_WIDTH, height: containerHeight, position: 'absolute', top: paddingTop, left: 0 }}
              resizeMode="contain"
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};
