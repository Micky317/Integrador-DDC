-- =============================================
-- DDC PASITOS FIRMES - SETUP COMPLETO SUPABASE v1.0
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =============================================

-- =============================================
-- PASO 1: TABLAS DEL DOMINIO MÉDICO
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

CREATE TABLE vinculos_padres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  padre_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(padre_id, paciente_id)
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

-- =============================================
-- PASO 2: ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE analisis ENABLE ROW LEVEL SECURITY;
ALTER TABLE ejercicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE recordatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE vinculos_padres ENABLE ROW LEVEL SECURITY;

-- Perfil: cada usuario solo ve el suyo, o el administrador ve todo
CREATE POLICY "usuarios_ven_su_perfil" ON profiles
  FOR ALL USING (id = auth.uid() OR (auth.jwt() -> 'user_metadata' ->> 'rol') = 'admin');

-- Médicos solo ven sus propios pacientes, administrador ve todos
CREATE POLICY "medicos_ven_sus_pacientes" ON pacientes
  FOR ALL USING (medico_id = auth.uid() OR (auth.jwt() -> 'user_metadata' ->> 'rol') = 'admin');

-- Padres solo ven a sus propios hijos vinculados
CREATE POLICY "padres_ven_sus_hijos" ON pacientes
  FOR SELECT USING (
    id IN (
      SELECT paciente_id 
      FROM vinculos_padres 
      WHERE padre_id = auth.uid()
    )
  );

-- Políticas para vinculos_padres
CREATE POLICY "padres_ven_sus_vinculos" ON vinculos_padres
  FOR SELECT USING (padre_id = auth.uid());

CREATE POLICY "padres_insertan_vinculos" ON vinculos_padres
  FOR INSERT WITH CHECK (padre_id = auth.uid());

-- Médicos ven y gestionan solo sus análisis, administrador ve todos
CREATE POLICY "medicos_ven_sus_analisis" ON analisis
  FOR ALL USING (medico_id = auth.uid() OR (auth.jwt() -> 'user_metadata' ->> 'rol') = 'admin');

-- Padres pueden ver los análisis de sus hijos
CREATE POLICY "padres_ven_analisis_hijos" ON analisis
  FOR SELECT USING (
    paciente_id IN (
      SELECT paciente_id 
      FROM vinculos_padres 
      WHERE padre_id = auth.uid()
    )
  );

-- Todos los usuarios autenticados pueden leer ejercicios
CREATE POLICY "todos_leen_ejercicios" ON ejercicios
  FOR SELECT USING (auth.role() = 'authenticated');

-- Padres ven y gestionan sus propios recordatorios
CREATE POLICY "padres_gestionan_recordatorios" ON recordatorios
  FOR ALL USING (padre_id = auth.uid() OR (auth.jwt() -> 'user_metadata' ->> 'rol') = 'admin');

-- =============================================
-- PASO 2.5: TABLA PRESCRIPCIONES MÉDICAS
-- Documento clínico formal que el médico emite por paciente
-- =============================================

CREATE TABLE prescripciones_medicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE NOT NULL,
  medico_id UUID REFERENCES profiles(id) NOT NULL,
  diagnostico_resumen TEXT NOT NULL,
  tratamientos TEXT[] DEFAULT '{}',
  indicaciones TEXT,
  proxima_revision DATE,
  analisis_id UUID REFERENCES analisis(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prescripciones_medicas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medicos_gestionan_prescripciones" ON prescripciones_medicas
  FOR ALL USING (medico_id = auth.uid());

CREATE POLICY "padres_ven_prescripciones_hijos" ON prescripciones_medicas
  FOR SELECT USING (
    paciente_id IN (
      SELECT paciente_id 
      FROM vinculos_padres 
      WHERE padre_id = auth.uid()
    )
  );

-- =============================================
-- PASO 3: STORAGE - Bucket radiografias
-- (Primero crear el bucket manualmente en Dashboard → Storage → New Bucket)
-- Nombre: "radiografias", Tipo: Private
-- Luego ejecutar estas policies:
-- =============================================

CREATE POLICY "usuarios_auth_suben_rx"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'radiografias');

CREATE POLICY "usuarios_auth_leen_rx"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'radiografias');

-- =============================================
-- PASO 4: TRIGGER - Auto-crear perfil al registrarse
-- =============================================

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

-- =============================================
-- VERIFICACIÓN FINAL
-- Ejecuta esto al final para confirmar que todo se creó bien:
-- =============================================
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
