import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  createSession,
  upsertInputData,
  getRiskScore,
  getChatHistory,
} from '../services/api';
import type {
  GeneralInfo,
  HistoricalExperience,
  Exposure,
  RiskScoreResponse,
  ChatMessage,
} from '../types';

const SESSION_STORAGE_KEY = 'insurance_session_id';

interface SessionContextValue {
  sessionId: string;
  generalInfo: GeneralInfo;
  historicalExperience: HistoricalExperience;
  exposure: Exposure;
  riskScore: RiskScoreResponse | null;
  chatMessages: ChatMessage[];
  isLoadingRisk: boolean;

  setGeneralInfo: (data: Partial<GeneralInfo>) => void;
  setHistoricalExperience: (data: Partial<HistoricalExperience>) => void;
  setExposure: (data: Partial<Exposure>) => void;
  saveSection: (section: 'general_info' | 'historical_experience' | 'exposure') => Promise<void>;
  refreshRiskScore: () => Promise<void>;
  addChatMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (text: string) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string>('');
  const [generalInfo, setGeneralInfoState] = useState<GeneralInfo>({});
  const [historicalExperience, setHistoricalExperienceState] = useState<HistoricalExperience>({});
  const [exposure, setExposureState] = useState<Exposure>({});
  const [riskScore, setRiskScore] = useState<RiskScoreResponse | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (stored) {
      setSessionId(stored);
      getChatHistory(stored).then(setChatMessages).catch(() => {});
    } else {
      createSession().then((s) => {
        localStorage.setItem(SESSION_STORAGE_KEY, s.id);
        setSessionId(s.id);
      });
    }
  }, []);

  const setGeneralInfo = useCallback((data: Partial<GeneralInfo>) => {
    setGeneralInfoState((prev) => ({ ...prev, ...data }));
  }, []);

  const setHistoricalExperience = useCallback((data: Partial<HistoricalExperience>) => {
    setHistoricalExperienceState((prev) => ({ ...prev, ...data }));
  }, []);

  const setExposure = useCallback((data: Partial<Exposure>) => {
    setExposureState((prev) => ({ ...prev, ...data }));
  }, []);

  const saveSection = useCallback(
    async (section: 'general_info' | 'historical_experience' | 'exposure') => {
      if (!sessionId) return;
      const payload: Parameters<typeof upsertInputData>[0] = { session_id: sessionId };
      if (section === 'general_info') payload.general_info = generalInfo;
      if (section === 'historical_experience') payload.historical_experience = historicalExperience;
      if (section === 'exposure') payload.exposure = exposure;
      await upsertInputData(payload);
    },
    [sessionId, generalInfo, historicalExperience, exposure]
  );

  const refreshRiskScore = useCallback(async () => {
    if (!sessionId) return;
    setIsLoadingRisk(true);
    try {
      const result = await getRiskScore(sessionId);
      setRiskScore(result);
    } catch (err) {
      console.error('Failed to get risk score:', err);
    } finally {
      setIsLoadingRisk(false);
    }
  }, [sessionId]);

  const addChatMessage = useCallback((msg: ChatMessage) => {
    setChatMessages((prev) => [...prev, msg]);
  }, []);

  const updateLastAssistantMessage = useCallback((text: string) => {
    setChatMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'assistant') {
        return [...prev.slice(0, -1), { ...last, content: text }];
      }
      return prev;
    });
  }, []);

  return (
    <SessionContext.Provider
      value={{
        sessionId,
        generalInfo,
        historicalExperience,
        exposure,
        riskScore,
        chatMessages,
        isLoadingRisk,
        setGeneralInfo,
        setHistoricalExperience,
        setExposure,
        saveSection,
        refreshRiskScore,
        addChatMessage,
        updateLastAssistantMessage,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
