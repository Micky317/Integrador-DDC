import React from 'react';
import { Image } from 'react-native';
import { Ejercicio } from '../../../constants/ejercicios';
import { Assets } from '../../../constants/assets';

interface EjercicioAnimacionProps {
  ex: Ejercicio;
}

export const EjercicioAnimacion: React.FC<EjercicioAnimacionProps> = React.memo(({ ex }) => {
  if (!ex.id?.includes('ranita') && !ex.videoLocal) return null;
  
  return (
    <Image 
      source={ex.id?.includes('ranita') ? Assets.animations.rehab_ranita : ex.videoLocal} 
      style={{ width: '100%', height: '100%', borderRadius: 24 }} 
      resizeMode="cover" 
    />
  );
});
