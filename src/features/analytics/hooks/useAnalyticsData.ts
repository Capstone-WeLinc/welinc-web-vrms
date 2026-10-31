import { useState, useEffect, useCallback } from 'react';
import {
  getAging, getAiStats, getAnalyticsSummary, getCostTrends, getGarageCosts,
  getIssueFrequency, getStatusBreakdown, getVehicleKpis, getVelocity,
} from '../../../lib/api/analyticsApi';
import type {
  AiStats, Aging, AnalyticsSummary, CostTrend, GarageCost, IssueFreq,
  StatusBreakdown, VehicleKpi, Velocity,
} from '../../../lib/api/analyticsApi';
import { getApiErrorMessage } from '../../../lib/api/errors';

// Spec 0013, AC-6: each section loads on its own, so one failed call shows that section's error
// with Retry and never invented numbers.

interface SectionData {
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

export type SectionKey = keyof SectionData;

export interface SectionState {
  status: 'loading' | 'error' | 'ready';
  error: string;
}

const SECTION_KEYS: SectionKey[] = [
  'summary', 'trends', 'vehicles', 'statusBreakdown', 'garageCosts', 'aging', 'velocity', 'issueFreq', 'aiStats',
];

const EMPTY_DATA: SectionData = {
  summary: null, trends: [], vehicles: [], statusBreakdown: [], garageCosts: [],
  aging: [], velocity: [], issueFreq: [], aiStats: null,
};

const ALL_LOADING = Object.fromEntries(
  SECTION_KEYS.map(key => [key, { status: 'loading', error: '' }]),
) as Record<SectionKey, SectionState>;

function loader(key: SectionKey, aiOn: boolean): () => Promise<SectionData[SectionKey]> {
  switch (key) {
    case 'summary': return getAnalyticsSummary;
    case 'trends': return getCostTrends;
    case 'vehicles': return getVehicleKpis;
    case 'statusBreakdown': return getStatusBreakdown;
    case 'garageCosts': return getGarageCosts;
    case 'aging': return getAging;
    case 'velocity': return getVelocity;
    case 'issueFreq': return getIssueFrequency;
    // Spec 0012, AC-13: no /vrms/ai/stats call while AI is off
    case 'aiStats': return aiOn ? getAiStats : () => Promise.resolve(null);
  }
}

type Loaded = { key: SectionKey; data: SectionData[SectionKey]; state: SectionState };

/** Never rejects: a failure comes back as that section's error. */
function loadSection(key: SectionKey, aiOn: boolean): Promise<Loaded> {
  return loader(key, aiOn)()
    .then(data => ({ key, data, state: { status: 'ready' as const, error: '' } }))
    .catch(err => ({
      key,
      data: EMPTY_DATA[key],
      state: { status: 'error' as const, error: getApiErrorMessage(err, 'This section didn’t load.') },
    }));
}

function timeNow() {
  return new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}

export function useAnalyticsData(aiOn: boolean) {
  const [data, setData] = useState<SectionData>(EMPTY_DATA);
  const [sections, setSections] = useState<Record<SectionKey, SectionState>>(ALL_LOADING);
  const [lastUpdated, setLastUpdated] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const apply = useCallback(({ key, data: next, state }: Loaded) => {
    setData(prev => ({ ...prev, [key]: next }));
    setSections(prev => ({ ...prev, [key]: state }));
    setLastUpdated(timeNow());
  }, []);

  useEffect(() => {
    let cancelled = false;
    for (const key of SECTION_KEYS) {
      loadSection(key, aiOn).then(loaded => { if (!cancelled) apply(loaded); });
    }
    return () => { cancelled = true; };
  }, [reloadKey, aiOn, apply]);

  const refresh = useCallback(() => {
    setSections(ALL_LOADING);
    setReloadKey(k => k + 1);
  }, []);

  const retry = useCallback((key: SectionKey) => {
    setSections(prev => ({ ...prev, [key]: { status: 'loading', error: '' } }));
    loadSection(key, aiOn).then(apply);
  }, [aiOn, apply]);

  const states = Object.values(sections);
  // The server nulls every peso field together, so one is enough to tell
  const costsHidden = data.summary?.total_spend === null || data.trends.some(t => t.total_spend === null);

  return {
    ...data,
    aiOn,
    sections,
    lastUpdated,
    refresh,
    retry,
    costsHidden,
    loading: states.some(s => s.status === 'loading'),
    /** Every section loaded, so an export holds nothing missing or made up. */
    complete: states.every(s => s.status === 'ready'),
  };
}

export type AnalyticsData = ReturnType<typeof useAnalyticsData>;
