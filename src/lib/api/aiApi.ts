import api from './axios';

export interface RecommendedPart {
  part_name: string;
  est_cost_php?: number | null;
}

export interface SimilarRepair {
  issue_id: string;
  ticket_id: string;
  description: string;
  similarity_score: number;
}

export interface AiDiagnosis {
  summary: string;
  predicted_category: string;
  predicted_priority: string;
  estimated_sla_hours: number;
  probable_causes: string[];
  recommended_parts: RecommendedPart[];
  safety_note: string;
  model_used: string;
}

export interface ContextLineage {
  vehicle_plate?: string | null;
  vehicle_history_count: number;
  vector_matches_count: number;
  similarity_avg: number;
  model_used: string;
  used_live_llm: boolean;
  confidence: 'High' | 'Moderate' | 'Low';
}

export interface DiagnosticResponse {
  symptom: string;
  similar_past_repairs: SimilarRepair[];
  vehicle_history: unknown[];
  ai_diagnosis: AiDiagnosis;
  context_lineage?: ContextLineage;
}

export interface DiagnoseRequest {
  symptom: string;
  ticket_id: string;
  vehicle_plate: string;
  vehicle_model: string;
  issues: string[];
}

export async function diagnoseRepair(payload: DiagnoseRequest): Promise<DiagnosticResponse> {
  const response = await api.post<DiagnosticResponse>('/ai/diagnose', payload);
  return response.data;
}

/** A rating of one AI diagnosis, from 1 to 5. */
export async function sendAiFeedback(payload: { ticket_id: string; helpful: boolean; rating: number; comment?: string }) {
  await api.post('/ai/feedback', { comment: '', ...payload });
}
