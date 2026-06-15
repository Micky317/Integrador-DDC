import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LineChart } from 'react-native-gifted-charts';
import { Colors, Typography, Spacing, Radius } from '../constants/theme';
import { GlassContainer } from '../components/GlassContainer';

const SCREEN_W = Dimensions.get('window').width;

// Datos del modelo Polinomial Grado 2 (baseline.json)
const BASELINE = {
  a: -0.003369,
  b: -0.419446,
  c: 31.762887,
  r_squared: 0.8419
};

export default function ReferenciaClinicaScreen() {
  const [showBaseline, setShowBaseline] = React.useState(true);
  const [inputAge, setInputAge] = React.useState('4');
  const [inputAngle, setInputAngle] = React.useState('32');
  
  // Escala fija de meses (0 a 24) para alinear las gráficas
  const MONTHS_SCALE = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24];

  // Generar la línea de referencia poblacional (Curva Estándar)
  const regressionLineData = useMemo(() => {
    return MONTHS_SCALE.map(x => ({
      value: (BASELINE.a * Math.pow(x, 2)) + (BASELINE.b * x) + BASELINE.c,
      label: `${x}m`,
    }));
  }, []);

  // Generar la línea de PRONÓSTICO (Curva de Recuperación Esperada)
  const prognosisData = useMemo(() => {
    const currentAge = parseFloat(inputAge) || 0;
    const currentAngle = parseFloat(inputAngle) || 0;
    
    // Calculamos el desfase del paciente respecto al modelo estándar
    const standardAtCurrentAge = (BASELINE.a * Math.pow(currentAge, 2)) + (BASELINE.b * currentAge) + BASELINE.c;
    const offset = currentAngle - standardAtCurrentAge;

    return MONTHS_SCALE.map(x => {
      // Si el mes en la escala es menor a la edad actual, no mostramos punto (usamos hideDataPoint)
      if (x < currentAge && Math.abs(x - currentAge) > 1) return { value: 0, hideDataPoint: true };
      
      // Calculamos el valor proyectado siguiendo la curva del modelo + el desfase
      const projectedVal = (BASELINE.a * Math.pow(x, 2)) + (BASELINE.b * x) + BASELINE.c + offset;
      
      // Si es el punto de inicio (edad actual), le ponemos el estilo de punto destacado
      if (Math.abs(x - currentAge) <= 1) {
        return { 
          value: currentAngle, 
          dataPointText: `${currentAngle}°`,
          dataPointColor: Colors.primary,
          dataPointRadius: 6,
          textColor: '#FFFFFF',
          textFontSize: 9,
          textShiftY: -8
        };
      }

      return { value: projectedVal };
    });
  }, [inputAge, inputAngle]);



  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.gradient}>
      <StatusBar style="light" />
      
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Pronóstico de Evolución IA</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        
        <GlassContainer intensity={15} style={styles.inputCard}>
          <Text style={styles.inputLabel}>Datos del paciente para el pronóstico:</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputField}>
              <Text style={styles.fieldLabel}>Edad (meses)</Text>
              <TextInput 
                style={styles.textInput} 
                value={inputAge} 
                onChangeText={setInputAge} 
                keyboardType="numeric"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
            <View style={styles.inputField}>
              <Text style={styles.fieldLabel}>Ángulo Acetabular (°)</Text>
              <TextInput 
                style={styles.textInput} 
                value={inputAngle} 
                onChangeText={setInputAngle} 
                keyboardType="numeric"
                placeholderTextColor={Colors.textMuted}
              />
            </View>
          </View>
        </GlassContainer>

        <GlassContainer intensity={20} style={styles.chartCard}>
          <View style={styles.legend}>
            <TouchableOpacity 
              style={[styles.legendItem, !showBaseline && styles.legendDisabled]} 
              onPress={() => setShowBaseline(!showBaseline)}
            >
              <View style={[styles.legendDot, { backgroundColor: Colors.statusNormal }]} />
              <Text style={styles.legendText}>Estándar Poblacional</Text>
            </TouchableOpacity>
            
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.legendText}>Pronóstico de Mejora</Text>
            </View>
          </View>

          <LineChart
            data={showBaseline ? regressionLineData : []}
            data2={prognosisData}
            height={220}
            width={SCREEN_W - 90}
            initialSpacing={30}
            spacing={32}
            color1={Colors.statusNormal + '50'}
            color2={Colors.primary}
            thickness1={2}
            thickness2={4}
            dataPointsColor1={Colors.statusNormal + '50'}
            dataPointsColor2={Colors.primary}
            
            // Clean axes and colors (resolves "negros" issue)
            xAxisColor="rgba(255, 255, 255, 0.15)"
            yAxisColor="rgba(255, 255, 255, 0.15)"
            xAxisIndicesColor="rgba(255, 255, 255, 0.15)"
            yAxisIndicesColor="rgba(255, 255, 255, 0.15)"
            xAxisThickness={1}
            yAxisThickness={1}
            rulesColor="rgba(255, 255, 255, 0.08)"
            
            textColor1={Colors.textSecondary}
            textColor2="#FFFFFF"
            
            yAxisTextStyle={{ color: Colors.textSecondary, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: Colors.textSecondary, fontSize: 10 }}
            noOfSections={4}
            yAxisLabelSuffix="°"
            curved
            areaChart={showBaseline}
            stepValue={5}
            maxValue={45}
            startFillColor1={Colors.statusNormal + '10'}
            endFillColor1="transparent"
          />
          
          <View style={styles.formulaBox}>
            <Text style={styles.formulaText}>
              Eq: y = {BASELINE.a}x² + {BASELINE.b}x + {BASELINE.c}
            </Text>
            <Text style={styles.r2Text}>Modelo Polinomial Grado 2 • R²: {BASELINE.r_squared}</Text>
          </View>
        </GlassContainer>

        <Text style={styles.sectionTitle}>Interpretación Clínica</Text>
        
        <View style={styles.insightsRow}>
          <InsightItem 
            title="Tasa de Mejora" 
            value="0.5°/mes" 
            icon="trending-down"
            desc="Reducción esperada del ángulo por cada mes de crecimiento."
          />
          <InsightItem 
            title="Rango Crítico" 
            value="> 30°" 
            icon="warning"
            desc="Valores por encima de esta línea indican posible displasia."
          />
        </View>

      </ScrollView>
    </LinearGradient>
  );
}

