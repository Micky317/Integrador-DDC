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
  creadoEn: string;
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

export interface TabParam {
  screen: string;
  pacienteId?: string;
  analisisId?: string;
}

// Util: color por diagnóstico
export const colorPorDiagnostico = (dx: DiagnosticoCategoria): string => {
  switch (dx) {
    case 'NORMAL': return '#00C48C';
    case 'LIMITROFE': return '#FFB400';
    case 'DISPLASIA': return '#FF4757';
  }
};

export const colorPorGraf = (graf: EstadoGraf): string => {
  if (graf === 'GRAF_I') return '#00C48C';
  if (graf === 'GRAF_IIA') return '#4D6EE3';
  if (graf === 'GRAF_IIB') return '#FFB400';
  if (graf === 'GRAF_IIB_URGENTE') return '#FF4757';
  if (graf === 'GRAF_III') return '#FF4757';
  if (graf === 'GRAF_IV') return '#FF4757';
  return '#8892B0';
};

export const labelGraf = (graf: EstadoGraf): string => {
  const labels: Record<EstadoGraf, string> = {
    GRAF_I: 'Graf I - NORMAL',
    GRAF_IIA: 'Graf IIa - EN OBSERVACIÓN',
    GRAF_IIB: 'Graf IIb - EN SEGUIMIENTO',
    GRAF_IIB_URGENTE: 'Graf IIb - REVISIÓN URGENTE',
    GRAF_III: 'Graf III - DISPLASIA',
    GRAF_IV: 'Graf IV - DISPLASIA SEVERA',
  };
  return labels[graf];
};

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
