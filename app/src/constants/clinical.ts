import { Colors } from './theme';
import { DiagnosticoCategoria, EstadoGraf } from '../types';

export const CLINICAL_THRESHOLDS = {
  NORMAL_MAX: 30,
  LIMITROFE_MAX: 35,
};

export const DIAGNOSTICO_CONFIG: Record<DiagnosticoCategoria, { label: string, color: string, description: string }> = {
  NORMAL: {
    label: 'Normal',
    color: Colors.statusNormal,
    description: 'Desarrollo adecuado de la cadera.'
  },
  LIMITROFE: {
    label: 'Limítrofe',
    color: Colors.statusWarning,
    description: 'Requiere seguimiento preventivo.'
  },
  DISPLASIA: {
    label: 'Displasia',
    color: Colors.statusDanger,
    description: 'Presencia de displasia acetabular.'
  }
};

export const VIDEO_ESTADOS = {
  PENDIENTE: { label: 'Pendiente de video', color: Colors.textSecondary, icon: 'videocam-outline' },
  EN_REVISION: { label: 'En revisión', color: Colors.statusWarning, icon: 'time' },
  VALIDADO: { label: 'Técnica Validada', color: Colors.statusNormal, icon: 'checkmark-circle' },
};

// Helpers de mapeo clínico
export const colorPorDiagnostico = (dx: DiagnosticoCategoria): string => {
  return DIAGNOSTICO_CONFIG[dx]?.color || Colors.textSecondary;
};

export const colorPorGraf = (graf: EstadoGraf): string => {
  switch (graf) {
    case 'GRAF_I': return Colors.statusNormal;
    case 'GRAF_IIA': return Colors.accent;
    case 'GRAF_IIB': return Colors.statusWarning;
    case 'GRAF_IIB_URGENTE':
    case 'GRAF_III':
    case 'GRAF_IV':
      return Colors.statusDanger;
    default:
      return Colors.textSecondary;
  }
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
  return labels[graf] || 'Sin clasificación';
};
