// Tipos del dominio médico DDC
export type UserRole = 'medico' | 'padre' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatarUrl?: string;
}

export interface Paciente {
  id: string;
  codigoPaciente: string;  // P-RXXX
  nombreCompleto: string;
  fechaNacimiento: string;
  sexo: 'M' | 'F';
  edadGestacional?: number;
  nombreTutor: string;
  telefonoContacto: string;
  // Antecedentes
  presentacionNalgas: boolean;
  antecedenteFamiliar: boolean;
  // Metadata
  doctorId: string;
  creadoEn: string;
  ultimaRevision?: string;
  proximaRevision?: string;
  estadoGraf?: EstadoGraf;
  tratamientosAsignados?: string[];
}

export type EstadoGraf = 'GRAF_I' | 'GRAF_IIA' | 'GRAF_IIB' | 'GRAF_IIB_URGENTE' | 'GRAF_III' | 'GRAF_IV';

export interface Analisis {
  id: string;
  pacienteId: string;
  scanId: string;        // SCAN_ID: BBZ-FX format
  anguloIzq: number;
  anguloDer: number;
  diagnosticoIzq: DiagnosticoCategoria;
  diagnosticoDer: DiagnosticoCategoria;
  categoriaGraf: EstadoGraf;
  imagenAnotadaUrl?: string;
  imagenOriginalUrl?: string;
  validadoPorDoctor: boolean;
  notas?: string;
  medicoId: string;
  creadoEn: string;
  fechaRadiografia?: string;
}

export type DiagnosticoCategoria = 'NORMAL' | 'LIMITROFE' | 'DISPLASIA';

export interface ApiAnalysisResponse {
  status: 'ok' | 'error';
  data: {
    angulo_izq: number;
    angulo_der: number;
    dx_izq: DiagnosticoCategoria;
    dx_der: DiagnosticoCategoria;
    categoria_graf: EstadoGraf;
    imagen_anotada_base64: string;
    scan_id: string;
  };
}

export interface PrescripcionMedica {
  id: string;
  pacienteId: string;
  medicoId: string;
  diagnosticoResumen: string;
  tratamientos: string[];
  indicaciones?: string;
  proximaRevision?: string;
  analisisId?: string;
  creadoEn: string;
}

export interface TabParam {
  screen: string;
  pacienteId?: string;
  analisisId?: string;
}


// El archivo de tipos ahora es puramente declarativo. 
// La lógica de colores y labels se movió a constants/clinical.ts

export interface RehabilitacionSesion {
  id: string;
  paciente_id: string;
  padre_id: string;
  ejercicio_tipo: string;
  duracion_real_segundos: number;
  duracion_planificada_segundos: number;
  completado: boolean;
  created_at: string;
  observaciones?: string;
}