function InsightItem({ title, value, icon, desc }: any) {
  return (
    <GlassContainer intensity={15} style={styles.insightCard}>
      <Ionicons name={icon} size={20} color={Colors.primary} />
      <Text style={styles.insightValue}>{value}</Text>
      <Text style={styles.insightTitle}>{title}</Text>
      <Text style={styles.insightDesc}>{desc}</Text>
    </GlassContainer>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  topBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: Spacing.lg, 
    paddingTop: 58, 
    paddingBottom: Spacing.md 
  },
  backBtn: { padding: 4 },
  topTitle: { 
    color: Colors.textPrimary, 
    fontSize: Typography.size.lg, 
    fontFamily: Typography.fonts.bold 
  },
  scroll: { 
    paddingHorizontal: Spacing.lg, 
    paddingBottom: 100, 
    gap: Spacing.md 
  },
  sectionTitle: { 
    color: Colors.textPrimary, 
    fontFamily: Typography.fonts.semibold, 
    fontSize: Typography.size.base, 
    marginTop: 10 
  },
  chartCard: { 
    padding: Spacing.md, 
    alignItems: 'center' 
  },
  legend: { 
    flexDirection: 'row', 
    gap: Spacing.md, 
    marginBottom: 20, 
    alignSelf: 'flex-start' 
  },
  legendItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6 
  },
  legendDisabled: {
    opacity: 0.3
  },
  inputCard: { 
    padding: Spacing.lg, 
    marginBottom: Spacing.md, 
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderCard
  },
  inputLabel: { 
    color: Colors.textSecondary, 
    fontSize: Typography.size.sm, 
    fontFamily: Typography.fonts.semibold,
    marginBottom: Spacing.md 
  },
  inputRow: { 
    flexDirection: 'row', 
    gap: Spacing.md 
  },
  inputField: { 
    flex: 1 
  },
  fieldLabel: { 
    color: Colors.textMuted, 
    fontSize: Typography.size.xs, 
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  textInput: { 
    backgroundColor: Colors.bgInput, 
    color: '#FFF', 
    padding: Spacing.md, 
    borderRadius: Radius.md,
    fontSize: Typography.size.md,
    fontFamily: Typography.fonts.bold,
    borderWidth: 1,
    borderColor: Colors.borderDefault
  },
  legendDot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4 
  },
  legendText: { 
    color: Colors.textSecondary, 
    fontSize: 10 
  },
  formulaBox: { 
    marginTop: 20, 
    alignItems: 'center', 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    padding: 10, 
    borderRadius: 8,
    width: '100%'
  },
  formulaText: { 
    color: Colors.primary, 
    fontFamily: Typography.fonts.bold, 
    fontSize: 14 
  },
  r2Text: { 
    color: Colors.textMuted, 
    fontSize: 10, 
    marginTop: 2 
  },
  insightsRow: { 
    flexDirection: 'row', 
    gap: Spacing.md 
  },
  insightCard: { 
    flex: 1, 
    padding: Spacing.lg, 
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary + '05',
    borderWidth: 1,
    borderColor: Colors.primary + '20'
  },
  insightValue: { 
    color: Colors.textPrimary, 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  insightTitle: { 
    color: Colors.primary, 
    fontSize: Typography.size.sm, 
    fontFamily: Typography.fonts.bold, 
    marginBottom: Spacing.xs 
  },
  insightDesc: { 
    color: Colors.textSecondary, 
    fontSize: Typography.size.xs, 
    lineHeight: 18 
  }
});
