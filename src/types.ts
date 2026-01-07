// Core type definitions for the Neuro-Somatic Feedback App

export interface User {
  id: string;
  name: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  startTime: string;
  endTime: string;
  duration: number; // ms
  flowStateTime: number; // ms in target state
  longestStreak: number; // ms longest continuous
  avgCoherence: number; // 0-1
  coherenceHistory: number[]; // time-series for graph
}

export interface BrainwaveBands {
  delta: number;
  theta: number;
  alpha: number;
  beta: number;
  gamma: number;
}

export interface MuseState {
  connected: boolean;
  connectionMode: 'bluetooth' | 'osc' | null;
  deviceName: string | null;
  touching: boolean;
  connectionQuality: number;
  bands: BrainwaveBands;
  bandsSmooth: BrainwaveBands;
  relaxationIndex: number;
  meditationIndex: number;
  focusIndex: number;
}

export interface FlowState {
  isActive: boolean;
  sustainedMs: number;
  betaAlphaRatio: number;
  signalVariance: number;
  noiseLevel: number;
}

export type EntrainmentType = 'binaural' | 'isochronic' | 'none';

export interface AudioSettings {
  entrainmentType: EntrainmentType;
  entrainmentEnabled: boolean;
  entrainmentVolume: number;
  rewardEnabled: boolean;
  rewardVolume: number;
}

// Threshold settings for Flow State detection
export interface ThresholdSettings {
  coherenceThreshold: number; // 0-1, default 0.7 (70%)
  timeThreshold: number; // ms, default 5000 (5 seconds)
}

// Binaural beat presets
export type BinauralPresetName = 'delta' | 'theta' | 'alpha' | 'beta' | 'custom';

export interface BinauralPreset {
  name: BinauralPresetName;
  label: string;
  beatFrequency: number; // Hz
  carrierFrequency: number; // Hz
  description: string;
}

// Isochronic tones (multiple simultaneous voices)
export interface IsochronicTone {
  id: string;
  carrierFreq: number; // Hz - audio tone frequency
  pulseFreq: number; // Hz - on/off modulation frequency
  volume: number; // 0-1
  enabled: boolean;
}

export type IsochronicPresetName = 'single_focus' | 'dual_layer_focus' | 'deep_relax';

export interface IsochronicPreset {
  name: IsochronicPresetName;
  label: string;
  description: string;
  tones: Omit<IsochronicTone, 'id'>[];
}

// Electrode contact quality (from Muse horseshoe indicator)
export type ElectrodeQuality = 'good' | 'medium' | 'poor' | 'off';

export interface ElectrodeStatus {
  tp9: ElectrodeQuality;  // Left ear
  af7: ElectrodeQuality;  // Left forehead
  af8: ElectrodeQuality;  // Right forehead
  tp10: ElectrodeQuality; // Right ear
}

export type AppScreen = 'setup' | 'session' | 'summary';

export interface SessionStats {
  totalLength: number;
  longestStreak: number;
  avgCoherence: number;
  flowStatePercent: number;
  achievementScore: string;
}
