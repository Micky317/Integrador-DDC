import { View } from 'react-native';

// El index se mantiene vacío para evitar saltos de pantalla (flickering)
// La lógica de redirección principal reside en _layout.tsx
export default function Index() {
  return <View style={{ flex: 1, backgroundColor: '#090D1F' }} />;
}
