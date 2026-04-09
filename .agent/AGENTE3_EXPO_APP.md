---
description: TAREA ESPECÍFICA PARA EL AGENTE 3 – Construir la App Expo (React Native + TypeScript) del proyecto DDC Pasitos Firmes
---

# ⚠️ ESPERA — Lee antes de hacer cualquier cosa

Tu misión como **Agente 3** es SOLO construir la app Expo.
- **NO toques** la carpeta `MTDDH/` (modelo de IA - ya está terminado)
- **NO toques** la carpeta `backend/` (la está haciendo el Agente 1)
- Sí necesitas que el **Agente 2 haya terminado** primero (para tener el `.env` de Supabase)
- Si el `.env` no existe todavía, crea los archivos de código pero deja las variables vacías y documenta dónde completarlas

**Tu carpeta de trabajo es:** `/home/angel/Documentos/Universidad/integrador/app/`

---

# Tu misión
Construir la aplicación universal (iOS + Android + Web) con Expo que permita:
- Login con roles diferenciados (Médico / Padre / Admin)
- **Médico**: subir radiografías, ver análisis de la IA, gestionar pacientes
- **Padre**: ver el progreso de su hijo, guías de ejercicios, recordatorios

---

# Paso 1: Crear el proyecto Expo
```bash
cd /home/angel/Documentos/Universidad/integrador/app
npx create-expo-app@latest . --template blank-typescript
```

---

# Paso 2: Instalar dependencias
```bash
cd /home/angel/Documentos/Universidad/integrador/app
npx expo install expo-router expo-camera expo-image-picker expo-file-system
npx expo install @supabase/supabase-js react-native-url-polyfill
npx expo install @react-native-async-storage/async-storage
npx expo install react-native-safe-area-context react-native-screens
npm install react-native-chart-kit react-native-svg
```

---

# Paso 3: Crear la estructura de carpetas

```
src/
├── lib/
│   └── supabase.ts
├── types/
│   └── index.ts
├── services/
│   ├── auth.service.ts
│   ├── analisis.service.ts
│   └── paciente.service.ts
└── components/
    ├── AngleCard.tsx
    ├── RxUploader.tsx
    └── PatientCard.tsx

app/
├── _layout.tsx
├── (auth)/
│   └── login.tsx
├── (medico)/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── analyzer.tsx
│   └── historial.tsx
└── (padre)/
    ├── _layout.tsx
    ├── index.tsx
    └── ejercicios.tsx
```

---

# Paso 4: Crear `src/lib/supabase.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

---

# Paso 5: Crear `src/types/index.ts`

```typescript
export type Rol = 'admin' | 'medico' | 'padre';
export type Diagnostico = 'NORMAL' | 'LIMITROFE' | 'DISPLASIA';

export interface Profile {
  id: string;
  rol: Rol;
  nombre_completo: string;
  telefono?: string;
  matricula_profesional?: string;
  matricula_validada: boolean;
}

export interface Paciente {
  id: string;
  nombre_completo: string;
  fecha_nacimiento: string;
  sexo: 'M' | 'F';
  medico_id: string;
  padre_id?: string;
}

export interface Analisis {
  id: string;
  paciente_id: string;
  angulo_izquierda: number;
  angulo_derecha: number;
  diagnostico_izquierda: Diagnostico;
  diagnostico_derecha: Diagnostico;
  imagen_original_url?: string;
  imagen_anotada_url?: string;
  observaciones_medico?: string;
  created_at: string;
}

export interface AnalisisApiResponse {
  angulo_izquierda: number;
  angulo_derecha: number;
  diagnostico_izquierda: Diagnostico;
  diagnostico_derecha: Diagnostico;
  imagen_anotada_base64: string;
}
```

---

# Paso 6: Crear `src/services/analisis.service.ts`

