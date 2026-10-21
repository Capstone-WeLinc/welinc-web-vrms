import api from './axios';

export interface CostTrend { month: string; repair_count: number; total_spend: number; cumulative_spend: number; }
export interface VehicleKpi { vehicle_plate: string; vehicle_model: string; total_repairs: number; total_parts_cost: number; avg_repair_cost: number; latest_repair_date: string | null; }
export interface AnalyticsSummary { total_spend: number; total_repairs: number; total_vehicles: number; avg_cost_per_repair: number; }
export interface StatusBreakdown { status: string; count: number; }
export interface GarageCost { garage: string; repair_count: number; total_spend: number; }
export interface Aging { bucket: string; count: number; }
export interface Velocity { date: string; count: number; }
export interface IssueFreq { description: string; occurrence_count: number; }
export interface AiStats {
  total_interactions: number;
  models_used: Record<string, number>;
  satisfaction: { avg_rating: number; helpful_count: number; total_feedback: number; satisfaction_rate: number; };
}

interface ListResponse<T> { data?: T[] }

async function getList<T>(path: string): Promise<T[]> {
  const response = await api.get<ListResponse<T>>(path);
  return response.data.data ?? [];
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const response = await api.get<AnalyticsSummary>('/analytics/summary');
  return response.data;
}

export const getCostTrends = () => getList<CostTrend>('/analytics/cost-trends');
export const getVehicleKpis = () => getList<VehicleKpi>('/analytics/vehicle-kpis');
export const getStatusBreakdown = () => getList<StatusBreakdown>('/analytics/status-breakdown');
export const getGarageCosts = () => getList<GarageCost>('/analytics/garage-costs');
export const getAging = () => getList<Aging>('/analytics/aging');
export const getVelocity = () => getList<Velocity>('/analytics/velocity');
export const getIssueFrequency = () => getList<IssueFreq>('/analytics/issue-frequency');

export async function getAiStats(): Promise<AiStats> {
  const response = await api.get<AiStats>('/ai/stats');
  return response.data;
}
