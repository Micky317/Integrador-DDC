---
description: TAREA ESPECÍFICA PARA EL AGENTE 2 – Configurar Supabase (Base de datos, Auth y Storage del proyecto DDC Pasitos Firmes)
---

# ⚠️ ESPERA — Lee antes de hacer cualquier cosa

Tu misión como **Agente 2** es SOLO configurar Supabase.
- **NO toques** la carpeta `MTDDH/` (modelo de IA - ya está terminado)
- **NO toques** la carpeta `backend/` (la está haciendo el Agente 1)
- **NO toques** la carpeta `app/` (la está haciendo el Agente 3)
- Tu trabajo es solo ejecutar SQL en Supabase y crear los archivos `.env`

---

# Tu misión
Crear toda la infraestructura de base de datos en Supabase:
- 5 tablas del dominio médico
- Roles y autenticación (Auth)
- Row Level Security (RLS)
- Bucket de almacenamiento para radiografías

---

# Paso 1: Crear Proyecto en Supabase
1. Ve a https://supabase.com e inicia sesión (o crea cuenta gratuita)
2. Crea un nuevo proyecto con nombre: `ddc-pasitos-firmes`
3. Espera a que el proyecto se inicialice (~2 min)
4. Ve a **Settings > API** y guarda:
   - **Project URL**: `https://xxxx.supabase.co`
   - **anon/public key**
   - **service_role key** (¡secreta! solo backend)

---

# Paso 2: Crear las Tablas (SQL Editor de Supabase)
Ve a **SQL Editor** en el dashboard y ejecuta este bloque completo:

```sql
-- =============================================
-- DDC PASITOS FIRMES - SCHEMA COMPLETO v1.0
-- =============================================

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'medico', 'padre')),
  nombre_completo TEXT NOT NULL,
  telefono TEXT,
  matricula_profesional TEXT,
  matricula_validada BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo TEXT NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  sexo TEXT CHECK (sexo IN ('M', 'F')),
  medico_id UUID REFERENCES profiles(id) NOT NULL,
  padre_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE analisis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID REFERENCES pacientes(id) NOT NULL,
  medico_id UUID REFERENCES profiles(id) NOT NULL,
  angulo_izquierda DECIMAL(5,2),
  angulo_derecha DECIMAL(5,2),
  diagnostico_izquierda TEXT CHECK (diagnostico_izquierda IN ('NORMAL', 'LIMITROFE', 'DISPLASIA')),
  diagnostico_derecha TEXT CHECK (diagnostico_derecha IN ('NORMAL', 'LIMITROFE', 'DISPLASIA')),
  imagen_original_url TEXT,
  imagen_anotada_url TEXT,
  observaciones_medico TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ejercicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  video_url TEXT,
  imagen_url TEXT,
  categoria TEXT
);

CREATE TABLE recordatorios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  padre_id UUID REFERENCES profiles(id) NOT NULL,
  paciente_id UUID REFERENCES pacientes(id) NOT NULL,
  tipo TEXT CHECK (tipo IN ('cita', 'ejercicio', 'arnes')),
  mensaje TEXT NOT NULL,
  fecha_programada TIMESTAMPTZ NOT NULL,
  completado BOOLEAN DEFAULT FALSE
);
```

---

# Paso 3: Row Level Security (RLS)
En el mismo **SQL Editor**, ejecuta:

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE analisis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordatorios ENABLE ROW LEVEL SECURITY;

-- Médicos solo ven sus propios pacientes
CREATE POLICY "medicos_ven_sus_pacientes" ON pacientes
  FOR ALL USING (medico_id = auth.uid());

-- Padres solo ven a sus propios hijos
CREATE POLICY "padres_ven_sus_hijos" ON pacientes
  FOR SELECT USING (padre_id = auth.uid());

-- Médicos ven solo sus análisis
CREATE POLICY "medicos_ven_sus_analisis" ON analisis
  FOR ALL USING (medico_id = auth.uid());

-- Padres pueden ver los análisis de sus hijos
CREATE POLICY "padres_ven_analisis_hijos" ON analisis
  FOR SELECT USING (
    paciente_id IN (SELECT id FROM pacientes WHERE padre_id = auth.uid())
  );

-- Todos los usuarios autenticados pueden leer ejercicios
CREATE POLICY "todos_leen_ejercicios" ON ejercicios
  FOR SELECT USING (auth.role() = 'authenticated');
```

---

# Paso 4: Bucket de Storage para Radiografías
En el dashboard: **Storage > New Bucket**
- Nombre: `radiografias`
- Tipo: **Private**

Luego en SQL Editor:
```sql
CREATE POLICY "usuarios_auth_suben_rx"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'radiografias');

CREATE POLICY "usuarios_auth_leen_rx"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'radiografias');
```

---

# Paso 5: Crear el Trigger de profiles automático
Cuando alguien se registra en Auth, su perfil debe crearse automático:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, rol, nombre_completo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'rol', 'padre'),
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', 'Usuario')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

# Paso 6: Crear los archivos .env del proyecto

Crea el archivo `/home/angel/Documentos/Universidad/integrador/backend/.env`:
```
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_KEY=TU_SERVICE_ROLE_KEY
MODEL_PATH=/home/angel/Documentos/Universidad/integrador/MTDDH/runs/pose/ddh_pose_model/weights/best.pt
```

Crea el archivo `/home/angel/Documentos/Universidad/integrador/app/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
EXPO_PUBLIC_API_URL=http://TU_IP_LOCAL:8000
```
(Para saber tu IP local, corre: `ip addr | grep "inet " | grep -v 127`)

---

# ✅ Checklist de entrega — Marca cada uno antes de terminar
- [ ] Proyecto Supabase creado y activo
- [ ] 5 tablas creadas exitosamente (verificar en Table Editor)
- [ ] RLS habilitado en las 5 tablas
- [ ] Políticas de seguridad aplicadas
- [ ] Bucket `radiografias` creado
- [ ] Trigger `on_auth_user_created` creado
- [ ] Archivo `/backend/.env` creado con credenciales reales
- [ ] Archivo `/app/.env` creado con credenciales reales

## Cuando termines, actualiza el SKILL.md
Cambia la línea:
`- [ ] Supabase: tablas y roles`
por:
`- [x] Supabase: tablas y roles ✅`
