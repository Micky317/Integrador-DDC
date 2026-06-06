import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';

/**
 * Hook para manejar la selección de fotos y videos con permisos incluidos.
 */
export const useMediaPicker = () => {
  
  const requestPermissions = async (type: 'camera' | 'library' | 'video') => {
    if (type === 'library') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    }

    // Para video o cámara, pedimos cámara
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    
    // Si es video, TAMBIÉN necesitamos el micrófono obligatoriamente
    if (type === 'video') {
      const micStatus = await Camera.requestMicrophonePermissionsAsync();
      if (micStatus.status !== 'granted' || cameraStatus.status !== 'granted') {
        Alert.alert('Permisos insuficientes', 'Necesitamos acceso a la cámara y al micrófono para grabar el video.');
        return false;
      }
      return true;
    }

    if (cameraStatus.status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu cámara para tomar fotos.');
      return false;
    }
    return true;
  };

  const pickImage = async (options: ImagePicker.ImagePickerOptions = {}) => {
    const hasPermission = await requestPermissions('library');
    if (!hasPermission) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      ...options
    });

    return result.canceled ? null : result.assets[0];
  };

  const takePhoto = async (options: ImagePicker.ImagePickerOptions = {}) => {
    const hasPermission = await requestPermissions('camera');
    if (!hasPermission) return null;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      ...options
    });

    return result.canceled ? null : result.assets[0];
  };

  const recordVideo = async (options: ImagePicker.ImagePickerOptions = {}) => {
    console.log("[MediaPicker] Iniciando recordVideo...");
    const hasPermission = await requestPermissions('video');
    console.log("[MediaPicker] Permisos obtenidos:", hasPermission);
    if (!hasPermission) return null;

    try {
      console.log("[MediaPicker] Lanzando launchCameraAsync con ['videos']...");
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        videoMaxDuration: 30,
        quality: 0.8,
        ...options
      });
      console.log("[MediaPicker] Resultado de cámara:", result.canceled ? "Cancelado" : "Capturado");
      return result.canceled ? null : result.assets[0];
    } catch (error) {
      console.error("[MediaPicker] Error en launchCameraAsync:", error);
      Alert.alert("Error de Cámara", "No se pudo abrir la cámara de video.");
      return null;
    }
  };

  const pickVideo = async (options: ImagePicker.ImagePickerOptions = {}) => {
    const hasPermission = await requestPermissions('library');
    if (!hasPermission) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 0.8,
      ...options
    });

    return result.canceled ? null : result.assets[0];
  };

  return {
    pickImage,
    takePhoto,
    recordVideo,
    pickVideo
  };
};
