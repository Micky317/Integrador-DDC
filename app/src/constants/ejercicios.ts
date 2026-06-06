import { Ionicons } from '@expo/vector-icons';
import { Assets } from './assets';

export interface Ejercicio {
  id: string;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  instrucciones: string[];
  repeticionesRecomendadas: string;
  duraciónEstimada: string;
  duracionSegundos: number;
  series: number; // Nuevo: número de veces que se repite el timer
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  videoLocal?: any;
  videoUrl?: string;
}

export const CATALOGO_EJERCICIOS: Ejercicio[] = [
  {
    id: 'abduccion-ranita',
    titulo: 'Ejercicio de la Ranita',
    subtitulo: 'Apertura Suave',
    descripcion: 'Este ejercicio ayuda a que la cadera de tu bebé se desarrolle sana y fuerte, manteniendo sus piernitas en la posición correcta.',
    instrucciones: [
      'Acuéstalo boca arriba en un lugar cómodo.',
      'Sujeta sus rodillas con mucha suavidad.',
      'Abre sus piernitas hacia los lados despacio.',
      'Dibuja círculos suaves, como si fuera una ranita nadando.',
      'Mantén siempre el contacto visual con tu bebé.'
    ],
    repeticionesRecomendadas: '3 series de 2 min',
    duraciónEstimada: '6 min',
    duracionSegundos: 120,
    series: 3,
    icon: 'infinite',
    color: '#00E5CC',
    videoLocal: Assets.animations.rehab_ranita
  },
  {
    id: 'estiramiento-aductores',
    titulo: 'Masaje de Muslos',
    subtitulo: 'Relajación Interna',
    descripcion: 'Ayuda a relajar los muslos de tu bebé para que pueda abrir sus piernitas con más facilidad y sin molestias.',
    instrucciones: [
      'Usa tus dedos gorditos para acariciar la parte interna de su muslo.',
      'Haz masajes en círculos muy pequeñitos.',
      'Ve desde su ingle hacia abajo hasta llegar a la rodilla.',
      'Hazlo suave, como si estuvieras dándole mimos.'
    ],
    repeticionesRecomendadas: '10 repeticiones de 15 seg',
    duraciónEstimada: '5 min',
    duracionSegundos: 15,
    series: 10,
    icon: 'body',
    color: '#FFD700'
  },
  {
    id: 'panal-seguro',
    titulo: 'Cambio de Pañal Seguro',
    subtitulo: 'Protección Diaria',
    descripcion: 'Aprende a cambiar a tu bebé sin forzar sus caderas, cuidando su crecimiento en cada cambio de pañal.',
    instrucciones: [
      'NUNCA levantes al bebé tirando de sus pies.',
      'Mejor mete tu mano debajo de sus nalgas y levántalo de ahí.',
      'Deja que sus piernas se abran de forma natural.',
      'Asegúrate de que el pañal no le apriete los muslos.'
    ],
    repeticionesRecomendadas: 'En cada cambio de pañal',
    duraciónEstimada: 'N/A',
    duracionSegundos: 0,
    series: 1,
    icon: 'leaf',
    color: '#FF7E5F'
  },
  {
    id: 'porteo-ergonomico',
    titulo: 'Cargado en Brazos (Porteo)',
    subtitulo: 'Posición Saludable',
    descripcion: 'Llevar a tu bebé en un cargador adecuado es medicina para sus caderas.',
    instrucciones: [
      'Sus rodillas siempre deben estar más altas que su colita (posición en M).',
      'Su espalda debe verse encorvada como una C.',
      'Asegúrate de que sus pies cuelguen libres.',
      '¡Disfruta de tenerlo cerquita de tu corazón!'
    ],
    repeticionesRecomendadas: 'Siempre que lo cargues',
    duraciónEstimada: 'N/A',
    duracionSegundos: 0,
    series: 1,
    icon: 'heart',
    color: '#A18CD1'
  }
];
