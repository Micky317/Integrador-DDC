import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, ScrollView, Image, TouchableOpacity, PanResponder, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const getFriendlyLabel = (label: string) => {
  switch (label) {
    case 'KP_0': return 'Techo Der. (Rx Izq.)';
    case 'KP_1': return 'Cartílago Y Der.';
    case 'KP_2': return 'Cabeza Femoral Der.';
    case 'KP_3': return 'Cuello Femoral Der.';
    case 'KP_4': return 'Techo Izq. (Rx Der.)';
    case 'KP_5': return 'Cartílago Y Izq.';
    case 'KP_6': return 'Cabeza Femoral Izq.';
    case 'KP_7': return 'Cuello Femoral Izq.';
    default: return label.replace('KP_', 'Punto ');
  }
};

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
          <Text style={{ position: 'absolute', top: -20, color: '#00FFCC', fontSize: 10, fontWeight: 'bold', width: 120, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, overflow: 'hidden' }}>
              {getFriendlyLabel(point.label)}
          </Text>
      </Animated.View>
  );
};

export const EditorPuntosModal = ({ visible, onClose, imageUri, originalSize, puntos, setPuntos, onSave, calculando }: any) => {
  // 1. Declarar todos los hooks al inicio para respetar las reglas de React
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

  // Relación de aspecto temporal para inicializar los hooks antes de cargar measuredSize
  const effectiveAspect = (measuredSize && measuredSize.w && measuredSize.h)
    ? (measuredSize.w / measuredSize.h)
    : (originalSize && originalSize.w && originalSize.h ? originalSize.w / originalSize.h : 1.33);
  const containerHeight = SCREEN_WIDTH / effectiveAspect;

  const [containerSize, setContainerSize] = useState({ w: SCREEN_WIDTH, h: containerHeight });
  const [zoomScale, setZoomScale] = useState(1);
  const scrollRef = useRef<ScrollView>(null);
  const [zoomKey, setZoomKey] = useState(Date.now());

  // Zoom máximo controlado. Bajarlo momentáneamente a 1 fuerza al ScrollView
  // a recortar el pinch-zoom actual de vuelta a 1 (no existe API directa para
  // fijar el zoomScale por código).
  const [maxZoom, setMaxZoom] = useState(5);

  useEffect(() => {
    setContainerSize({ w: SCREEN_WIDTH, h: containerHeight });
  }, [containerHeight]);

  useEffect(() => {
    if (visible) {
      setZoomKey(Date.now());
      setZoomScale(1);
      setMaxZoom(5);
    }
  }, [visible]);

  // Restablece el zoom a su estado original y, una vez aplicado, ejecuta la
  // acción del botón (cerrar o actualizar). Así la imagen vuelve a centrarse
  // antes de salir y no arrastra el zoom al siguiente apartado.
  const resetZoomThen = (action?: () => void) => {
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
      console.warn(e);
    }
    
    setTimeout(() => {
      setMaxZoom(1);
      setZoomScale(1);
      setZoomKey(Date.now());
      action?.();
    }, 350);
  };

  // 2. Colocar todos los retornos condicionales después de los hooks
  if (!visible) return null;

  if (!measuredSize) {
    return (
      <Modal 
        visible={visible} 
        animationType="slide" 
        transparent={false}
        onRequestClose={() => onClose?.()}
      >
        <View style={{ flex: 1, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#00FFCC', fontSize: 16 }}>Cargando editor...</Text>
        </View>
      </Modal>
    );
  }

  const displayHeight = SCREEN_HEIGHT - 140;
  const paddingTop = containerHeight < displayHeight ? (displayHeight - containerHeight) / 2 : 0;

  return (
    <Modal 
      visible={visible} 
      animationType="slide" 
      transparent={false}
      onRequestClose={() => resetZoomThen(onClose)}
    >
      <View style={{ flex: 1, backgroundColor: '#111' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#222' }}>
          <TouchableOpacity onPress={() => resetZoomThen(onClose)} disabled={calculando}>
            <Text style={{ color: '#FFF', fontSize: 16 }}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={{ color: '#00FFCC', fontSize: 16, fontWeight: 'bold' }}>Ajustar Puntos</Text>
          <TouchableOpacity onPress={() => resetZoomThen(onSave)} disabled={calculando}>
            <Text style={{ color: calculando ? '#888' : '#00FFCC', fontSize: 16, fontWeight: 'bold' }}>{calculando ? 'Calculando...' : 'Actualizar'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ color: '#AAA', textAlign: 'center', padding: 10, fontSize: 12 }}>
          Pellizca con dos dedos para acercar. Arrastra los puntos.
        </Text>

        <ScrollView
          key={`editor-scroll-${zoomKey}`}
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ 
            alignItems: 'center' 
          }}
          maximumZoomScale={maxZoom}
          minimumZoomScale={1}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const scale = e.nativeEvent.zoomScale;
            if (scale) setZoomScale(scale);
          }}
        >
          <View style={{ width: SCREEN_WIDTH, height: Math.max(displayHeight, containerHeight), position: 'relative' }}>
            <View
              style={{ width: SCREEN_WIDTH, height: containerHeight, position: 'absolute', top: paddingTop, left: 0 }}
              onLayout={(e) => setContainerSize({w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height})}
            >
              {imageUri ? (
                  <Image source={{ uri: imageUri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              ) : null}

              {measuredSize && puntos.map((pt: any, i: number) => (
                  <DraggablePoint
                      key={`pt-${pt.id}-${i}`}
                      point={pt}
                      originalSize={measuredSize}
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
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};
