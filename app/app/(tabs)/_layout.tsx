import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius } from '../../src/constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View style={styles.iconWrapper}>
      {focused && (
        <LinearGradient
          colors={[Colors.primaryGlow, 'transparent']}
          style={styles.iconGlow}
        />
      )}
      <Ionicons
        name={focused ? name : (`${name}-outline` as IconName)}
        size={24}
        color={focused ? Colors.primary : Colors.textMuted}
      />
    </View>
  );
}

import { useAppStore } from '../../src/store/useAppStore';

export default function TabsLayout() {
  const { user } = useAppStore();

  if (!user) {
    return <View />;
  }

  const isMedico = user.role === 'medico';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarShowLabel: false,
        tabBarBackground: () => (
          <LinearGradient
            colors={['#0D1225EE', '#090D1FEE']}
            style={StyleSheet.absoluteFill}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="pacientes"
        options={{
          title: 'Pacientes',
          href: isMedico ? '/pacientes' : null,
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cargar-imagen"
        options={{
          href: isMedico ? '/cargar-imagen' : null,
          tabBarIcon: ({ focused }) => <TabIcon name="scan" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="analisis"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="nuevo-paciente"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="ajustar-puntos"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="paciente-detalle"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="evolucion"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="progreso"
        options={{
          title: 'Resultados',
          href: !isMedico ? '/progreso' : null,
          tabBarIcon: ({ focused }) => <TabIcon name="document-text" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="rehabilitacion"
        options={{
          title: 'Rehabilitación',
          href: !isMedico ? '/rehabilitacion' : null,
          tabBarIcon: ({ focused }) => <TabIcon name="fitness" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="configuracion"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    backgroundColor: 'transparent',
    borderTopColor: Colors.borderDefault,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 85 : 65,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: Radius.round,
  },
  iconGlow: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: Radius.round,
  },
});
