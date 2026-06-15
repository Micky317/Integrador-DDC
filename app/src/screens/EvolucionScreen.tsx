import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LineChart } from 'react-native-gifted-charts';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { GlassContainer } from '../components/GlassContainer';
import { Skeleton } from '../components/Skeleton';
import { historialService } from '../services/historial.service';
import { pacientesService } from '../services/pacientes.service';
import { colorPorDiagnostico } from '../constants/clinical';
import { rehabilitacionService, RegistroActividad } from '../services/rehabilitacion.service';
import { parseDateSafe, formatRecoveryTime } from '../utils/helpers';
import { useAppStore } from '../store/useAppStore';

const SCREEN_W = Dimensions.get('window').width;

type TreatmentId = 'ejercicios' | 'arnes' | 'yeso' | 'cirugia' | 'observacion';
type GranType = 'dias' | 'semanas' | 'meses';

const TREATMENT_PRIORITY: TreatmentId[] = ['cirugia', 'yeso', 'arnes', 'ejercicios', 'observacion'];

const GRAN_CONFIG: Record<GranType, {
  steps: number[];
  toMonths: (n: number) => number;
  advance: (base: Date, n: number) => Date;
  shortIdx: number;
  longIdx: number;
  shortLabel: string;
  longLabel: string;
}> = {
  dias: {
    steps: [7, 14, 21, 30],
    toMonths: n => n / 30.44,
    advance: (base, n) => { const d = new Date(base); d.setDate(d.getDate() + n); return d; },
    shortIdx: 1, longIdx: 3,
    shortLabel: '14 días', longLabel: '30 días',
  },
  semanas: {
    steps: [2, 4, 8, 12],
    toMonths: n => n / 4.33,
    advance: (base, n) => { const d = new Date(base); d.setDate(d.getDate() + n * 7); return d; },
    shortIdx: 1, longIdx: 3,
    shortLabel: '4 semanas', longLabel: '12 semanas',
  },
  meses: {
    steps: [1, 2, 3, 6],
    toMonths: n => n,
    advance: (base, n) => { const d = new Date(base); d.setMonth(d.getMonth() + n); return d; },
    shortIdx: 2, longIdx: 3,
    shortLabel: '3 meses', longLabel: '6 meses',
  },
};

const TREATMENT_META: Record<TreatmentId, { label: string; ratePerMonth: number; color: string }> = {
  cirugia:     { label: 'Evaluación Quirúrgica',  ratePerMonth: 0,     color: '#FF4757' },
  yeso:        { label: 'Yeso Pélvico',           ratePerMonth: -2.5,  color: '#EF4444' },
  arnes:       { label: 'Arnés de Pavlik',         ratePerMonth: -1.5,  color: '#F59E0B' },
  ejercicios:  { label: 'Ejercicios y Masajes',    ratePerMonth: -0.45, color: '#10B981' },
  observacion: { label: 'Observación Controlada',  ratePerMonth: -0.15, color: '#888888' },
};

