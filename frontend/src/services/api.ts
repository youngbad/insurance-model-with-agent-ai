import axios from 'axios';
import type {
  SessionResponse,
  InsuranceInput,
  RiskScoreResponse,
  SuggestionResponse,
  ValidationResponse,
  GeneralInfo,
  HistoricalExperience,
  Exposure,
  ChatMessage,
} from '../types';

const BASE_URL = '/api';
const API_TIMEOUT_MS = 30000;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

// ── Sessions ───────────────────────────────────────────────────────────────────

export async function createSession(): Promise<SessionResponse> {
  const { data } = await api.post<SessionResponse>('/sessions');
  return data;
}

export async function getSession(sessionId: string): Promise<SessionResponse> {
  const { data } = await api.get<SessionResponse>(`/sessions/${sessionId}`);
  return data;
}

// ── Insurance Input Data ───────────────────────────────────────────────────────

export async function upsertInputData(payload: {
  session_id: string;
  general_info?: Partial<GeneralInfo>;
  historical_experience?: Partial<HistoricalExperience>;
  exposure?: Partial<Exposure>;
}): Promise<InsuranceInput> {
  const { data } = await api.post<InsuranceInput>('/input-data', payload);
  return data;
}

export async function getInputData(sessionId: string): Promise<InsuranceInput> {
  const { data } = await api.get<InsuranceInput>(`/input-data/${sessionId}`);
  return data;
}

// ── Risk Score ─────────────────────────────────────────────────────────────────

export async function getRiskScore(sessionId: string): Promise<RiskScoreResponse> {
  const { data } = await api.get<RiskScoreResponse>(`/risk-score/${sessionId}`);
  return data;
}

// ── Suggestions ────────────────────────────────────────────────────────────────

export async function getSuggestion(
  sessionId: string,
  field: string,
  context?: Record<string, unknown>
): Promise<SuggestionResponse> {
  const { data } = await api.post<SuggestionResponse>('/suggestions', {
    session_id: sessionId,
    field,
    context,
  });
  return data;
}

export async function getBulkSuggestions(
  sessionId: string,
  context?: Record<string, unknown>
): Promise<SuggestionResponse[]> {
  const { data } = await api.post<{ suggestions: SuggestionResponse[]; session_id: string }>(
    '/suggestions/bulk',
    { session_id: sessionId, context }
  );
  return data.suggestions;
}

// ── Validation ─────────────────────────────────────────────────────────────────

export async function validateField(
  field: string,
  value: unknown,
  context?: Record<string, unknown>
): Promise<ValidationResponse> {
  const { data } = await api.post<ValidationResponse>('/validate', {
    field,
    value,
    context,
  });
  return data;
}

// ── Tooltip ───────────────────────────────────────────────────────────────────

export async function getTooltip(field: string, industry?: string): Promise<string> {
  const { data } = await api.get<{ field: string; tooltip: string }>(
    `/tooltip/${field}`,
    { params: { industry } }
  );
  return data.tooltip;
}

// ── Chat History ───────────────────────────────────────────────────────────────

export async function getChatHistory(sessionId: string): Promise<ChatMessage[]> {
  const { data } = await api.get<ChatMessage[]>(`/chat/history/${sessionId}`);
  return data;
}

// ── Chat Streaming ─────────────────────────────────────────────────────────────

export function streamChat(
  sessionId: string,
  message: string,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): AbortController {
  const controller = new AbortController();

  fetch(`${BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, message }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        onError(`HTTP error ${response.status}`);
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) {
        onError('No response body');
        return;
      }
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const json = JSON.parse(line.slice(6));
              if (json.chunk) onChunk(json.chunk);
              if (json.done) onDone();
              if (json.error) onError(json.error);
            } catch {
              // ignore parse errors for incomplete lines
            }
          }
        }
      }
      onDone();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err.message || 'Stream error');
      }
    });

  return controller;
}