```typescript
import { supabase } from '../lib/supabase';
import type { AnalisisApiResponse } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export async function analizarRadiografia(
  imageUri: string,
  pacienteId: string
): Promise<AnalisisApiResponse> {
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    name: 'radiografia.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);

  const response = await fetch(`${API_URL}/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) throw new Error('Error en el servidor de análisis IA');
  const resultado: AnalisisApiResponse = await response.json();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  await supabase.from('analisis').insert({
    paciente_id: pacienteId,
    medico_id: user.id,
    angulo_izquierda: resultado.angulo_izquierda,
    angulo_derecha: resultado.angulo_derecha,
    diagnostico_izquierda: resultado.diagnostico_izquierda,
    diagnostico_derecha: resultado.diagnostico_derecha,
  });

  return resultado;
}
```

---

# Paso 7: Diseño (Colores y Estilo)
El diseño de la app debe seguir esta paleta de colores:

```typescript
// Paleta principal DDC Pasitos Firmes
export const COLORS = {
  primary: '#1E3A5F',       // Azul médico oscuro
  secondary: '#4A90D9',     // Azul claro
  accent: '#F5A623',        // Naranja cálido
  success: '#27AE60',       // Verde NORMAL
  warning: '#F39C12',       // Amarillo LIMÍTROFE
  danger: '#E74C3C',        // Rojo DISPLASIA
  background: '#F8F9FA',
  surface: '#FFFFFF',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
};
```

---

# Paso 8: Pantallas a implementar (en este orden)

### 8.1 Login (`app/(auth)/login.tsx`)
- Logo del proyecto arriba (usar texto "DDC Pasitos Firmes" con color primario)
- Input email + contraseña
- Botón "Ingresar" que llame `supabase.auth.signInWithPassword()`
- Al autenticar leer `profiles.rol` y redirigir con `router.replace()`

### 8.2 Analyzer (`app/(medico)/analyzer.tsx`)
- Botón "Seleccionar Radiografía" con `expo-image-picker`
- Preview de la imagen elegida
- Botón "Analizar con IA" (activo solo si hay imagen)
- Loading state durante el análisis
- Resultado: mostrar imagen anotada + 2 cards (una por cadera) con ángulo y diagnóstico en color

### 8.3 Dashboard del Padre (`app/(padre)/index.tsx`)
- Card con nombre del bebé y edad
- Gráfica de evolución de ángulos con `react-native-chart-kit`
- Lista de últimos 3 análisis
- Recordatorios próximos

---

# ✅ Checklist de entrega
- [ ] Proyecto `create-expo-app` inicializado en `/app/`
- [ ] Dependencias instaladas
- [ ] Estructura de carpetas creada
- [ ] `supabase.ts` y `types/index.ts` listos
- [ ] `analisis.service.ts` listo
- [ ] Login funcional
- [ ] Pantalla Analyzer funcional (imagen → IA → resultado en pantalla)
- [ ] Dashboard del Padre con gráfica básica
- [ ] App corriendo en celular con `npx expo start` + Expo Go

## Cuando termines, actualiza el SKILL.md
Cambia la línea:
`- [ ] App Expo: pantallas de login, médico, padre`
por:
`- [x] App Expo: pantallas de login, médico, padre ✅`

---

# 🛑 ALERTA DE DEBUGGING (De: Agente 1 - Backend)
**Agente 3**, el usuario está teniendo un problema en la conexión Frontend-Backend.

**Contexto:**
1. El backend (FastAPI) de IA ya está levantado y operativo en `0.0.0.0:8000`. Probé mi endpoint `/analyze` con POST y processa correctamente las radiografías con YOLOv8.
2. Yo (Agente 1) modifiqué tu archivo `src/services/analisis.service.ts` para que apunte dinámicamente:
   - `http://192.168.0.8:8000` (IP de la red local) para dispositivos móviles.
   - `http://localhost:8000` (para la versión Web, previniendo errores de ruteo WSL en navegadores Windows).
3. Añadí conversión a `Blob` para Web en `FormData`, porque React Native Web crashea si envías `{ uri: ... }` directo.

**El Problema Actual:**
A pesar de mis ajustes de CORS en FastAPI (`allow_origins=["*"]`, `allow_credentials=False`), cuando el usuario hace la petición `fetch` desde la aplicación Expo, la consola marca:
`TypeError: Failed to fetch at analizarRadiografiaApi`

**Tu Tarea (Agente 3):**
Por favor asume el control del Frontend y soluciona el `Failed to fetch`. Verifica si:
- ¿`expo-image-picker` está generando una URI válida para `FormData` en Web/Móvil?
- ¿Falta un header como `Content-Type: multipart/form-data` explícito, o por el contrario, debe dejarse en blanco para que el navegador asigne el 'boundary' automáticamente?
- ¿El usuario necesita levantar un proxy en `app.json` para esquivar el CORS de WSL a Windows?
- ¿Hay algún problema en cómo `AnalisisScreen.tsx` resuelve el estado de carga?

**¡Revisa el código y haz que la carga de la imagen llegue exitosamente al servidor del puerto 8000!**

---

# 🛠️ NUEVA TAREA AÑADIDA: Sistema de "Ajuste Manual de Puntos"
**Agente 3**, el paciente solicitó una interfaz profesional donde el médico pueda arrastrar (drag-and-drop) los puntos detectados para corregirlos, y pedirle al servidor que re-calcule los ángulos.

**Lo que ya implementé en el Backend (FastAPI):**
1. Modifiqué la respuesta de `/analyze`. Ahora retorna un campo adicional: `puntos_clave`. Cada punto tiene `{id, label, x, y}`.
   - IDs de los puntos: `0` (Techo Der), `1` (Cartílago Der), `4` (Techo Izq), `5` (Cartílago Izq).
2. Creé un **NUEVO ENDPOINT** llamado `POST /recalculate` en el puerto 8000.
3. Este nuevo endpoint toma:
   - `file`: La misma imagen original (vía `FormData`).
   - `puntos_json`: Un JSON stringificado (literal `JSON.stringify()`) con el array modificado de los puntos `[{id, x, y, label}, ...]`.
4. El backend devolverá el mismo formato `AnalysisResult` (la imagen actualizada, los nuevos ángulos y diagnóstico).

**Tu tarea (Agente 3) en el Frontend:**
1. En la pantalla de `AnalisisScreen.tsx`, cuando el usuario presione "Ajustar Puntos Manualmente", en lugar del *Alert* de "Próximamente", debes abrir un Modal o cambiar la vista.
2. Muestra la imagen (usando `imagen_original_base64` o la `imageUri` original) y renderiza 4 "bolitas" arrastrables (`PanResponder` o librería de drag) sobre la imagen basándote en las posiciones `x` y `y` de `puntos_clave`. ¡Ojo con el escalado de la imagen real vs la pantalla del celular!
3. Cuando el médico termine de moverlas y presione "Recalcular":
   - Ejecuta un `FormData.append('puntos_json', JSON.stringify(puntosMovidos))`.
   - Adjunta de nuevo la imagen al `FormData` (con Blob o URI según plataforma, igual que en analyze).
   - Haz un fetch `POST` a `/recalculate`.
   - Usa la respuesta para actualizar la pantalla con las nuevas líneas trazadas y los nuevos ángulos en las *AngleCards*.

¡Queda en tus manos hacer la implementación en React Native! Te dejo la cancha libre.
