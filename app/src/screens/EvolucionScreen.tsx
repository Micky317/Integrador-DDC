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
import { colorPorDiagnostico } from '../types';

const SCREEN_W = Dimensions.get('window').width;

export default function EvolucionScreen() {
  const { pacienteId } = useLocalSearchParams<{ pacienteId: string }>();

  const { data: paciente, isLoading: loadingP } = useQuery({
    queryKey: ['paciente', pacienteId],
    queryFn: () => pacientesService.getPacienteById(pacienteId ?? ''),
    enabled: !!pacienteId,
  });

  const { data: historial = [], isLoading: loadingH } = useQuery({
    queryKey: ['historial', pacienteId],
    queryFn: () => historialService.getHistorialByPaciente(pacienteId ?? ''),
    enabled: !!pacienteId,
  });

  const isLoading = loadingP || loadingH;

  // Preparar datos para gifted-charts
  const { lineDataIzq, lineDataDer } = useMemo(() => {
    if (historial.length === 0) return { lineDataIzq: [], lineDataDer: [] };

    const sortedHistorial = [...historial].sort((a, b) => 
      new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime()
    );

    const dataIzq = sortedHistorial.map((a) => ({
      value: a.anguloIzq,
      label: new Date(a.creadoEn).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }),
      dataPointText: `${a.anguloIzq.toFixed(1)}°`,
    }));

    const dataDer = sortedHistorial.map((a) => ({
      value: a.anguloDer,
      label: new Date(a.creadoEn).toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }),
      dataPointText: `${a.anguloDer.toFixed(1)}°`,
    }));

    return { lineDataIzq: dataIzq, lineDataDer: dataDer };
  }, [historial]);

  const tendencia = useMemo(() => {
    if (historial.length < 2) return null;
    const sorted = [...historial].sort((a, b) => 
      new Date(a.creadoEn).getTime() - new Date(b.creadoEn).getTime()
    );
    const primero = sorted[0];
    const ultimo = sorted[sorted.length - 1];
    return {
      deltaIzq: ultimo.anguloIzq - primero.anguloIzq,
      deltaDer: ultimo.anguloDer - primero.anguloDer,
    };
  }, [historial]);

  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.gradient}>
      <StatusBar style="light" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Curva de Evolución</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Patient header */}
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
        ) : historial.length === 0 ? (
          <GlassContainer intensity={10} style={styles.emptyCard}>
            <Ionicons name="trending-up-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Sin datos de evolución</Text>
            <Text style={styles.emptyText}>Realiza al menos un análisis de IA para ver la curva de progreso.</Text>
          </GlassContainer>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Ángulo Acetabular (°)</Text>
            <GlassContainer intensity={20} style={styles.chartCard}>
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#4D6EE3' }]} />
                  <Text style={styles.legendText}>Izquierda</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#00E5CC' }]} />
                  <Text style={styles.legendText}>Derecha</Text>
                </View>
              </View>

              <LineChart
                data={lineDataIzq}
                data2={lineDataDer}
                height={200}
                width={SCREEN_W - 100}
                initialSpacing={20}
                spacing={50}
                color1="#4D6EE3"
                color2="#00E5CC"
                thickness={3}
                dataPointsColor1="#4D6EE3"
                dataPointsColor2="#00E5CC"
                yAxisTextStyle={{ color: Colors.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: Colors.textMuted, fontSize: 10 }}
                noOfSections={4}
                yAxisLabelSuffix="°"
                rulesColor="rgba(255,255,255,0.1)"
                rulesType="solid"
                textColor1="white"
                pointerConfig={{
                  pointerStripColor: 'lightgray',
                  pointerStripWidth: 2,
                  pointerColor: 'lightgray',
                  radius: 6,
                  pointerLabelComponent: (items: any) => {
                    return (
                      <View style={styles.pointerLabel}>
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>{items[0].value}°</Text>
                      </View>
                    );
                  },
                }}
              />

              <View style={styles.refLegend}>
                <View style={styles.refLegendItem}>
                  <View style={[styles.refLineSwatch, { backgroundColor: Colors.statusWarning }]} />
                  <Text style={styles.refLegendText}>28° Límite</Text>
                </View>
                <View style={styles.refLegendItem}>
                   <View style={[styles.refLineSwatch, { backgroundColor: Colors.statusDanger }]} />
                   <Text style={styles.refLegendText}>30° Displasia</Text>
                </View>
              </View>
            </GlassContainer>

            {tendencia && (
              <>
                <Text style={styles.sectionTitle}>Tendencia Global</Text>
                <View style={styles.tendenciaRow}>
                  <TendenciaCard label="Cadera Izquierda" delta={tendencia.deltaIzq} color="#4D6EE3" />
                  <TendenciaCard label="Cadera Derecha" delta={tendencia.deltaDer} color="#00E5CC" />
                </View>
              </>
            )}

            <Text style={styles.sectionTitle}>Resumen de Registros</Text>
            {historial.map((a, i) => (
              <GlassContainer key={a.id} intensity={10} style={styles.summaryRow}>
                <Text style={styles.summaryNum}>{i + 1}</Text>
                <View style={styles.summaryInfo}>
                  <Text style={styles.summaryDate}>
                    {new Date(a.creadoEn).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </Text>
                  <Text style={styles.summaryAngles}>
                    Izq: <Text style={{ color: colorPorDiagnostico(a.diagnosticoIzq) }}>{a.anguloIzq.toFixed(1)}°</Text>
                    {'  '}Der: <Text style={{ color: colorPorDiagnostico(a.diagnosticoDer) }}>{a.anguloDer.toFixed(1)}°</Text>
                  </Text>
                </View>
              </GlassContainer>
            ))}
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function TendenciaCard({ label, delta, color }: { label: string; delta: number; color: string }) {
  const mejora = delta < 0;
  const icon = mejora ? 'trending-down-outline' : 'trending-up-outline';
  const statusColor = mejora ? Colors.statusNormal : (delta === 0 ? Colors.textMuted : Colors.statusDanger);

  return (
    <GlassContainer intensity={15} style={tendStyles.card}>
      <View style={[tendStyles.iconWrap, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={22} color={statusColor} />
      </View>
      <Text style={tendStyles.label}>{label}</Text>
      <Text style={[tendStyles.delta, { color: statusColor }]}>
        {delta > 0 ? '+' : ''}{delta.toFixed(1)}°
      </Text>
      <Text style={tendStyles.sub}>{delta === 0 ? 'Estable' : (mejora ? 'Mejora' : 'Aumento')}</Text>
    </GlassContainer>
  );
}

const tendStyles = StyleSheet.create({
  card: { flex: 1, padding: Spacing.md, alignItems: 'center', gap: 4 },
  iconWrap: { width: 42, height: 42, borderRadius: Radius.round, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  label: { color: Colors.textSecondary, fontSize: Typography.size.xs, fontFamily: Typography.fonts.medium, textAlign: 'center' },
  delta: { fontSize: Typography.size.xl, fontFamily: Typography.fonts.bold },
  sub: { color: Colors.textMuted, fontSize: Typography.size.xs, fontFamily: Typography.fonts.regular },
});

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 58, paddingBottom: Spacing.md },
  backBtn: { padding: 4 },
  topTitle: { color: Colors.textPrimary, fontSize: Typography.size.lg, fontFamily: Typography.fonts.bold },
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
  pointerLabel: { backgroundColor: '#232b5d', padding: 6, borderRadius: 8 },
  refLegend: { flexDirection: 'row', gap: Spacing.md, marginTop: 10, alignSelf: 'flex-start' },
  refLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  refLineSwatch: { width: 16, height: 2, borderRadius: 1 },
  refLegendText: { color: Colors.textMuted, fontSize: Typography.size.xs, fontFamily: Typography.fonts.regular },
  tendenciaRow: { flexDirection: 'row', gap: Spacing.md },
  summaryRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
  summaryNum: { color: Colors.textMuted, fontSize: Typography.size.base, fontFamily: Typography.fonts.bold, width: 20, textAlign: 'center' },
  summaryInfo: { flex: 1 },
  summaryDate: { color: Colors.textSecondary, fontSize: Typography.size.sm, fontFamily: Typography.fonts.medium },
  summaryAngles: { color: Colors.textSecondary, fontSize: Typography.size.sm, fontFamily: Typography.fonts.regular, marginTop: 2 },
  emptyCard: { padding: Spacing.xxl, alignItems: 'center', gap: Spacing.md },
  emptyTitle: { color: Colors.textSecondary, fontFamily: Typography.fonts.semibold, fontSize: Typography.size.md },
  emptyText: { color: Colors.textMuted, fontFamily: Typography.fonts.regular, fontSize: Typography.size.sm, textAlign: 'center', lineHeight: 20 },
});
