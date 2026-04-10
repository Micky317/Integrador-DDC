# 🚀 Guía de Preparación para la Presentación (DDC Pasitos Firmes)

Sigue estos pasos mañana antes de mostrarle el proyecto a tu docente para asegurar que el celular y la computadora se conecten correctamente.

---

## 1. Obtener tu nueva IP Local 📋
Al conectarte a la red de la universidad, tu computadora tendrá una IP distinta.
1. Abre una terminal y escribe:
   ```bash
   ip addr show | grep "inet "
   ```
2. Busca la que empieza por `192.168.x.x` o `10.x.x.x`. (Ignora la que dice `127.0.0.1`).
   *Ejemplo: `192.168.1.15`*

---

## 2. Actualizar la App (Frontend) 📱
1. Ve al archivo: `app/.env`
2. Cambia la línea de la IP por tu nueva IP:
   ```env
   EXPO_PUBLIC_API_URL=http://TUP_IP_NUEVA:8000
   ```
3. Reinicia el servidor de Expo (si estaba abierto):
   ```bash
   npx expo start -c
   ```
   *(La `-c` es para limpiar la caché y que agarre la nueva IP).*

---

## 3. Levantar el Backend de IA 🤖
Asegúrate de que el servidor FastAPI escuche en todas las interfaces de red para que el celular lo vea.
1. Entra a la carpeta del backend.
2. Ejecuta el servidor forzando el host `0.0.0.0`:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```
   *(Si usas el script de python directamente, asegúrate de que diga `host="0.0.0.0"` en el `uv.run` o `app.run`).*

---

## 4. Configurar el Firewall (Si es necesario) 🛡️
Si el celular no conecta (sale "Network Error"), abre los puertos en tu Linux:
```bash
# Permite el tráfico del backend
sudo ufw allow 8000/tcp

# Permite el tráfico de Expo
sudo ufw allow 8081/tcp

# Verifica el estado
sudo ufw status
```

---

## 5. Lista de Verificación Final (Checklist) ✅
- [ ] Tu laptop y tu celular están en la **misma red Wi-Fi**.
- [ ] El backend está corriendo y dice: `Application startup complete`.
- [ ] Has escaneado el QR de Expo con la app **Expo Go** en el celular.
- [ ] Al subir una foto, la terminal del backend muestra: `POST /analyze`.

**¡Mucho éxito en tu presentación mañana! Todo va a salir excelente. 👶🩺🦾**
