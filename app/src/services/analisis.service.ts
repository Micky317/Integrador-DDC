import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' ? 'http://localhost:8005' : 'http://192.168.0.2:8005');

export interface KeyPoint {
  id: number;
  label: string;
  x: number;
  y: number;
}

export interface AnalisisApiResponse {
  angulo_izquierda: number;
  angulo_derecha: number;
  diagnostico_izquierda: 'NORMAL' | 'LIMITROFE' | 'DISPLASIA';
  diagnostico_derecha: 'NORMAL' | 'LIMITROFE' | 'DISPLASIA';
  imagen_anotada_base64: string;
  puntos_clave: KeyPoint[];
}

export async function analizarRadiografiaApi(imageUri: string): Promise<AnalisisApiResponse> {
  const formData = new FormData();
  
  if (Platform.OS === 'web') {
    const res = await fetch(imageUri);
    const blob = await res.blob();
    formData.append('file', blob, 'radiografia.jpg');
  } else {
    formData.append('file', {
      uri: imageUri,
      name: 'radiografia.jpg',
      type: 'image/jpeg',
    } as any);
  }

  try {
    console.log(`Pidiendo análisis a: ${API_URL}/analyze`);
    const response = await fetch(`${API_URL}/analyze`, {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let niceError = errorText;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.detail) niceError = parsed.detail;
      } catch (e) {}
      console.log('SERVER ERROR LOG:', niceError);
      throw new Error(niceError);
    }

    return await response.json();
  } catch (error: any) {
    console.log('FETCH ERROR DETAILS:', error.message || error);
    throw error;
  }
}

export async function recalculateRadiografiaApi(imageUri: string, puntos: KeyPoint[]): Promise<AnalisisApiResponse> {
  const formData = new FormData();
  
  if (Platform.OS === 'web') {
    const res = await fetch(imageUri);
    const blob = await res.blob();
    formData.append('file', blob, 'radiografia.jpg');
  } else {
    formData.append('file', {
      uri: imageUri,
      name: 'radiografia.jpg',
      type: 'image/jpeg',
    } as any);
  }

  formData.append('puntos_json', JSON.stringify(puntos));

  try {
    const response = await fetch(`${API_URL}/recalculate`, {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let niceError = errorText;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.detail) niceError = parsed.detail;
      } catch (e) {}
      throw new Error(niceError);
    }

    return await response.json();
  } catch (error: any) {
    throw error;
  }
}

