import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, ScrollView, Image, TouchableOpacity, PanResponder, Animated } from 'react-native';

const DraggablePoint = ({ point, originalSize, containerSize, onUpdate, zoomScale, scrollRef }: any) => {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  
  const ctx = useRef({ originalSize, containerSize, zoomScale, point });
  ctx.current = { originalSize, containerSize, zoomScale, point };

  const [pos, setPos] = useState({
      x: (point.x / originalSize.w) * containerSize.w,
      y: (point.y / originalSize.h) * containerSize.h
  });

  useEffect(() => {
      setPos({
          x: (point.x / originalSize.w) * containerSize.w,
          y: (point.y / originalSize.h) * containerSize.h
      });
      pan.setValue({ x: 0, y: 0 });
  }, [originalSize, containerSize, point.x, point.y]);

  const panResponder = useRef(
      PanResponder.create({
          onStartShouldSetPanResponder: (e, g) => g.numberActiveTouches === 1,
          onStartShouldSetPanResponderCapture: (e, g) => g.numberActiveTouches === 1,
          onMoveShouldSetPanResponder: (e, g) => g.numberActiveTouches === 1,
          onPanResponderGrant: () => {
              pan.setOffset({ x: 0, y: 0 });
              pan.setValue({ x: 0, y: 0 });
              scrollRef?.current?.setNativeProps({ scrollEnabled: false });
          },
          onPanResponderMove: (evt, gestureState) => {
              if (gestureState.numberActiveTouches > 1) return;
              pan.setValue({
                  x: gestureState.dx / ctx.current.zoomScale,
                  y: gestureState.dy / ctx.current.zoomScale
              });
          },
          onPanResponderRelease: (evt, gestureState) => {
              const dx = gestureState.dx / ctx.current.zoomScale;
              const dy = gestureState.dy / ctx.current.zoomScale;

              const c = ctx.current.containerSize;
              const o = ctx.current.originalSize;
              
              const currentScreenX = (ctx.current.point.x / o.w) * c.w;
              const currentScreenY = (ctx.current.point.y / o.h) * c.h;
              
              const finalScreenX = currentScreenX + dx;
              const finalScreenY = currentScreenY + dy;

              const origX = (finalScreenX / c.w) * o.w;
              const origY = (finalScreenY / c.h) * o.h;
              
              pan.setValue({ x: 0, y: 0 });
              onUpdate({ ...ctx.current.point, x: origX, y: origY });
              scrollRef?.current?.setNativeProps({ scrollEnabled: true });
          },
          onPanResponderTerminate: () => {
              pan.setValue({ x: 0, y: 0 });
              scrollRef?.current?.setNativeProps({ scrollEnabled: true });
          }
      })
  ).current;

  const size = 24;

  if (!containerSize.w || !containerSize.h || isNaN(pos.x) || isNaN(pos.y)) return null;

  return (
      <Animated.View
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          style={{
              position: 'absolute',
              left: pos.x - size / 2,
              top: pos.y - size / 2,
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: 'rgba(0, 255, 204, 0.4)',
              borderWidth: 2,
              borderColor: '#00FFCC',
              justifyContent: 'center',
              alignItems: 'center',
              transform: [
                  ...pan.getTranslateTransform(),
                  { scale: 1 / Math.max(1, zoomScale) }
              ],
              zIndex: 10
          }}
          {...panResponder.panHandlers}
      >
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' }} />
          <Text style={{ position: 'absolute', top: -20, color: '#00FFCC', fontSize: 10, fontWeight: 'bold', width: 90, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, overflow: 'hidden' }}>
              {point.label}
          </Text>
      </Animated.View>
  );
};

export const EditorPuntosModal = ({ visible, onClose, imageUri, originalSize, puntos, setPuntos, onSave, calculando }: any) => {
  const [containerSize, setContainerSize] = useState({ w: 100, h: 100 });
  const [zoomScale, setZoomScale] = useState(1);
  const scrollRef = useRef<ScrollView>(null);

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={{ flex: 1, backgroundColor: '#111' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#222' }}>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: '#FFF', fontSize: 16 }}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={{ color: '#00FFCC', fontSize: 16, fontWeight: 'bold' }}>Ajustar Puntos</Text>
          <TouchableOpacity onPress={onSave} disabled={calculando}>
            <Text style={{ color: calculando ? '#888' : '#00FFCC', fontSize: 16, fontWeight: 'bold' }}>{calculando ? 'Calculando...' : 'Actualizar'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ color: '#AAA', textAlign: 'center', padding: 10, fontSize: 12 }}>
          Pellizca con dos dedos para acercar. Arrastra los puntos.
        </Text>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}
          maximumZoomScale={5}
          minimumZoomScale={1}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const scale = e.nativeEvent.zoomScale;
            if (scale) setZoomScale(scale);
          }}
        >
            <View 
              style={{ width: '100%', aspectRatio: originalSize.w / originalSize.h, position: 'relative' }}
              onLayout={(e) => setContainerSize({w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height})}
            >
              {imageUri ? (
                  <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              ) : null}
              
              {puntos.map((pt: any, i: number) => (
                  <DraggablePoint 
                      key={`pt-${pt.id}-${i}`}
                      point={pt} 
                      originalSize={originalSize} 
                      containerSize={containerSize} 
                      zoomScale={zoomScale}
                      scrollRef={scrollRef}
                      onUpdate={(newPt: any) => {
                          setPuntos((prev: any[]) => {
                              const copiados = [...prev];
                              copiados[i] = newPt;
                              return copiados;
                          });
                      }}
                  />
              ))}
            </View>
        </ScrollView>
      </View>
    </Modal>
  );
};
