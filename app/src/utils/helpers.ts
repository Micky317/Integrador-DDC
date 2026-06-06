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

