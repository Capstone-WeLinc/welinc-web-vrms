import { isAxiosError } from 'axios';
import api from './axios';

// Spec 0013: AI diagnosis lives in backend-vrms at /vrms/ai. Shapes are camelCase.

export interface RecommendedPart {
  partName: string;
  /** Null without ticket.costs.view, or when no past part matches the name. */
  estCostPhp: number | null;
}

export interface DiagnosisResult {
  summary: string;
  predictedCategory: string;
  predictedPriority: string;
  estimatedHours: number;
  probableCauses: string[];
  recommendedParts: RecommendedPart[];
  safetyNote: string;
}

export interface SimilarCase {
  issueId: string;
  ticketId: string;
  repairNumber: string;
  description: string;
  /** 0 to 1. */
  similarity: number;
}

export interface HistoryItem {
  ticketId: string;
  repairNumber: string;
  status: string;
  closedAt: string | null;
  issues: string[];
}

export interface Diagnosis {
  id: string;
  ticketId: string;
  createdAt: string;
  model: string;
  confidence: 'High' | 'Moderate' | 'Low';
  latencyMs: number;
  symptom: string;
  similar: SimilarCase[];
  vehicleHistory: HistoryItem[];
  result: DiagnosisResult;
}

export interface DiagnosisFeedback {
  helpful: boolean;
  rating?: number;
  comment?: string;
}

// quiet: the panel shows AI_UNAVAILABLE itself, so no "sign in service" toast for its 503
export async function runDiagnosis(ticketId: string): Promise<Diagnosis> {
  const response = await api.post<Diagnosis>(`/vrms/ai/tickets/${ticketId}/diagnoses`, undefined, { quiet: true });
  return response.data;
}

export async function getLatestDiagnosis(ticketId: string): Promise<Diagnosis | null> {
  const response = await api.get<{ data: Diagnosis | null }>(`/vrms/ai/tickets/${ticketId}/diagnoses/latest`, { quiet: true });
  return response.data.data;
}

/** Stores or replaces the caller's one rating of a diagnosis. */
export async function sendDiagnosisFeedback(diagnosisId: string, feedback: DiagnosisFeedback) {
  await api.put(`/vrms/ai/diagnoses/${diagnosisId}/feedback`, feedback, { quiet: true });
}

/** The `code` and `retryAfterSeconds` of an AI error body, such as AI_UNAVAILABLE or AI_RATE_LIMITED. */
export function getAiError(err: unknown): { code?: string; retryAfterSeconds?: number } {
  if (!isAxiosError<{ code?: string; retryAfterSeconds?: number }>(err)) return {};
  return { code: err.response?.data?.code, retryAfterSeconds: err.response?.data?.retryAfterSeconds };
}
