#!/bin/bash

# =================================================================
# 🚀 DDC PASITOS FIRMES - SCRIPT DE INICIO TOTAL
# =================================================================

# 1. Detectar IP Local (Priorizando redes Wi-Fi / Ethernet reales)
IP_LOCAL=$(ip addr show | grep "inet " | grep -v "127.0.0.1" | grep -v "docker" | grep -v "virbr" | grep -v "vmnet" | head -n 1 | awk '{print $2}' | cut -d/ -f1)

if [ -z "$IP_LOCAL" ]; then
    echo "❌ ERROR: No se pudo detectar una IP local activa."
    exit 1
fi

echo "🌐 IP Detectada: $IP_LOCAL"

# 2. Levantar Servicios de Analítica (Docker)
echo "🐳 Iniciando InfluxDB y Grafana..."
docker compose up -d

# 2.1 Sincronizar datos históricos de Supabase a InfluxDB
echo "🔄 Sincronizando datos históricos de Supabase a InfluxDB..."
sleep 3
./MTDDH/venv/bin/python backend/sync_supabase_to_influx.py

# 3. Actualizar el archivo .env de la App automáticamente
ENV_PATH="./app/.env"
if [ -f "$ENV_PATH" ]; then
    sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=http://$IP_LOCAL:8005|g" "$ENV_PATH"
    sed -i "s|REACT_NATIVE_PACKAGER_HOSTNAME=.*|REACT_NATIVE_PACKAGER_HOSTNAME=$IP_LOCAL|g" "$ENV_PATH"
    echo "✅ Archivo .env de la App actualizado."
else
    echo "EXPO_PUBLIC_API_URL=http://$IP_LOCAL:8005" > "$ENV_PATH"
fi

# 4. Configurar Firewall
echo "🛡️ Verificando Firewall..."
sudo ufw allow 8005/tcp > /dev/null
sudo ufw allow 8081/tcp > /dev/null
sudo ufw allow 3000/tcp > /dev/null # Puerto de la Web
sudo ufw allow 3001/tcp > /dev/null # Puerto de Grafana

# 5. Lanzar Terminales
echo "📂 Lanzando terminales de trabajo..."

COMMAND_BACK="cd backend && ../MTDDH/venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8005"
COMMAND_APP="cd app && npx expo start -c"
COMMAND_WEB="cd dashboard-web && npx vite --port 3000 --host"

if [ -x "$(command -v konsole)" ]; then
    konsole --new-tab -p tabtitle="🚀 BACKEND" -e bash -c "$COMMAND_BACK; exec bash" &
    konsole --new-tab -p tabtitle="📱 APP MOVIL" -e bash -c "$COMMAND_APP; exec bash" &
    konsole --new-tab -p tabtitle="💻 PORTAL WEB" -e bash -c "$COMMAND_WEB; exec bash" &
elif [ -x "$(command -v alacritty)" ]; then
    alacritty -T "🚀 BACKEND" -e bash -c "$COMMAND_BACK; exec bash" &
    alacritty -T "📱 APP MOVIL" -e bash -c "$COMMAND_APP; exec bash" &
    alacritty -T "💻 PORTAL WEB" -e bash -c "$COMMAND_WEB; exec bash" &
else
    echo "⚠️ Iniciando en segundo plano (No se detectó terminal gráfico)..."
    $COMMAND_BACK > backend.log 2>&1 &
    $COMMAND_WEB > web.log 2>&1 &
    $COMMAND_APP &
fi

echo "✨ ¡TODO LISTO!"
echo "-------------------------------------------------------"
echo "📱 App Móvil (Expo):  http://$IP_LOCAL:8081"
echo "💻 Portal Médico:     http://$IP_LOCAL:3000"
echo "📊 Grafana:           http://$IP_LOCAL:3001"
echo "🚀 Backend API:       http://$IP_LOCAL:8005"
echo "-------------------------------------------------------"
echo "¡Mucha suerte con el Dr. Angel! 🦾👶✨⚖️"
