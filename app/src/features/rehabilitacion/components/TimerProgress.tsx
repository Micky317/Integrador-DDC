import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Colors, Typography } from '../../../constants/theme';

interface TimerProgressProps {
  timeLeft: number;
  totalTime: number;
  color: string;
  countdown: number | null;
}

export const TimerProgress: React.FC<TimerProgressProps> = ({ timeLeft, totalTime, color, countdown }) => {
  const size = 200;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = countdown !== null ? 1 : timeLeft / totalTime;
  const strokeDashoffset = circumference - (progress * circumference);

  return (
    <View style={styles.timerCircleContainer}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle 
          cx={size / 2} 
          cy={size / 2} 
          r={radius} 
          stroke={color + '20'} 
          strokeWidth={strokeWidth} 
          fill="transparent" 
        />
        <Circle 
          cx={size / 2} 
          cy={size / 2} 
          r={radius} 
          stroke={color} 
          strokeWidth={strokeWidth} 
          fill="transparent" 
          strokeDasharray={circumference} 
          strokeDashoffset={strokeDashoffset} 
          strokeLinecap="round" 
        />
      </Svg>
      <View style={styles.timerTextOverlay}>
        <Text style={styles.timerNumber}>{countdown !== null ? countdown : timeLeft}</Text>
        <Text style={styles.timerLabel}>{countdown !== null ? 'Prepárate' : 'Segundos'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  timerCircleContainer: { width: 200, height: 200, justifyContent: 'center', alignItems: 'center' },
  timerTextOverlay: { position: 'absolute', alignItems: 'center' },
  timerNumber: { 
    color: '#FFF', 
    fontSize: 64, 
    fontFamily: Typography.fonts.bold 
  },
  timerLabel: { 
    color: 'rgba(255,255,255,0.4)', 
    fontSize: Typography.size.xs, 
    fontFamily: Typography.fonts.medium,
    textTransform: 'uppercase', 
    letterSpacing: 1 
  },
});