export default function EvolucionScreen() {
  const params = useLocalSearchParams<{ id?: string; pacienteId?: string }>();
  const pacienteId = params.pacienteId || params.id || "";
  
  const handleBack = () => {
    router.back();
  };

  const { user } = useAppStore();
  const isMedico = user?.role === 'medico';

  const [activeTab, setActiveTab] = React.useState<'IA' | 'REHAB'>('IA');
  const [selectedDate, setSelectedDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [viewingMonth, setViewingMonth] = React.useState(new Date());
  const [showPrediction, setShowPrediction] = React.useState(true);
  const [predGranularity, setPredGranularity] = React.useState<GranType>('meses');
  const [selectedSide, setSelectedSide] = React.useState<'ambas' | 'izq' | 'der'>('ambas');
  const [showIdealPlan, setShowIdealPlan] = React.useState(true);
  const [showRefLines, setShowRefLines] = React.useState(false);
  const [showValues, setShowValues] = React.useState(true);

  const { data: paciente, isLoading: loadingP } = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => pacientesService.getPacienteById(pacienteId ?? ''),
    enabled: !!pacienteId,
    refetchOnMount: 'always',
  });

  const { data: historial = [], isLoading: loadingH } = useQuery({
    queryKey: ['historial', pacienteId],
    queryFn: () => historialService.getHistorialByPaciente(pacienteId ?? ''),
    enabled: !!pacienteId,
  });

  const { data: rehabHistorial = [], isLoading: loadingR } = useQuery({
    queryKey: ['rehabHistorial', pacienteId],
    queryFn: () => rehabilitacionService.getHistorialActividad(pacienteId ?? ''),
    enabled: !!pacienteId,
  });

  const { data: prescripciones = [] } = useQuery({
    queryKey: ['rehabilitacion', pacienteId],
    queryFn: () => rehabilitacionService.getEjerciciosPrescritos(pacienteId ?? ''),
    enabled: !!pacienteId,
  });

  const { data: proyeccion, isLoading: loadingProj } = useQuery({
    queryKey: ['proyeccion', pacienteId, predGranularity],
    queryFn: () => pacientesService.getProyeccionClinica(pacienteId ?? '', predGranularity),
    enabled: !!pacienteId && showPrediction && activeTab === 'IA',
  });

  const isLoading = loadingP || loadingH || loadingR || (loadingProj && showPrediction && activeTab === 'IA');

  const { lineDataIzq, lineDataDer, chartDataIzq, chartDataDer, initialForecastDataIzq, initialForecastDataDer, historicalCount, tendencia, predictionInfo } = useMemo(() => {
    const empty = { lineDataIzq: [], lineDataDer: [], chartDataIzq: [], chartDataDer: [], initialForecastDataIzq: [], initialForecastDataDer: [], historicalCount: 0, tendencia: null, predictionInfo: null };
    if (historial.length === 0) return empty;

    const sorted = [...historial].sort((a, b) =>
      parseDateSafe(a.fechaRadiografia || a.creadoEn).getTime() -
      parseDateSafe(b.fechaRadiografia || b.creadoEn).getTime()
    );

    const dataIzq = sorted.map(a => {
      const date = parseDateSafe(a.fechaRadiografia || a.creadoEn);
      return {
        value: a.anguloIzq,
        label: date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }),
        dataPointText: showValues ? `${a.anguloIzq.toFixed(1)}°` : undefined,
        textColor: '#4D6EE3',
        textFontSize: 9,
        textShiftY: -16,
        textShiftX: -4,
      };
    });
    const dataDer = sorted.map(a => {
      const date = parseDateSafe(a.fechaRadiografia || a.creadoEn);
      return {
        value: a.anguloDer,
        label: date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }),
        dataPointText: showValues ? `${a.anguloDer.toFixed(1)}°` : undefined,
        textColor: '#00E5CC',
        textFontSize: 9,
        textShiftY: -16,
        textShiftX: 4,
      };
    });

    const tend = sorted.length >= 2 ? {
      deltaIzq: sorted[sorted.length - 1].anguloIzq - sorted[0].anguloIzq,
      deltaDer: sorted[sorted.length - 1].anguloDer - sorted[0].anguloDer,
    } : null;

    if (sorted.length < 2 || !proyeccion) {
      return { 
        lineDataIzq: dataIzq, 
        lineDataDer: dataDer, 
        chartDataIzq: dataIzq, 
        chartDataDer: dataDer, 
        initialForecastDataIzq: [], 
        initialForecastDataDer: [], 
        historicalCount: sorted.length, 
        tendencia: tend, 
        predictionInfo: null 
      };
    }

    const predIzq = proyeccion.proyeccion_izq.map(p => ({
      value: p.angulo_proyectado,
      label: p.label,
      dataPointText: showValues ? `${p.angulo_proyectado.toFixed(1)}°` : undefined,
      textColor: '#4D6EE3',
      textFontSize: 9,
      textShiftY: -16,
      textShiftX: -4,
      customDataPoint: () => (
        <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#4D6EE3', backgroundColor: Colors.bgCard }} />
      ),
    }));

    const predDer = proyeccion.proyeccion_der.map(p => ({
      value: p.angulo_proyectado,
      label: p.label,
      dataPointText: showValues ? `${p.angulo_proyectado.toFixed(1)}°` : undefined,
      textColor: '#00E5CC',
      textFontSize: 9,
      textShiftY: -16,
      textShiftX: 4,
      customDataPoint: () => (
        <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#00E5CC', backgroundColor: Colors.bgCard }} />
      ),
    }));

    const len = proyeccion.proyeccion_izq.length;
    const shortIdx = Math.min(1, len - 1);
    const longIdx = len - 1;

    const pShort = proyeccion.proyeccion_izq[shortIdx];
    const pLong = proyeccion.proyeccion_izq[longIdx];

    const pShortDer = proyeccion.proyeccion_der[shortIdx];
    const pLongDer = proyeccion.proyeccion_der[longIdx];

    const treatmentsLabels = proyeccion.tratamientos_activos.map(t => {
      if (t === 'yeso') return 'Yeso Pélvico';
      if (t === 'arnes') return 'Arnés de Pavlik';
      if (t === 'ejercicios') return 'Ejercicios';
      if (t === 'cirugia') return 'Quirúrgico';
      return 'Observación';
    }).join(' + ') || 'Observación';

    const predInfo = {
      meta: {
        label: treatmentsLabels,
      },
      primaryTratamiento: proyeccion.tratamientos_activos.includes('ejercicios') ? 'ejercicios' as const : 'observacion' as const,
      monthlyRate: proyeccion.tasa_tratamiento_mensual,
      compliancePct: proyeccion.cumplimiento_ejercicios_pct ?? 0,
      monthsToGoal: proyeccion.meses_para_meta,
      alreadyNormal: proyeccion.ya_esta_sano,
      shortLabel: pShort ? pShort.label : '',
      longLabel: pLong ? pLong.label : '',
      predShort: {
        izq: pShort ? pShort.angulo_proyectado : 0,
        der: pShortDer ? pShortDer.angulo_proyectado : 0,
      },
      predLong: {
        izq: pLong ? pLong.angulo_proyectado : 0,
        der: pLongDer ? pLongDer.angulo_proyectado : 0,
      }
    };

    const initialForecastDataIzq = proyeccion.pronostico_inicial_izq?.map(val => ({
      value: val,
      customDataPoint: () => (
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#4D6EE3', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF' }} />
        </View>
      ),
    })) || [];

    const initialForecastDataDer = proyeccion.pronostico_inicial_der?.map(val => ({
      value: val,
      customDataPoint: () => (
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#00E5CC', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF' }} />
        </View>
      ),
    })) || [];

    return {
      lineDataIzq: dataIzq,
      lineDataDer: dataDer,
      chartDataIzq: [...dataIzq, ...predIzq],
      chartDataDer: [...dataDer, ...predDer],
      initialForecastDataIzq,
      initialForecastDataDer,
      historicalCount: sorted.length,
      tendencia: tend,
      predictionInfo: predInfo,
    };
  }, [historial, proyeccion, showValues]);

  const chartData = useMemo(() => {
    let mainData: any[] = [];
    let secData: any[] = [];
    let mainIdeal: any[] = [];
    let secIdeal: any[] = [];

    if (selectedSide === 'izq') {
      mainData = showPrediction ? chartDataIzq : lineDataIzq;
      mainIdeal = showIdealPlan ? initialForecastDataIzq : [];
    } else if (selectedSide === 'der') {
      mainData = showPrediction ? chartDataDer : lineDataDer;
      mainIdeal = showIdealPlan ? initialForecastDataDer : [];
    } else {
      mainData = showPrediction ? chartDataIzq : lineDataIzq;
      secData = showPrediction ? chartDataDer : lineDataDer;
      mainIdeal = showIdealPlan ? initialForecastDataIzq : [];
      secIdeal = showIdealPlan ? initialForecastDataDer : [];
    }

    return { mainData, secData, mainIdeal, secIdeal };
  }, [selectedSide, showPrediction, showIdealPlan, chartDataIzq, lineDataIzq, chartDataDer, lineDataDer, initialForecastDataIzq, initialForecastDataDer]);

  const narrativaText = useMemo(() => {
    if (!proyeccion) return '';
    
    if (proyeccion.ya_esta_sano) {
      return isMedico 
        ? '📋 Evolución clínica: Ambas caderas se proyectan y se encuentran en rangos de normalidad (<28°).'
        : '🎉 ¡Felicidades! Ambos ángulos acetabulares están dentro del rango normal (<28°). ¡Todo el esfuerzo ha valido la pena! Continúa con los controles preventivos indicados por tu médico.';
    }

    const trats = proyeccion.tratamientos_activos;
    const rate = Math.abs(proyeccion.tasa_tratamiento_mensual);
    const months = proyeccion.meses_para_meta;
    const compliance = proyeccion.cumplimiento_ejercicios_pct;
    const age = proyeccion.edad_actual_meses;

    const treatmentsLabels = trats.map(t => {
      if (t === 'yeso') return 'Yeso Pélvico';
      if (t === 'arnes') return 'Arnés de Pavlik';
      if (t === 'ejercicios') return 'Ejercicios';
      if (t === 'cirugia') return 'Quirúrgico';
      return 'Observación';
    }).join(' + ') || 'Observación';

    if (isMedico) {
      // Narrativa profesional para médicos
      let text = '📋 ';
      if (compliance !== null && compliance !== undefined && trats.includes('ejercicios')) {
        text += `El paciente registra una adherencia del ${compliance}% en el programa de rehabilitación prescrito. `;
      } else {
        text += `Bajo el protocolo terapéutico de ${treatmentsLabels}, `;
      }

      text += `se proyecta una tasa de corrección acetabular promedio de ~${rate.toFixed(2)}° por mes.`;
      
      if (months) {
        const timeText = formatRecoveryTime(months);
        text += ` A este ritmo constante, se estima la normalización de los ángulos (<28°) en aproximadamente ${timeText}.`;
      } else {
        text += ` Se requiere la carga de una nueva radiografía de control para estimar el plazo de corrección.`;
      }

      text += ` Tras alcanzar el umbral de normalización (<28°), la proyección suspende la tasa de corrección activa del tratamiento y modela la estabilización fisiológica mediante el desarrollo óseo natural.`;

      if (age > 12) {
        text += `\n\n📌 Nota clínica: Dada la edad actual del lactante (${age.toFixed(1)} meses), la velocidad de remodelación acetabular es menor debido al grado de osificación, requiriendo un seguimiento continuo de la adherencia.`;
      }
      return text;
    } else {
      // Narrativa amigable/motivacional para padres
      let text = '';
      
      if (compliance !== null && compliance !== undefined && trats.includes('ejercicios')) {
        if (compliance >= 80) {
          text += `✨ ¡Espectacular! Con una constancia del ${compliance}% en la rehabilitación, estás haciendo un trabajo extraordinario. `;
        } else if (compliance >= 50) {
          text += `👍 ¡Buen esfuerzo! Registras una constancia del ${compliance}% en los ejercicios diarios. `;
        } else {
          text += `💪 ¡Vamos, tú puedes! Actualmente registras una constancia del ${compliance}%. `;
        }
      } else {
        text += `📋 Siguiendo el tratamiento activo de ${treatmentsLabels}, `;
      }

      text += `se proyecta una tasa de corrección promedio de ~${rate.toFixed(2)}° por mes en las caderas.`;
      
      if (months) {
        const timeText = formatRecoveryTime(months);
        text += ` A este ritmo constante, tu bebé alcanzará el rango normal (<28°) en aproximadamente ${timeText}. ¡Cada sesión de masajes y ejercicios cuenta!`;
      } else {
        text += ` Para darte un estimado de tiempo exacto, el sistema necesita recopilar los datos de tu próximo control radiográfico.`;
      }

      text += ` Una vez que la cadera de tu bebé llegue a los ángulos correctos (<28°), la línea de proyección detiene la corrección activa y se estabiliza siguiendo la maduración ósea saludable, en lugar de seguir bajando infinitamente.`;

      if (age > 12) {
        text += `\n\n💡 Nota médica: Como tu bebé tiene ${age.toFixed(1)} meses de edad, la calcificación natural del hueso es mayor, por lo que la cadera corrige más lentamente. ¡Por eso la paciencia y la constancia diaria son tus mejores aliadas en esta etapa!`;
      }

      if (compliance !== null && compliance !== undefined && trats.includes('ejercicios') && compliance < 80) {
        const potentialRate = rate * 1.5;
        text += `\n\n🎯 Reto de recuperación: Si subes la constancia diaria del ${compliance}% al 80% o más, la tasa de mejora podría subir a ~${potentialRate.toFixed(2)}° al mes. ¡Esto podría recortar el tiempo de tratamiento en varios meses!`;
      } else if (compliance !== null && compliance !== undefined && compliance >= 80) {
        text += `\n\n🔥 ¡Mantén la racha! Tu disciplina de alta adherencia asegura que la proyección se cumpla en el menor tiempo estimado posible. ¡Sigue cuidando así la salud de tu bebé!`;
      }

      return text;
    }
  }, [proyeccion, isMedico]);

  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.gradient}>
      <StatusBar style="light" />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={28} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Evolución y Metas</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'IA' && styles.activeTab]} onPress={() => setActiveTab('IA')}>
          <Ionicons name="analytics" size={20} color={activeTab === 'IA' ? '#FFF' : Colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'IA' && styles.activeTabText]}>Análisis IA</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'REHAB' && styles.activeTab]} onPress={() => setActiveTab('REHAB')}>
          <Ionicons name="calendar" size={20} color={activeTab === 'REHAB' ? '#FFF' : Colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'REHAB' && styles.activeTabText]}>Rehabilitación</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {paciente && (
          <GlassContainer intensity={15} style={styles.patientChip}>
            <Ionicons name="person-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.patientName}>{paciente.nombreCompleto}</Text>
            <Text style={styles.patientCode}>{paciente.codigoPaciente}</Text>
          </GlassContainer>
        )}

        {isLoading ? (
          <>
            <Skeleton height={220} borderRadius={Radius.lg} style={{ marginBottom: 12 }} />
            <Skeleton height={100} borderRadius={Radius.lg} style={{ marginBottom: 12 }} />
          </>
        ) : activeTab === 'IA' ? (
          historial.length === 0 ? (
            <GlassContainer intensity={10} style={styles.emptyCard}>
              <Ionicons name="trending-up-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>Sin datos de evolución</Text>
              <Text style={styles.emptyText}>Realiza al menos un análisis de IA para ver la curva de progreso.</Text>
            </GlassContainer>
          ) : (
            <>
              <View style={styles.chartTitleRow}>
                <Text style={styles.sectionTitle}>Ángulo Acetabular (°)</Text>
              </View>

              {/* Panel de Filtros Moderno */}
              <GlassContainer intensity={10} style={styles.filterCard}>
                <View style={styles.filterRow}>
                  <Text style={styles.filterLabel}>Cadera:</Text>
                  <View style={styles.sideSelector}>
                    {(['ambas', 'izq', 'der'] as const).map(side => (
                      <TouchableOpacity
                        key={side}
                        style={[
                          styles.sideBtn,
                          selectedSide === side && styles.sideBtnActive
                        ]}
                        onPress={() => setSelectedSide(side)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.sideBtnText,
                          selectedSide === side && styles.sideBtnTextActive
                        ]}>
                          {side === 'ambas' ? 'Ambas' : side === 'izq' ? 'Izq' : 'Der'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.toggleRow}>
                  {predictionInfo && (
                    <TouchableOpacity
                      style={[styles.toggleChip, showPrediction && styles.toggleChipActive]}
                      onPress={() => setShowPrediction(p => !p)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={showPrediction ? 'eye' : 'eye-off'}
                        size={12}
                        color={showPrediction ? Colors.primary : Colors.textMuted}
                      />
                      <Text style={[styles.toggleChipText, showPrediction && styles.toggleChipTextActive]}>
                        Proyección IA
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.toggleChip, showIdealPlan && styles.toggleChipActive]}
                    onPress={() => setShowIdealPlan(p => !p)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showIdealPlan ? 'eye' : 'eye-off'}
                      size={12}
                      color={showIdealPlan ? Colors.primary : Colors.textMuted}
                    />
                    <Text style={[styles.toggleChipText, showIdealPlan && styles.toggleChipTextActive]}>
                      Plan Ideal
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.toggleChip, showRefLines && styles.toggleChipActive]}
                    onPress={() => setShowRefLines(p => !p)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showRefLines ? 'eye' : 'eye-off'}
                      size={12}
                      color={showRefLines ? Colors.primary : Colors.textMuted}
                    />
                    <Text style={[styles.toggleChipText, showRefLines && styles.toggleChipTextActive]}>
                      Líneas Guía
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.toggleChip, showValues && styles.toggleChipActive]}
                    onPress={() => setShowValues(p => !p)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showValues ? 'eye' : 'eye-off'}
                      size={12}
                      color={showValues ? Colors.primary : Colors.textMuted}
                    />
                    <Text style={[styles.toggleChipText, showValues && styles.toggleChipTextActive]}>
                      Valores
                    </Text>
                  </TouchableOpacity>
                </View>

                {predictionInfo && showPrediction && (
                  <View style={styles.granRow}>
                    <Text style={styles.filterLabel}>Intervalo:</Text>
                    <View style={styles.granSelector}>
                      {(['dias', 'semanas', 'meses'] as GranType[]).map(g => (
                        <TouchableOpacity
                          key={g}
                          style={[styles.granPill, predGranularity === g && styles.granPillActive]}
                          onPress={() => setPredGranularity(g)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.granText, predGranularity === g && styles.granTextActive]}>
                            {g === 'dias' ? 'Días' : g === 'semanas' ? 'Semanas' : 'Meses'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </GlassContainer>

              <GlassContainer intensity={20} style={styles.chartCard}>
                <View style={styles.legend}>
                  {(selectedSide === 'ambas' || selectedSide === 'izq') && (
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#4D6EE3' }]} />
                      <Text style={styles.legendText}>Izq</Text>
                    </View>
                  )}
                  {(selectedSide === 'ambas' || selectedSide === 'der') && (
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#00E5CC' }]} />
                      <Text style={styles.legendText}>Der</Text>
                    </View>
                  )}
                  {predictionInfo && showPrediction && (
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDotHollow, { borderColor: selectedSide === 'der' ? '#00E5CC' : '#4D6EE3' }]} />
                      <Text style={styles.legendText}>Proy. IA</Text>
                    </View>
                  )}
                  {showIdealPlan && (
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDotHollow, { borderColor: Colors.statusNormal, borderStyle: 'dashed' }]} />
                      <Text style={styles.legendText}>Plan Ideal</Text>
                    </View>
                  )}
                </View>
                <LineChart
                  data={chartData.mainData}
                  data2={chartData.secData.length > 0 ? chartData.secData : undefined}
                  data3={chartData.mainIdeal.length > 0 ? chartData.mainIdeal : undefined}
                  data4={chartData.secIdeal.length > 0 ? chartData.secIdeal : undefined}
                  height={200}
                  width={SCREEN_W - 90}
                  initialSpacing={25}
                  spacing={Math.max(40, Math.floor((SCREEN_W - 130) / Math.max((chartData.mainData || []).length - 1, 1)))}
                  color1={selectedSide === 'der' ? '#00E5CC' : '#4D6EE3'}
                  color2={selectedSide === 'der' ? 'transparent' : '#00E5CC'}
                  color3="rgba(0, 196, 140, 0.4)" // Verde clínico suave (salud/recuperación)
                  color4={selectedSide === 'ambas' ? 'rgba(0, 196, 140, 0.4)' : 'transparent'}
                  thickness={3}
                  thickness3={1.5}
                  thickness4={1.5}
                  strokeDashArray3={[4, 4]}
                  strokeDashArray4={[4, 4]}
                  dataPointsColor1={selectedSide === 'der' ? '#00E5CC' : '#4D6EE3'}
                  dataPointsColor2={selectedSide === 'der' ? 'transparent' : '#00E5CC'}
                  dataPointsColor3="rgba(0, 196, 140, 0.4)"
                  dataPointsColor4={selectedSide === 'ambas' ? 'rgba(0, 196, 140, 0.4)' : 'transparent'}
                  dataPointsWidth={10}
                  dataPointsHeight={10}
                  dataPointsRadius={5}
                  textColor1={selectedSide === 'der' ? '#00E5CC' : '#4D6EE3'}
                  textColor2={selectedSide === 'der' ? 'transparent' : '#00E5CC'}
                  textColor3={selectedSide === 'der' ? '#00E5CC' : '#4D6EE3'}
                  textColor4={selectedSide === 'der' ? 'transparent' : '#00E5CC'}
                  textFontSize1={9}
                  textFontSize2={9}
                  xAxisColor="rgba(255, 255, 255, 0.15)"
                  yAxisColor="rgba(255, 255, 255, 0.15)"
                  xAxisIndicesColor="rgba(255, 255, 255, 0.15)"
                  yAxisIndicesColor="rgba(255, 255, 255, 0.15)"
                  xAxisThickness={1}
                  yAxisThickness={1}
                  rulesColor="rgba(255, 255, 255, 0.08)"
                  showReferenceLine1={showRefLines}
                  referenceLine1Position={28}
                  referenceLine1Config={{
                    color: 'rgba(77, 110, 227, 0.35)', // Azul índigo muy sutil del tema
                    thickness: 1.2,
                    type: 'dashed',
                    dashWidth: 5,
                    dashGap: 5,
                  }}
                  showReferenceLine2={showRefLines}
                  referenceLine2Position={30}
                  referenceLine2Config={{
                    color: 'rgba(255, 71, 87, 0.35)', // Rojo semáforo muy sutil/transparente
                    thickness: 1.2,
                    type: 'dashed',
                    dashWidth: 5,
                    dashGap: 5,
                  }}
                  yAxisTextStyle={{ color: Colors.textSecondary, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: Colors.textSecondary, fontSize: 9 }}
                  noOfSections={4}
                  yAxisLabelSuffix="°"
                />
                {showRefLines && (
                  <View style={styles.refLegend}>
                    <View style={styles.refLegendItem}><View style={[styles.refLineSwatch, { backgroundColor: 'rgba(77, 110, 227, 0.6)' }]} /><Text style={styles.refLegendText}>28° Límite</Text></View>
                    <View style={styles.refLegendItem}><View style={[styles.refLineSwatch, { backgroundColor: 'rgba(255, 71, 87, 0.6)' }]} /><Text style={styles.refLegendText}>30° Displasia</Text></View>
                  </View>
                )}
              </GlassContainer>

              {predictionInfo && showPrediction && (
                <>
                  <Text style={styles.sectionTitle}>
                    Proyección · {predictionInfo.meta.label}
                  </Text>
                  <GlassContainer intensity={15} style={styles.predCard}>
                    <View style={styles.predGoalRow}>
                      {predictionInfo.alreadyNormal ? (
                        <>
                          <Ionicons name="checkmark-circle" size={18} color={Colors.statusNormal} />
                          <Text style={[styles.predGoalText, { color: Colors.statusNormal }]}>Ángulo dentro del rango normal (&lt;28°)</Text>
                        </>
                      ) : predictionInfo.monthlyRate < 0 ? (
                        <>
                          <Ionicons name="flag" size={18} color={Colors.primary} />
                          <Text style={styles.predGoalText}>
                            Meta &lt;28°{predictionInfo.monthsToGoal ? ` en ~${predictionInfo.monthsToGoal} meses` : ' — faltan más radiografías'}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="alert-circle" size={18} color={Colors.statusUrgent} />
                          <Text style={[styles.predGoalText, { color: Colors.statusUrgent }]}>Sin mejora proyectada — pendiente de intervención</Text>
                        </>
                      )}
                    </View>
                    <View style={styles.predRow}>
                      <View style={styles.predCol}>
                        <Text style={styles.predColTitle}>En {predictionInfo.shortLabel}</Text>
                        <Text style={styles.predColVal}>Izq: {predictionInfo.predShort.izq.toFixed(1)}°</Text>
                        <Text style={styles.predColVal}>Der: {predictionInfo.predShort.der.toFixed(1)}°</Text>
                      </View>
                      <View style={styles.predDivider} />
                      <View style={styles.predCol}>
                        <Text style={styles.predColTitle}>En {predictionInfo.longLabel}</Text>
                        <Text style={styles.predColVal}>Izq: {predictionInfo.predLong.izq.toFixed(1)}°</Text>
                        <Text style={styles.predColVal}>Der: {predictionInfo.predLong.der.toFixed(1)}°</Text>
                      </View>
                      {predictionInfo.primaryTratamiento === 'ejercicios' && (
                        <>
                          <View style={styles.predDivider} />
                          <View style={styles.predCol}>
                            <Text style={styles.predColTitle}>Cumplimiento</Text>
                            <Text style={[styles.predColVal, {
                              color: predictionInfo.compliancePct >= 70 ? Colors.statusNormal
                                : predictionInfo.compliancePct >= 40 ? Colors.statusWarning
                                : Colors.statusDanger,
                              fontSize: 18, fontWeight: 'bold',
                            }]}>{predictionInfo.compliancePct}%</Text>
                            <Text style={styles.predColMeta}>30 días</Text>
                          </View>
                        </>
                      )}
                    </View>
                    {narrativaText ? (
                      <View style={styles.predNarrativeBox}>
                        <Text style={styles.predNarrativeText}>{narrativaText}</Text>
                      </View>
                    ) : null}
                  </GlassContainer>
                </>
              )}

              {tendencia && (
                <>
                  <Text style={styles.sectionTitle}>Tendencia Global</Text>
                  <View style={styles.tendenciaRow}>
                    <TendenciaCard label="Cadera Izquierda" delta={tendencia.deltaIzq} color="#4D6EE3" />
                    <TendenciaCard label="Cadera Derecha" delta={tendencia.deltaDer} color="#00E5CC" />
                  </View>
                </>
              )}
            </>
          )
        ) : (
          <View style={{ gap: Spacing.md }}>
            <Text style={styles.sectionTitle}>Calendario de Cumplimiento</Text>
            <GlassContainer intensity={15} style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => { const p = new Date(viewingMonth); p.setMonth(p.getMonth() - 1); setViewingMonth(p); }}>
                  <Ionicons name="chevron-back" size={20} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.calendarMonth}>{viewingMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</Text>
                <TouchableOpacity onPress={() => { const n = new Date(viewingMonth); n.setMonth(n.getMonth() + 1); setViewingMonth(n); }}>
                  <Ionicons name="chevron-forward" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
              <View style={styles.calendarGrid}>
                {Array.from({ length: new Date(viewingMonth.getFullYear(), viewingMonth.getMonth() + 1, 0).getDate() }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = new Date(viewingMonth.getFullYear(), viewingMonth.getMonth(), day).toISOString().split('T')[0];
                  const actividadesDia = rehabHistorial.filter(h => h.fecha.startsWith(dateStr));
                  const segundosTotales = actividadesDia.reduce((sum, h) => sum + (h.duracion_segundos || 0), 0);
                  const completado = segundosTotales >= 1200;
                  const tieneAlgo = actividadesDia.length > 0;
                  const isSelected = selectedDate === dateStr;
                  return (
                    <TouchableOpacity key={i} style={styles.dayCell} onPress={() => setSelectedDate(dateStr)}>
                      <View style={[styles.dayDot, tieneAlgo && styles.dayDotActive, completado && { backgroundColor: Colors.statusNormal, borderColor: Colors.statusNormal }, isSelected && { borderWidth: 2, borderColor: '#FFF' }]}>
                        <Text style={[styles.dayText, (tieneAlgo || isSelected) && { color: '#FFF' }]}>{day}</Text>
                      </View>
                      {completado && <Ionicons name="star" size={10} color="#FFD700" style={styles.starIcon} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </GlassContainer>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <Text style={styles.sectionTitle}>
                {selectedDate === new Date().toISOString().split('T')[0] ? 'Actividad de Hoy' : `Actividad del ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`}
              </Text>
              <View style={{ backgroundColor: Colors.primary + '30', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ color: Colors.primary, fontSize: 12, fontWeight: 'bold' }}>
                  {Math.floor(rehabHistorial.filter(h => h.fecha.startsWith(selectedDate)).reduce((s, h) => s + (h.duracion_segundos || 0), 0) / 60)} min
                </Text>
              </View>
            </View>

            {rehabHistorial.filter(h => h.fecha.startsWith(selectedDate)).length === 0 ? (
              <GlassContainer style={styles.emptyCard}><Text style={styles.emptyText}>No hay registros para este día.</Text></GlassContainer>
            ) : (
              rehabHistorial.filter(h => h.fecha.startsWith(selectedDate)).map((reg) => (
                <GlassContainer key={reg.id} style={styles.rehabLogCard}>
                  <View style={[styles.rehabIcon, { backgroundColor: Colors.primary + '20' }]}><Ionicons name="fitness" size={20} color={Colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rehabLogTitle}>{reg.ejercicio_id.replace(/-/g, ' ')}</Text>
                    <Text style={styles.rehabLogTime}>{new Date(reg.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {Math.floor(reg.duracion_segundos / 60)} min</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.statusNormal} />
                </GlassContainer>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function TendenciaCard({ label, delta, color }: { label: string; delta: number; color: string }) {
  const mejora = delta < 0;
  const statusColor = mejora ? Colors.statusNormal : (delta === 0 ? Colors.textMuted : Colors.statusDanger);
  return (
    <GlassContainer intensity={15} style={styles.tendCard}>
      <View style={[styles.tendIconWrap, { backgroundColor: color + '22' }]}><Ionicons name={mejora ? 'trending-down' : 'trending-up'} size={22} color={statusColor} /></View>
      <Text style={styles.tendLabel}>{label}</Text>
      <Text style={[styles.tendDelta, { color: statusColor }]}>{delta > 0 ? '+' : ''}{delta.toFixed(1)}°</Text>
    </GlassContainer>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 58, paddingBottom: Spacing.md },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)' },
  topTitle: { color: Colors.textPrimary, fontSize: Typography.size.lg, fontFamily: Typography.fonts.bold },
  tabContainer: { flexDirection: 'row', marginHorizontal: Spacing.lg, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, marginBottom: Spacing.sm },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 10 },
  activeTab: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  activeTabText: { color: '#FFF' },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 100, gap: Spacing.md },
  patientChip: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm, gap: Spacing.sm },
  patientName: { color: Colors.textPrimary, fontFamily: Typography.fonts.semibold, fontSize: Typography.size.base, flex: 1 },
  patientCode: { color: Colors.primary, fontFamily: Typography.fonts.semibold, fontSize: Typography.size.xs },
  sectionTitle: { color: Colors.textPrimary, fontFamily: Typography.fonts.semibold, fontSize: Typography.size.base, marginTop: 4, marginBottom: 4 },
  chartCard: { padding: Spacing.md, gap: Spacing.sm, alignItems: 'center' },
  legend: { flexDirection: 'row', gap: Spacing.md, marginBottom: 10, alignSelf: 'flex-start' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: Colors.textSecondary, fontSize: Typography.size.xs, fontFamily: Typography.fonts.medium },
  refLegend: { flexDirection: 'row', gap: Spacing.md, marginTop: 10, alignSelf: 'flex-start' },
  refLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  refLineSwatch: { width: 16, height: 2, borderRadius: 1 },
  refLegendText: { color: Colors.textMuted, fontSize: Typography.size.xs, fontFamily: Typography.fonts.regular },
  chartTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, marginBottom: 4 },
  filterCard: { padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm, borderRadius: Radius.md },
  filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  filterLabel: { color: Colors.textSecondary, fontSize: 11, fontFamily: Typography.fonts.bold, textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 60 },
  sideSelector: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3 },
  sideBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 8 },
  sideBtnActive: { backgroundColor: Colors.bgCardLight, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sideBtnText: { color: Colors.textMuted, fontSize: 12, fontFamily: Typography.fonts.medium },
  sideBtnTextActive: { color: '#FFF', fontFamily: Typography.fonts.semibold },
  toggleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: Spacing.xs },
  toggleChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' },
  toggleChipActive: { borderColor: Colors.primary + '40', backgroundColor: Colors.primary + '10' },
  toggleChipText: { color: Colors.textMuted, fontSize: 11, fontFamily: Typography.fonts.medium },
  toggleChipTextActive: { color: Colors.primary, fontFamily: Typography.fonts.semibold },
  granRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.xs },
  granSelector: { flex: 1, flexDirection: 'row', gap: 6 },
  granPill: { flex: 1, alignItems: 'center', paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' },
  granPillActive: { backgroundColor: 'rgba(0,229,204,0.15)', borderColor: Colors.primary },
  granText: { color: Colors.textMuted, fontSize: 12, fontFamily: Typography.fonts.medium },
  granTextActive: { color: Colors.primary, fontFamily: Typography.fonts.semibold },
  predToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: Colors.textMuted },
  predToggleActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  predToggleText: { color: Colors.textMuted, fontSize: 11, fontFamily: Typography.fonts.medium },
  predToggleTextActive: { color: '#FFF' },
  legendDotHollow: { width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: '#8899cc', backgroundColor: 'transparent' },
  predCard: { padding: Spacing.md, gap: Spacing.md },
  predGoalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  predGoalText: { color: Colors.textPrimary, fontSize: Typography.size.sm, flex: 1, fontFamily: Typography.fonts.medium },
  predRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: Radius.md, padding: Spacing.md },
  predNarrativeBox: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginTop: 12,
  },
  predNarrativeText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: Typography.fonts.regular,
  },
  predCol: { flex: 1, alignItems: 'center', gap: 4 },
  predDivider: { width: 1, height: 50, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 4 },
  predColTitle: { color: Colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  predColVal: { color: Colors.textPrimary, fontSize: Typography.size.sm, fontFamily: Typography.fonts.semibold },
  predColMeta: { color: Colors.textMuted, fontSize: 9 },
  tendenciaRow: { flexDirection: 'row', gap: Spacing.md },
  tendCard: { flex: 1, padding: Spacing.md, alignItems: 'center', gap: 4 },
  tendIconWrap: { width: 42, height: 42, borderRadius: Radius.round, alignItems: 'center', justifyContent: 'center' },
  tendLabel: { color: Colors.textSecondary, fontSize: 10, textAlign: 'center' },
  tendDelta: { fontSize: 20, fontWeight: 'bold' },
  emptyCard: { padding: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  emptyTitle: { color: Colors.textSecondary, fontWeight: 'bold' },
  emptyText: { color: Colors.textMuted, fontSize: 12, textAlign: 'center' },
  calendarCard: { padding: 16 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calendarMonth: { color: '#FFF', fontWeight: 'bold', textTransform: 'capitalize' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-start' },
  dayCell: { width: (SCREEN_W - 80) / 7.5, alignItems: 'center', marginBottom: 8 },
  dayDot: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  dayDotActive: { backgroundColor: Colors.primary + '40', borderColor: Colors.primary },
  dayText: { color: Colors.textMuted, fontSize: 12 },
  starIcon: { position: 'absolute', top: -4, right: -4 },
  rehabLogCard: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, marginBottom: 8 },
  rehabIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rehabLogTitle: { color: '#FFF', fontSize: 14, fontWeight: 'bold', textTransform: 'capitalize' },
  rehabLogTime: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
});
