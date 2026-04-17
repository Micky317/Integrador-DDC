#!/bin/bash

# =================================================================
# 🚀 DDC PASITOS FIRMES - SCRIPT DE INICIO AUTOMÁTICO
# =================================================================

# 1. Detectar IP Local (Priorizando redes Wi-Fi / Ethernet reales)
IP_LOCAL=$(ip addr show | grep "inet " | grep -v "127.0.0.1" | grep -v "docker" | grep -v "virbr" | grep -v "vmnet" | head -n 1 | awk '{print $2}' | cut -d/ -f1)

if [ -z "$IP_LOCAL" ]; then
    echo "❌ ERROR: No se pudo detectar una IP local activa."
    exit 1
fi

echo "🌐 IP Detectada: $IP_LOCAL"

# 2. Actualizar el archivo .env de la App automáticamente
ENV_PATH="./app/.env"
if [ -f "$ENV_PATH" ]; then
    # Usamos sed para reemplazar las líneas de IP manteniendo el resto intacto
    sed -i "s|EXPO_PUBLIC_API_URL=.*|EXPO_PUBLIC_API_URL=http://$IP_LOCAL:8000|g" "$ENV_PATH"
    sed -i "s|REACT_NATIVE_PACKAGER_HOSTNAME=.*|REACT_NATIVE_PACKAGER_HOSTNAME=$IP_LOCAL|g" "$ENV_PATH"
    echo "✅ Archivo .env actualizado con la IP actual."
else
    echo "⚠️ ADVERTENCIA: No se encontró app/.env. Creando uno básico..."
    echo "EXPO_PUBLIC_API_URL=http://$IP_LOCAL:8000" > "$ENV_PATH"
fi

# 3. Configurar Firewall (Solo si es necesario)
echo "🛡️ Verificando Firewall..."
FIREWALL_8000=$(sudo ufw status | grep "8000/tcp" | grep "ALLOW")
FIREWALL_8081=$(sudo ufw status | grep "8081/tcp" | grep "ALLOW")

if [ -z "$FIREWALL_8000" ] || [ -z "$FIREWALL_8081" ]; then
    echo "🔐 Abriendo puertos necesarios (8000, 8081)..."
    sudo ufw allow 8000/tcp
    sudo ufw allow 8081/tcp
else
    echo "✅ Los puertos ya están abiertos en el firewall."
fi

# 4. Lanzar Terminales (Detección de emulador)
echo "📂 Lanzando terminales de trabajo..."

COMMAND_BACK="cd backend && ./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000"
COMMAND_FRONT="cd app && npx expo start -c"

if [ -x "$(command -v konsole)" ]; then
    konsole --new-tab -p tabtitle="DDH BACKEND" -e bash -c "$COMMAND_BACK; exec bash" &
    konsole --new-tab -p tabtitle="DDH FRONTEND" -e bash -c "$COMMAND_FRONT; exec bash" &
elif [ -x "$(command -v alacritty)" ]; then
    alacritty -T "DDH BACKEND" -e bash -c "$COMMAND_BACK; exec bash" &
    alacritty -T "DDH FRONTEND" -e bash -c "$COMMAND_FRONT; exec bash" &
else
    echo "⚠️ No se encontró Konsole ni Alacritty. Iniciando en segundo plano..."
    $COMMAND_BACK > backend.log 2>&1 &
    $COMMAND_FRONT &
fi

echo "✨ ¡TODO LISTO! El sistema está arrancando en ventanas separadas."
echo "Scanéalo en tu celular y ¡mucha suerte en la demo! 🦾"
