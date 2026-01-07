// React hook for Muse EEG data

import { useState, useEffect, useCallback, useRef } from 'react';
import { museHandler, MuseHandler } from '../lib/muse-handler';
import { FlowStateDetector, calculateCoherence, getCoherenceZone } from '../lib/flow-state';
import type { MuseState, FlowState, ThresholdSettings, ElectrodeStatus, ElectrodeQuality } from '../types';

export interface UseMuseReturn {
  state: MuseState;
  flowState: FlowState;
  coherence: number;
  coherenceZone: 'flow' | 'stabilizing' | 'noise';
  coherenceHistory: number[];
  electrodeStatus: ElectrodeStatus;
  isBluetoothAvailable: boolean;
  connectBluetooth: () => Promise<void>;
  connectOSC: (url?: string) => Promise<void>;
  disconnect: () => void;
  setThresholdSettings: (settings: ThresholdSettings) => void;
  error: string | null;
}

const INITIAL_STATE: MuseState = {
  connected: false,
  connectionMode: null,
  deviceName: null,
  touching: false,
  connectionQuality: 0,
  bands: { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 },
  bandsSmooth: { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0 },
  relaxationIndex: 0,
  meditationIndex: 0,
  focusIndex: 0,
};

const INITIAL_FLOW_STATE: FlowState = {
  isActive: false,
  sustainedMs: 0,
  betaAlphaRatio: 1,
  signalVariance: 0,
  noiseLevel: 0,
};

const INITIAL_ELECTRODE_STATUS: ElectrodeStatus = {
  tp9: 'off',
  af7: 'off',
  af8: 'off',
  tp10: 'off',
};

// Convert horseshoe value (1-4) to electrode quality
function horseshoeToQuality(value: number): ElectrodeQuality {
  if (value === 1) return 'good';
  if (value === 2) return 'medium';
  if (value === 3) return 'poor';
  return 'off';
}

export function useMuse(): UseMuseReturn {
  const [state, setState] = useState<MuseState>(INITIAL_STATE);
  const [flowState, setFlowState] = useState<FlowState>(INITIAL_FLOW_STATE);
  const [coherence, setCoherence] = useState(0);
  const [coherenceHistory, setCoherenceHistory] = useState<number[]>([]);
  const [electrodeStatus, setElectrodeStatus] = useState<ElectrodeStatus>(INITIAL_ELECTRODE_STATUS);
  const [error, setError] = useState<string | null>(null);

  const flowStateDetector = useRef(new FlowStateDetector({}));
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Update loop
  useEffect(() => {
    const updateLoop = () => {
      if (museHandler.connected) {
        const museState = museHandler.getState();
        setState(museState);

        // Update electrode status from horseshoe data
        const horseshoe = museHandler.getElectrodeQuality();
        setElectrodeStatus({
          tp9: horseshoeToQuality(horseshoe[0]),
          af7: horseshoeToQuality(horseshoe[1]),
          af8: horseshoeToQuality(horseshoe[2]),
          tp10: horseshoeToQuality(horseshoe[3]),
        });

        // Calculate motion level from accelerometer
        const motionLevel = Math.abs(museHandler.accX) + Math.abs(museHandler.accY) + Math.abs(museHandler.accZ);
        const normalizedMotion = Math.min(1, motionLevel / 30);

        // Update flow state detector
        const fsState = flowStateDetector.current.update(museState.bandsSmooth, normalizedMotion);
        setFlowState(fsState);

        // Calculate coherence
        const coh = calculateCoherence(museState.bandsSmooth, fsState.signalVariance);
        setCoherence(coh);

        // Update history (keep last 300 points ~= 5 min at 1Hz sample)
        setCoherenceHistory((prev) => {
          const newHistory = [...prev, coh];
          // Only add once per second approximately
          if (newHistory.length > 300) {
            return newHistory.slice(-300);
          }
          return newHistory;
        });
      }

      animationFrameRef.current = requestAnimationFrame(updateLoop);
    };

    animationFrameRef.current = requestAnimationFrame(updateLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const connectBluetooth = useCallback(async () => {
    try {
      setError(null);
      await museHandler.connectBluetooth();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      throw err;
    }
  }, []);

  const connectOSC = useCallback(async (url?: string) => {
    try {
      setError(null);
      await museHandler.connectOSC(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      throw err;
    }
  }, []);

  const disconnect = useCallback(() => {
    museHandler.disconnect();
    setState(INITIAL_STATE);
    setFlowState(INITIAL_FLOW_STATE);
    setElectrodeStatus(INITIAL_ELECTRODE_STATUS);
    setCoherence(0);
    flowStateDetector.current.reset();
  }, []);

  const setThresholdSettings = useCallback((settings: ThresholdSettings) => {
    flowStateDetector.current.setConfig({
      sustainedMs: settings.timeThreshold,
      // Convert coherence threshold to beta/alpha ratio threshold
      // Higher coherence threshold = stricter condition = lower ratio threshold
      betaAlphaRatioThreshold: 1.0 - (settings.coherenceThreshold - 0.7) * 2,
    });
  }, []);

  return {
    state,
    flowState,
    coherence,
    coherenceZone: getCoherenceZone(coherence),
    coherenceHistory,
    electrodeStatus,
    isBluetoothAvailable: MuseHandler.isBluetoothAvailable(),
    connectBluetooth,
    connectOSC,
    disconnect,
    setThresholdSettings,
    error,
  };
}
