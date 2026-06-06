import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useLocalSearchParams, router } from 'expo-router';

// UI Components
import { PrimaryButton } from '../components/PrimaryButton';
import { GlassContainer } from '../components/GlassContainer';
import { ConsentimientoLegalModal } from '../components/ConsentimientoLegalModal';
import { VideoRecorderScreen } from '../components/VideoRecorderScreen';
import { TimerProgress } from '../features/rehabilitacion/components/TimerProgress';
import { EjercicioAnimacion } from '../features/rehabilitacion/components/EjercicioAnimacion';
import { EjercicioListItem } from '../features/rehabilitacion/components/EjercicioListItem';
import { ConfigEjercicioModal } from '../features/rehabilitacion/components/ConfigEjercicioModal';
import { VoiceSelector } from '../features/rehabilitacion/components/VoiceSelector';

// Logic & Hooks
import { useRehabilitacion } from '../features/rehabilitacion/hooks/useRehabilitacion';
import { styles } from '../features/rehabilitacion/styles/rehabilitacion.styles';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';
import { Texts } from '../constants/texts';
import { useToastStore } from '../store/useToastStore';
import { pacientesService } from '../services/pacientes.service';
import { Paciente } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RehabilitacionScreen() {
  const { id } = useLocalSearchParams();
  const pacienteId = (id as string) || ""; 

  const { 
    prescripciones, seguimientos, isLoading: isRehabLoading, registrarActividad, uploadVideo 
  } = useRehabilitacion(pacienteId);
  const { showToast } = useToastStore();

  // States
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [activeEx, setActiveEx] = useState<any>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentRep, setCurrentRep] = useState(1);
  const [currentSerie, setCurrentSerie] = useState(1);
  const [seconds, setSeconds] = useState(0);
  const [totalActiveSeconds, setTotalActiveSeconds] = useState(0);
  const [showConfig, setShowConfig] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  // Config States
  const [configSesiones, setConfigSesiones] = useState(3);
  const [configMins, setConfigMins] = useState(5);
  const [configSecs, setConfigSecs] = useState(0);
  const [configRestMins, setConfigRestMins] = useState(0);
  const [configRestSecs, setConfigRestSecs] = useState(30);
  const [isResting, setIsResting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Voice States
  const [availableVoices, setAvailableVoices] = useState<Speech.Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<Speech.Voice | null>(null);

  useEffect(() => {
    loadVoices();
    loadPaciente();
    checkConsent();
    return () => { Speech.stop(); };
  }, []);

  const checkConsent = async () => {
    try {
      const accepted = await SecureStore.getItemAsync('rehab_consent_accepted');
      if (accepted === 'true') {
        setConsentAccepted(true);
      }
    } catch (e) {
      console.error("Error al cargar consentimiento:", e);
    }
  };

  const loadPaciente = async () => {
    if (!pacienteId) return;
    try {
      const data = await pacientesService.getPacienteById(pacienteId);
      setPaciente(data);
    } catch (e) {
      console.error("Error cargando paciente:", e);
    }
  };

  const loadVoices = async () => {
    const voices = await Speech.getAvailableVoicesAsync();
    const esVoices = voices.filter(v => v.language.includes('es'));
    setAvailableVoices(esVoices);
    if (esVoices.length > 0) setSelectedVoice(esVoices[0]);
  };

  // Efecto que maneja el incremento de los segundos (reloj principal)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    // Si la sesión está activa y no está en pausa, corremos el reloj
    if (sessionActive && !isPaused) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
        if (!isResting) {
          setTotalActiveSeconds(prev => prev + 1);
        }
      }, 1000);
    }

    // Al desmontar, pausar o cerrar, limpiamos el intervalo para que no hayan bugs de tiempo
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionActive, isPaused, isResting]);

  useEffect(() => {
    if (!sessionActive || isPaused) return;

    const totalActiveTime = configMins * 60 + configSecs;
    const totalRestTime = configRestMins * 60 + configRestSecs;

    if (!isResting && seconds >= totalActiveTime) {
      if (currentSerie < configSesiones) {
        // Start rest
        setIsResting(true);
        setSeconds(0);
        speak(`Sesión completada. Descansa por ${configRestMins > 0 ? configRestMins + ' minutos y ' : ''}${configRestSecs} segundos.`);
      } else {
        // Finish completely
        handleFinishSession();
      }
    } else if (isResting && seconds >= totalRestTime) {
      // End rest, start next session
      setIsResting(false);
      setSeconds(0);
      setCurrentSerie(s => s + 1);
      speak(`Descanso finalizado. Iniciando sesión ${currentSerie + 1} de ${configSesiones}.`);
    }
  }, [seconds, isResting, sessionActive, isPaused]);

  const handleSelectEjercicio = (ex: any) => {
    setActiveEx(ex);
    setShowConfig(true);
  };

  const handleStartSession = () => {
    setShowConfig(false);
    setSessionActive(true);
    setSeconds(0);
    setTotalActiveSeconds(0);
    setCurrentRep(1);
    setCurrentSerie(1);
    setIsPaused(false); // Make sure it's not paused
    speak(`Iniciando ${activeEx.ejercicio.nombre}. ${activeEx.ejercicio.descripcion || ''}. Realiza el ejercicio por ${configMins} minutos y ${configSecs} segundos en ${configSesiones} sesiones.`);
  };

  const speak = (text: string) => {
    if (isMuted) {
      Speech.stop();
      return;
    }
    if (selectedVoice) {
      Speech.speak(text, { voice: selectedVoice.identifier, rate: 0.9 });
    }
  };

  const handleFinishSession = () => {
    Speech.stop();
    setSessionActive(false);
    setIsResting(false);
    setIsPaused(false);

    // Regla de negocio: Solo registrar si se hizo al menos 1 minuto (60s)
    // a menos que la sesión total configurada sea menor a 1 minuto.
    const totalConfiguredSeconds = (configMins * 60 + configSecs) * configSesiones;
    const minimumRequired = Math.min(60, totalConfiguredSeconds);

    if (totalActiveSeconds < minimumRequired) {
      showToast('Sesión muy corta', 'Debes realizar al menos 1 minuto para que cuente como completado.', 'info');
      setActiveEx(null);
      return;
    }

    registrarActividad({
      ejercicioId: activeEx.ejercicio_id,
      duracionSegundos: totalActiveSeconds
    });

    // No llamamos a showToast aquí porque useRehabilitacion ya muestra uno al tener éxito
    setActiveEx(null);
  };

  const handleOpenVideoRecorder = () => {
    if (consentAccepted) {
      handleCaptureVideo();
    } else {
      setShowConsent(true);
    }
  };

  const handleAcceptConsent = async (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      try {
        await SecureStore.setItemAsync('rehab_consent_accepted', 'true');
        setConsentAccepted(true);
      } catch (e) {
        console.error("Error al guardar consentimiento:", e);
      }
    }
    setShowConsent(false);
    // Pequeño delay para que el modal se cierre completamente antes de abrir la cámara
    setTimeout(() => {
      handleCaptureVideo();
    }, 300);
  };

  const handleCaptureVideo = () => {
    // Abrimos nuestra pantalla de grabación propia (no usa expo-image-picker)
    setShowVideoRecorder(true);
  };

  const handleVideoRecorded = (uri: string) => {
    setShowVideoRecorder(false);
    if (uri && activeEx) {
      // activeEx.id es el UUID de la prescripción — lo que la tabla espera
      uploadVideo(uri, activeEx.id, setIsUploading);
      setActiveEx(null);
    }
  };

  if (!pacienteId) return <View style={styles.center}><Text style={{color: '#FFF'}}>No se seleccionó ningún paciente</Text></View>;
  if (isRehabLoading || !paciente) return <View style={styles.center}><Text style={{color: '#FFF'}}>{Texts.common.loading}</Text></View>;

  return (
    <LinearGradient colors={['#090D1F', '#1A1B35']} style={styles.gradient}>
      <StatusBar style="light" />
      
      {/* Header Fijo */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          activeOpacity={0.7}
          onPress={() => {
            Speech.stop();
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/progreso');
            }
          }}
        >
          <Ionicons name="chevron-back" size={28} color={Colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.topTitle}>Mi Rehabilitación</Text>

        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity 
            style={styles.secondaryBtn} 
            onPress={() => {
              if (!isMuted) Speech.stop();
              setIsMuted(!isMuted);
            }}
          >
            <Ionicons 
              name={isMuted ? "volume-mute-outline" : "volume-high-outline"} 
              size={20} 
              color={isMuted ? Colors.accent : Colors.primary} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryBtn}
            onPress={() => router.push({ pathname: '/evolucion', params: { pacienteId } })}
          >
            <Ionicons name="stats-chart" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!activeEx ? (
          <>
            {/* Cabecera del Bebé Dinámica */}
            <View style={styles.babyHeader}>
              <View style={styles.avatarMini}>
                <Text style={styles.avatarMiniText}>
                  {paciente.nombreCompleto?.charAt(0).toUpperCase() || 'B'}
                </Text>
              </View>
              <View>
                <Text style={styles.babyName}>{paciente.nombreCompleto}</Text>
                <Text style={styles.instruction}>ID: {paciente.codigoPaciente}</Text>
              </View>
            </View>

            {/* Selector de Voz Modular */}
            <VoiceSelector 
              availableVoices={availableVoices}
              selectedVoice={selectedVoice}
              onSelectVoice={setSelectedVoice}
            />

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Ejercicios de hoy</Text>
              <View style={styles.infoBadge}>
                <Text style={styles.infoBadgeText}>{prescripciones?.length || 0} ASIGNADOS</Text>
              </View>
            </View>

            {prescripciones?.map((item: any) => (
              <EjercicioListItem 
                key={item.id}
                prescripcion={item}
                onPress={() => setActiveEx(item)}
                seguimiento={seguimientos?.[item.ejercicio_id]}
              />
            ))}
          </>
        ) : !sessionActive ? (
          /* VISTA DE PREVISIÓN DEL EJERCICIO */
          <View style={{ gap: 20 }}>
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
              onPress={() => {
                Speech.stop();
                setActiveEx(null);
              }}
            >
              <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
              <Text style={{ color: Colors.textSecondary, marginLeft: 8 }}>Volver a la lista</Text>
            </TouchableOpacity>

            <View style={styles.activeHeader}>
              <Text style={styles.activeTitle}>{activeEx?.ejercicio.nombre}</Text>
              <Text style={[styles.activeSub, { color: Colors.textSecondary }]}>
                Frecuencia: {activeEx?.frecuencia} veces por semana
              </Text>
            </View>

            <View style={styles.videoCard}>
              <EjercicioAnimacion ex={activeEx?.ejercicio} />
            </View>

            <Text style={{ color: Colors.textSecondary, fontSize: 14, lineHeight: 22, paddingHorizontal: 10 }}>
              {activeEx?.ejercicio.descripcion}
            </Text>

            <PrimaryButton 
              title="Configurar Sesión"
              onPress={() => setShowConfig(true)}
              style={styles.mainBtn}
              icon="time-outline"
            />

            {/* Botón de video opcional — discreto y sin presión */}
            <TouchableOpacity style={styles.videoBtn} onPress={handleOpenVideoRecorder}>
              <Ionicons name="videocam-outline" size={20} color={Colors.textSecondary} />
              <View>
                <Text style={[styles.videoBtnText, { color: Colors.textSecondary }]}>Grabar video para el médico</Text>
                <Text style={{ color: Colors.textMuted, fontSize: 11 }}>Opcional • Solo las primeras veces</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          /* VISTA ACTIVA DEL EJERCICIO */
          <View style={{ gap: 20 }}>
            <View style={styles.activeHeader}>
              <Text style={styles.activeTitle}>{activeEx?.ejercicio.nombre}</Text>
              <Text style={[styles.activeSub, { color: isResting ? Colors.accent : Colors.primary }]}>
                {isResting 
                  ? `DESCANSO • ${configRestMins}m ${configRestSecs}s`
                  : `Sesión ${currentSerie} de ${configSesiones} • Tiempo ${configMins}m ${configSecs}s`
                }
              </Text>
            </View>

            <View style={styles.videoCard}>
              <EjercicioAnimacion ex={activeEx?.ejercicio} />
            </View>

            <View style={styles.timerContainer}>
              <TimerProgress 
                timeLeft={seconds} 
                totalTime={isResting 
                  ? (configRestMins * 60 + configRestSecs || 30)
                  : (configMins * 60 + configSecs || 60)
                } 
                color={isResting ? Colors.accent : Colors.primary}
                countdown={null}
              />
            </View>

            <View style={{ alignItems: 'center' }}>
              <PrimaryButton 
                title={isPaused ? "Reanudar" : "Pausar Sesión"}
                onPress={() => {
                  if (!isPaused) Speech.stop();
                  setIsPaused(!isPaused);
                }}
                style={styles.mainBtn}
                icon={isPaused ? "play" : "pause"}
              />
              <TouchableOpacity style={styles.videoBtn} onPress={handleFinishSession}>
                <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                <Text style={[styles.videoBtnText, { color: Colors.primary }]}>Finalizar Sesión</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modales Modulares */}
      <ConfigEjercicioModal 
        visible={showConfig}
        ejercicioName={activeEx?.ejercicio.nombre}
        sesiones={configSesiones}
        setSesiones={setConfigSesiones}
        mins={configMins}
        setMins={setConfigMins}
        secs={configSecs}
        setSecs={setConfigSecs}
        restMins={configRestMins}
        setRestMins={setConfigRestMins}
        restSecs={configRestSecs}
        setRestSecs={setConfigRestSecs}
        totalTime={configSesiones * (configMins * 60 + configSecs)}
        onClose={() => setShowConfig(false)}
        onStart={handleStartSession}
      />

      <ConsentimientoLegalModal 
        visible={showConsent}
        onAccept={handleAcceptConsent}
        onCancel={() => {
          setShowConsent(false);
          setActiveEx(null);
        }}
      />

      <VideoRecorderScreen
        visible={showVideoRecorder}
        maxDurationSeconds={30}
        onVideoRecorded={handleVideoRecorded}
        onCancel={() => {
          setShowVideoRecorder(false);
          setActiveEx(null);
        }}
      />

      {/* Modal de Carga (Subida de Video) */}
      <Modal visible={isUploading} transparent>
        <View style={styles.loadingOverlay}>
          <GlassContainer intensity={40} style={styles.loadingContent}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Subiendo video...</Text>
            <Text style={styles.loadingSub}>Esto puede tardar unos segundos</Text>
          </GlassContainer>
        </View>
      </Modal>
    </LinearGradient>
  );
}
