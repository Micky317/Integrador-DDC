---
description: Cómo crear y levantar la app Expo (React Native) del proyecto DDC Pasitos Firmes
---

## Requisitos previos
- Node.js >= 18 instalado
- Expo Go instalado en el celular del usuario
- Backend FastAPI corriendo (ver workflow backend-fastapi)
- Credenciales de Supabase disponibles

## Pasos

// turbo
1. Crear el proyecto Expo dentro de /app:
```bash
cd /home/angel/Documentos/Universidad/integrador/app
npx create-expo-app@latest . --template blank-typescript
```

2. Instalar dependencias principales del proyecto:
```bash
cd /home/angel/Documentos/Universidad/integrador/app
npx expo install expo-router expo-camera expo-image-picker @supabase/supabase-js react-native-url-polyfill
```

3. Configurar el archivo `.env` en `/app/.env` con las variables de entorno de Supabase y la URL del backend

// turbo
4. Levantar el servidor de desarrollo de Expo:
```bash
cd /home/angel/Documentos/Universidad/integrador/app
npx expo start
```

5. Escanear el QR con la app Expo Go en el celular para probar en el dispositivo

## Estructura de carpetas del App (src/)
```
app/
├── src/
│   ├── screens/        ← Pantallas: Login, Home, Analyzer, History
│   ├── components/     ← Componentes reutilizables
│   ├── services/       ← Llamadas a la API y Supabase
│   ├── types/          ← Interfaces TypeScript del dominio médico
│   └── lib/
│       └── supabase.ts ← Inicialización del cliente Supabase
└── app/                ← Expo Router (rutas de navegación)
```
