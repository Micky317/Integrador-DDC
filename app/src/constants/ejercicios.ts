import { Ionicons } from '@expo/vector-icons';

export interface Ejercicio {
  id: string;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  instrucciones: string[];
  repeticionesRecomendadas: string;
  duraciónEstimada: string;
  duracionSegundos: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  videoLocal?: any; // Nuevo: para importar videos locales
  videoUrl?: string;
}

export const CATALOGO_EJERCICIOS: Ejercicio[] = [
  {
    id: 'abduccion-ranita',
    titulo: 'Abducción Pasiva',
    subtitulo: 'La Ranita',
    descripcion: 'Favorece la profundidad del acetábulo manteniendo la cabeza del fémur en su sitio.',
    instrucciones: [
      'Coloca al bebé boca arriba en una superficie firme y cómoda.',
      'Flexiona sus rodillas a 90 grados.',
      'Suavemente, separa las piernas hacia los lados (abducción) hasta que sientas una ligera resistencia.',
      'Mantén la posición por 10 segundos y vuelve al centro.',
      'Repite el proceso de forma rítmica.'
    ],
    repeticionesRecomendadas: '3 series de 10 repeticiones',
    duraciónEstimada: '1 min por serie',
    duracionSegundos: 60,
    icon: 'fitness',
    color: '#00E5CC',
    videoLocal: require('../../assets/animations/rehab_anim.gif')
  },
  {
    id: 'estiramiento-aductores',
    titulo: 'Estiramiento de Aductores',
    subtitulo: 'Flexibilidad Interna',
    descripcion: 'Relaja la musculatura interna de los muslos para permitir una mejor apertura de cadera.',
    instrucciones: [
      'Con el bebé relajado, usa tus pulgares para masajear la cara interna del muslo.',
      'Realiza movimientos circulares suaves desde la ingle hacia la rodilla.',
      'Aplica una presión muy leve, casi como una caricia profunda.',
      'Si el bebé llora o se tensa, detente y relájalo antes de continuar.'
    ],
    repeticionesRecomendadas: '5 min por pierna',
    duraciónEstimada: '10 min',
    duracionSegundos: 300,
    icon: 'body',
    color: '#FFD700'
  },
  {
    id: 'panal-seguro',
    titulo: 'Cambio de Pañal Seguro',
    subtitulo: 'Cuidado Diario',
    descripcion: 'Evita tensiones innecesarias en la cadera durante la higiene diaria.',
    instrucciones: [
      'Al cambiar el pañal, NO levantes al bebé tirando de sus pies o tobillos.',
      'Desliza tu mano debajo de sus nalgas y levanta su pelvis suavemente.',
      'Mantén sus piernas en su posición natural de flexión.',
      'Coloca el pañal nuevo sin apretar demasiado los muslos.'
    ],
    repeticionesRecomendadas: 'En cada cambio de pañal',
    duraciónEstimada: 'N/A',
    duracionSegundos: 0,
    icon: 'leaf',
    color: '#FF7E5F'
  },
  {
    id: 'porteo-ergonomico',
    titulo: 'Porteo Ergonómico',
    subtitulo: 'Posición en M',
    descripcion: 'El uso de mochilas ergonómicas ayuda a mantener la cadera en la posición de curación.',
    instrucciones: [
      'Asegúrate de que el cargador mantenga las rodillas del bebé más altas que sus nalgas.',
      'La espalda del bebé debe mantener su curvatura natural en forma de C.',
      'El peso debe recaer sobre el culito, no sobre los pies.',
      'La cara del bebé debe estar siempre visible y "a un beso" de distancia.'
    ],
    repeticionesRecomendadas: 'Durante traslados',
    duraciónEstimada: 'N/A',
    duracionSegundos: 0,
    icon: 'heart',
    color: '#A18CD1'
  }
];
