import { create } from 'zustand';
import { Paciente, Analisis, User } from '../types';

interface AppState {
  user: User | null;
  pacienteActual: Paciente | null;
  analisisActual: Analisis | null;
  
  setUser: (user: User | null) => void;
  setPacienteActual: (paciente: Paciente | null) => void;
  setAnalisisActual: (analisis: Analisis | null) => void;
  limpiarEstado: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  pacienteActual: null,
  analisisActual: null,
  
  setUser: (user) => set({ user }),
  setPacienteActual: (paciente) => set({ pacienteActual: paciente }),
  setAnalisisActual: (analisis) => set({ analisisActual: analisis }),
  
  limpiarEstado: () => set({ user: null, pacienteActual: null, analisisActual: null }),
}));

