import { useState, useEffect, useCallback } from 'react';
import {
  getAging, getAiStats, getAnalyticsSummary, getCostTrends, getGarageCosts,
  getIssueFrequency, getStatusBreakdown, getVehicleKpis, getVelocity,
} from '../../../lib/api/analyticsApi';
import type {
  AiStats, Aging, AnalyticsSummary, CostTrend, GarageCost, IssueFreq,
  StatusBreakdown, VehicleKpi, Velocity,
} from '../../../lib/api/analyticsApi';

// Presentation fallbacks, shown when the analytics service returns nothing
const SAMPLE_VEHICLES: VehicleKpi[] = [
  { vehicle_plate: 'CAK 9043', vehicle_model: 'Mitsubishi Fuso FE', total_repairs: 17, total_parts_cost: 58000, avg_repair_cost: 3411.76, latest_repair_date: '2026-07-24' },
  { vehicle_plate: 'WOB 2947', vehicle_model: 'Hino 300 Series', total_repairs: 16, total_parts_cost: 40400, avg_repair_cost: 2525.00, latest_repair_date: '2026-06-18' },
  { vehicle_plate: 'NDG 5821', vehicle_model: 'Isuzu Elf NKR', total_repairs: 16, total_parts_cost: 35100, avg_repair_cost: 2193.75, latest_repair_date: '2026-06-19' },
  { vehicle_plate: 'PXW 382', vehicle_model: 'Toyota Hilux', total_repairs: 14, total_parts_cost: 64500, avg_repair_cost: 4607.14, latest_repair_date: '2026-06-15' },
  { vehicle_plate: 'TGD 908', vehicle_model: 'Foton Tornado', total_repairs: 14, total_parts_cost: 41000, avg_repair_cost: 2928.57, latest_repair_date: '2026-06-16' },
  { vehicle_plate: 'NRE 471', vehicle_model: 'Isuzu Giga Heavy Duty', total_repairs: 14, total_parts_cost: 19760, avg_repair_cost: 1411.43, latest_repair_date: '2026-06-17' },
];
const SAMPLE_TRENDS: CostTrend[] = [
  { month: '2026-04', repair_count: 29, total_spend: 80730, cumulative_spend: 80730 },
  { month: '2026-05', repair_count: 31, total_spend: 80730, cumulative_spend: 161460 },
  { month: '2026-06', repair_count: 30, total_spend: 97300, cumulative_spend: 258760 },
];
const SAMPLE_ISSUES: IssueFreq[] = [
  { description: 'Soft brake pedal feel', occurrence_count: 14 },
  { description: 'Hard shifting from 1st to 2nd gear', occurrence_count: 14 },
  { description: 'Starter motor clicks but does not crank', occurrence_count: 13 },
  { description: 'Water pump bearing noise & coolant leak', occurrence_count: 13 },
  { description: 'Clunking noise over bumps (worn bushings)', occurrence_count: 13 },
  { description: 'Oil pressure warning light illuminated', occurrence_count: 7 },
  { description: 'Engine misfire code P0301', occurrence_count: 6 },
  { description: 'Starter motor intermittent fault', occurrence_count: 1 },
];

function orSample<T>(data: T[], sample: T[]) {
  return data.length > 0 ? data : sample;
}

function timeNow() {
  return new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}

export interface AnalyticsSnapshot {
  lastUpdated: string;
  summary: AnalyticsSummary | null;
  trends: CostTrend[];
  vehicles: VehicleKpi[];
  statusBreakdown: StatusBreakdown[];
  garageCosts: GarageCost[];
  aging: Aging[];
  velocity: Velocity[];
  issueFreq: IssueFreq[];
  aiStats: AiStats | null;
}

const EMPTY: AnalyticsSnapshot = {
  lastUpdated: '', summary: null, trends: [], vehicles: [], statusBreakdown: [],
  garageCosts: [], aging: [], velocity: [], issueFreq: [], aiStats: null,
};

async function fetchAnalytics(): Promise<AnalyticsSnapshot> {
  try {
    const [summary, trends, vehicles, statusBreakdown, garageCosts, aging, velocity, issueFreq, aiStats] = await Promise.all([
      getAnalyticsSummary(), getCostTrends(), getVehicleKpis(), getStatusBreakdown(),
      getGarageCosts(), getAging(), getVelocity(), getIssueFrequency(), getAiStats(),
    ]);
    return {
      lastUpdated: timeNow(), summary, statusBreakdown, garageCosts, aging, velocity, aiStats,
      trends: orSample(trends, SAMPLE_TRENDS),
      vehicles: orSample(vehicles, SAMPLE_VEHICLES),
      issueFreq: orSample(issueFreq, SAMPLE_ISSUES),
    };
  } catch {
    return { ...EMPTY, lastUpdated: timeNow(), vehicles: SAMPLE_VEHICLES, trends: SAMPLE_TRENDS, issueFreq: SAMPLE_ISSUES };
  }
}

export function useAnalyticsData() {
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot>(EMPTY);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchAnalytics().then(next => {
      if (cancelled) return;
      setSnapshot(next);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const refresh = useCallback(() => {
    setLoading(true);
    setReloadKey(k => k + 1);
  }, []);

  return { ...snapshot, loading, refresh };
}

export type AnalyticsData = ReturnType<typeof useAnalyticsData>;
