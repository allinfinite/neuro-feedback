// React hook for audio engine control

import { useState, useCallback, useEffect } from 'react';
import { audioEngine, BINAURAL_PRESETS, ISOCHRONIC_PRESETS } from '../lib/audio-engine';
import type {
  EntrainmentType,
  BinauralPresetName,
  IsochronicPresetName,
  IsochronicTone,
} from '../types';

export interface UseAudioReturn {
  entrainmentType: EntrainmentType;
  entrainmentEnabled: boolean;
  entrainmentVolume: number;
  binauralPreset: BinauralPresetName;
  binauralBeatFreq: number;
  binauralCarrierFreq: number;
  isochronicPreset: IsochronicPresetName;
  isochronicTones: IsochronicTone[];
  isRewardPlaying: boolean;
  setEntrainmentType: (type: EntrainmentType) => void;
  setEntrainmentEnabled: (enabled: boolean) => void;
  setEntrainmentVolume: (volume: number) => void;
  setBinauralPreset: (preset: BinauralPresetName) => void;
  setBinauralBeatFreq: (freq: number) => void;
  setBinauralCarrierFreq: (freq: number) => void;
  setIsochronicPreset: (preset: IsochronicPresetName) => void;
  setIsochronicTones: (tones: IsochronicTone[]) => void;
  addIsochronicTone: (tone: Omit<IsochronicTone, 'id'>) => void;
  updateIsochronicTone: (id: string, partial: Partial<IsochronicTone>) => void;
  removeIsochronicTone: (id: string) => void;
  startReward: () => Promise<void>;
  stopReward: () => void;
  init: () => Promise<void>;
  dispose: () => void;
}

// Export presets for use in components
export { BINAURAL_PRESETS };

export function useAudio(): UseAudioReturn {
  const [entrainmentType, setEntrainmentTypeState] = useState<EntrainmentType>('none');
  const [entrainmentEnabled, setEntrainmentEnabledState] = useState(false);
  const [entrainmentVolume, setEntrainmentVolumeState] = useState(0.3);
  const [binauralPreset, setBinauralPresetState] = useState<BinauralPresetName>('alpha');
  const [binauralBeatFreq, setBinauralBeatFreqState] = useState(10);
  const [binauralCarrierFreq, setBinauralCarrierFreqState] = useState(200);
  const [isochronicPreset, setIsochronicPresetState] = useState<IsochronicPresetName>('single_focus');
  const [isochronicTones, setIsochronicTonesState] = useState<IsochronicTone[]>(
    ISOCHRONIC_PRESETS.single_focus.tones.map((t, index) => ({
      ...t,
      id: `single_focus-${index}`,
    }))
  );
  const [isRewardPlaying, setIsRewardPlaying] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const init = useCallback(async () => {
    if (!isInitialized) {
      await audioEngine.init();
      setIsInitialized(true);
    }
  }, [isInitialized]);

  const setEntrainmentType = useCallback(
    async (type: EntrainmentType) => {
      setEntrainmentTypeState(type);
      if (isInitialized && entrainmentEnabled) {
        if (type === 'none') {
          audioEngine.stopEntrainment();
        } else {
          await audioEngine.startEntrainment(type);
        }
      }
    },
    [isInitialized, entrainmentEnabled]
  );

  const setEntrainmentEnabled = useCallback(
    async (enabled: boolean) => {
      setEntrainmentEnabledState(enabled);
      if (!isInitialized) {
        await init();
      }

      if (enabled && entrainmentType !== 'none') {
        await audioEngine.startEntrainment(entrainmentType);
      } else {
        audioEngine.stopEntrainment();
      }
    },
    [isInitialized, entrainmentType, init]
  );

  const setEntrainmentVolume = useCallback((volume: number) => {
    setEntrainmentVolumeState(volume);
    audioEngine.setEntrainmentVolume(volume);
  }, []);

  const setBinauralPreset = useCallback((preset: BinauralPresetName) => {
    setBinauralPresetState(preset);
    if (preset !== 'custom') {
      const presetConfig = BINAURAL_PRESETS[preset];
      setBinauralBeatFreqState(presetConfig.beatFrequency);
      setBinauralCarrierFreqState(presetConfig.carrierFrequency);
      audioEngine.applyBinauralPreset(preset);
    }
  }, []);

  const setBinauralBeatFreq = useCallback((freq: number) => {
    setBinauralBeatFreqState(freq);
    setBinauralPresetState('custom');
    audioEngine.setBinauralBeatFreq(freq);
  }, []);

  const setBinauralCarrierFreq = useCallback((freq: number) => {
    setBinauralCarrierFreqState(freq);
    audioEngine.setBinauralCarrierFreq(freq);
  }, []);

  const setIsochronicPreset = useCallback((preset: IsochronicPresetName) => {
    setIsochronicPresetState(preset);
    const presetConfig = ISOCHRONIC_PRESETS[preset];
    if (!presetConfig) return;

    const tones: IsochronicTone[] = presetConfig.tones.map((t, index) => ({
      ...t,
      id: `${preset}-${index}`,
    }));

    setIsochronicTonesState(tones);
    audioEngine.applyIsochronicPreset(preset);
  }, []);

  const setIsochronicTones = useCallback((tones: IsochronicTone[]) => {
    setIsochronicTonesState(tones);
    audioEngine.setIsochronicTones(tones);
  }, []);

  const addIsochronicTone = useCallback((tone: Omit<IsochronicTone, 'id'>) => {
    setIsochronicPresetState('single_focus');
    setIsochronicTonesState((prev) => {
      const id = `custom-${Date.now()}-${prev.length}`;
      const updated = [...prev, { ...tone, id }];
      audioEngine.setIsochronicTones(updated);
      return updated;
    });
  }, []);

  const updateIsochronicTone = useCallback((id: string, partial: Partial<IsochronicTone>) => {
    setIsochronicTonesState((prev) => {
      const updated = prev.map((tone) => (tone.id === id ? { ...tone, ...partial } : tone));
      audioEngine.setIsochronicTones(updated);
      return updated;
    });
  }, []);

  const removeIsochronicTone = useCallback((id: string) => {
    setIsochronicTonesState((prev) => {
      const updated = prev.filter((tone) => tone.id !== id);
      audioEngine.setIsochronicTones(updated);
      return updated;
    });
  }, []);

  const startReward = useCallback(async () => {
    if (!isInitialized) {
      await init();
    }
    await audioEngine.startReward();
    setIsRewardPlaying(true);
  }, [isInitialized, init]);

  const stopReward = useCallback(() => {
    audioEngine.stopReward();
    setIsRewardPlaying(false);
  }, []);

  const dispose = useCallback(() => {
    audioEngine.dispose();
    setIsInitialized(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioEngine.dispose();
    };
  }, []);

  return {
    entrainmentType,
    entrainmentEnabled,
    entrainmentVolume,
    binauralPreset,
    binauralBeatFreq,
    binauralCarrierFreq,
    isochronicPreset,
    isochronicTones,
    isRewardPlaying,
    setEntrainmentType,
    setEntrainmentEnabled,
    setEntrainmentVolume,
    setBinauralPreset,
    setBinauralBeatFreq,
    setBinauralCarrierFreq,
    setIsochronicPreset,
    setIsochronicTones,
    addIsochronicTone,
    updateIsochronicTone,
    removeIsochronicTone,
    startReward,
    stopReward,
    init,
    dispose,
  };
}
