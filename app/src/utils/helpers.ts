import { Colors } from '../constants/theme';

/**
 * Calcula la edad en meses a partir de la fecha de nacimiento.
 */
export const calcularMesesDeEdad = (fechaNac: string): number => {
  if (!fechaNac) return 0;
  const diff = Date.now() - new Date(fechaNac).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
};

/**
 * Obtiene las iniciales de un nombre completo (máximo 2 letras).
 */
export const obtenerIniciales = (name: string): string => {
  if (!name) return '';
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
};

/**
 * Devuelve un color de avatar determinístico basado en el ID del paciente.
 */
export const obtenerColorAvatar = (id: string): string => {
  const colors = Colors.avatarVariants || ['#4D6EE3', '#00C48C', '#FF4757', '#FFB400'];
  // Si el id no es un número puro, sumamos sus char codes
  let numId = parseInt(id);
  if (isNaN(numId)) {
    numId = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  }
  return colors[numId % colors.length];
};

/**
 * Formatea un objeto Date a string YYYY-MM-DD en la zona horaria local.
 */
export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Parsea una fecha de manera segura. Si es un string de fecha simple (YYYY-MM-DD),
 * le añade T00:00:00 para forzar la interpretación en hora local y evitar desfases horarias (timezones).
 */
export const parseDateSafe = (dateStr?: string | null): Date => {
  if (!dateStr) return new Date();
  // Si tiene formato YYYY-MM-DD exacto (10 caracteres)
  if (dateStr.length === 10 && dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
};

/**
 * Formatea el tiempo de recuperación de meses (float) a una cadena amigable
 * mostrando meses y días correspondientes.
 */
export const formatRecoveryTime = (months: number): string => {
  const totalDays = Math.round(months * 30.44);
  if (totalDays <= 0) return '0 días';
  if (totalDays < 30) {
    return `${totalDays} ${totalDays === 1 ? 'día' : 'días'}`;
  }
  const m = Math.floor(totalDays / 30);
  const d = totalDays % 30;

  if (m === 0) {
    return `${d} ${d === 1 ? 'día' : 'días'}`;
  }
  if (d === 0) {
    return `${m} ${m === 1 ? 'mes' : 'meses'}`;
  }
  return `${m} ${m === 1 ? 'mes' : 'meses'} y ${d} ${d === 1 ? 'día' : 'días'}`;
};

/**
 * Convierte cualquier fecha en formato legible (DD/MM/YY, DD/MM/YYYY, etc.)
 * a formato estándar PostgreSQL YYYY-MM-DD.
 */
export const formatToPostgresDate = (dateStr: string | undefined): string | null => {
  if (!dateStr) return null;
  const cleaned = dateStr.trim();
  if (!cleaned) return null;

  // 1. Caso YYYY-MM-DD o YYYY/MM/DD
  const yyyymmdd = /^\d{4}[-/](\d{1,2})[-/](\d{1,2})$/;
  const matchY = cleaned.match(yyyymmdd);
  if (matchY) {
    const [_, month, day] = matchY;
    const year = cleaned.substring(0, 4);
    const paddedMonth = month.padStart(2, '0');
    const paddedDay = day.padStart(2, '0');
    return `${year}-${paddedMonth}-${paddedDay}`;
  }

  // 2. Caso DD-MM-YYYY o DD/MM/YYYY
  const ddmmyyyy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
  const matchD = cleaned.match(ddmmyyyy);
  if (matchD) {
    const [_, day, month, year] = matchD;
    const paddedDay = day.padStart(2, '0');
    const paddedMonth = month.padStart(2, '0');
    return `${year}-${paddedMonth}-${paddedDay}`;
  }

  // 3. Caso DD-MM-YY o DD/MM/YY (año de 2 dígitos)
  const ddmmyy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/;
  const matchD2 = cleaned.match(ddmmyy);
  if (matchD2) {
    const [_, day, month, year2] = matchD2;
    const paddedDay = day.padStart(2, '0');
    const paddedMonth = month.padStart(2, '0');
    
    // Asumir que el año es en el siglo 21 (20YY)
    const year = `20${year2}`;
    return `${year}-${paddedMonth}-${paddedDay}`;
  }

  return cleaned;
};

