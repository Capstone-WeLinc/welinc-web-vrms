import api from './axios';

// Spec 0013: analytics lives in backend-vrms at /vrms/analytics, read live. Peso fields are null
// unless the caller also holds ticket.costs.view (AC-5).
type Money = number | null;

export interface CostTrend { month: string; repair_count: number; total_spend: Money; cumulative_spend: Money; }
export interface VehicleKpi { vehicle_plate: string; vehicle_model: string; total_repairs: number; total_parts_cost: Money; avg_repair_cost: Money; latest_repair_date: string | null; }
export interface AnalyticsSummary { total_spend: Money; total_repairs: number; total_vehicles: number; avg_cost_per_repair: Money; }
export interface StatusBreakdown { status: string; count: number; }
export interface GarageCost { garage: string; repair_count: number; total_spend: Money; }
export interface Aging { bucket: string; count: number; }
export interface Velocity { date: string; count: number; }
export interface IssueFreq { description: string; occurrence_count: number; }
export interface AiStats {
  total_interactions: number;
  models_used: Record<string, number>;
  satisfaction: { avg_rating: number; helpful_count: number; total_feedback: number; satisfaction_rate: number; };
}

async function getList<T>(path: string): Promise<T[]> {
  const response = await api.get<{ data: T[] }>(`/vrms/analytics/${path}`);
  return response.data.data;
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const response = await api.get<AnalyticsSummary>('/vrms/analytics/summary');
  return response.data;
}

export const getCostTrends = () => getList<CostTrend>('cost-trends');
export const getVehicleKpis = () => getList<VehicleKpi>('vehicle-kpis');
export const getStatusBreakdown = () => getList<StatusBreakdown>('status-breakdown');
export const getGarageCosts = () => getList<GarageCost>('garage-costs');
export const getAging = () => getList<Aging>('aging');
export const getVelocity = () => getList<Velocity>('velocity');
export const getIssueFrequency = () => getList<IssueFreq>('issue-frequency');

export async function getAiStats(): Promise<AiStats> {
  const response = await api.get<AiStats>('/vrms/ai/stats');
  return response.data;
}
