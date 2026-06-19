import { useState, useEffect, useMemo } from 'react';
import { RepairTicket } from '../../../types';
import { getRepairs, getRepairHistory, getAuditLogs, AuditEntry } from '../../../lib/api/repairApi';

export function useDashboardMetrics() {
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [audits, setAudits] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load(silent = false) {
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const [activeData, historyData, auditData] = await Promise.all([
          getRepairs(),
          getRepairHistory(),
          getAuditLogs().catch(() => []),
        ]);
        setRepairs([...activeData.data, ...historyData.data]);
        setAudits(auditData);
      } catch (err) {
        console.error('Failed to load repairs:', err);
        if (!silent) {
          setError('Unable to load repair tickets.');
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    }
    load(false);

    const interval = setInterval(() => {
      load(true);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const summary = useMemo(
    () => ({
      total: repairs.length,
      pending: repairs.filter((r) => r.status === 'PENDING').length,
      inProgress: repairs.filter((r) => r.status === 'IN_PROGRESS').length,
      forVerification: repairs.filter((r) => r.status === 'FOR_VERIFICATION').length,
      completed: repairs.filter((r) => r.status === 'COMPLETED').length,
      cancelled: repairs.filter((r) => r.status === 'CANCELLED').length,
      open: repairs.filter((r) => r.status !== 'COMPLETED' && r.status !== 'CANCELLED').length,
    }),
    [repairs]
  );

  const totalCost = useMemo(
    () => repairs.reduce((sum, repair) => sum + (repair.totalCost ?? 0), 0),
    [repairs]
  );

  const averageCost = useMemo(() => {
    const paidRepairs = repairs.filter((repair) => repair.totalCost && repair.totalCost > 0);
    if (!paidRepairs.length) return 0;
    return Math.round(paidRepairs.reduce((sum, repair) => sum + (repair.totalCost ?? 0), 0) / paidRepairs.length);
  }, [repairs]);

  const topRepairs = useMemo(
    () => [...repairs].sort((a, b) => (b.totalCost ?? 0) - (a.totalCost ?? 0)).slice(0, 4),
    [repairs]
  );

  const latestRepairs = useMemo(
    () => [...repairs].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 8),
    [repairs]
  );

  const statusDistribution = useMemo(() => {
    const dist: Record<string, number> = {
      PENDING: 0,
      IN_PROGRESS: 0,
      FOR_VERIFICATION: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    repairs.forEach((r) => {
      if (r.status in dist) {
        dist[r.status]++;
      }
    });
    return dist;
  }, [repairs]);

  const repairVolume = useMemo(() => {
    const weeks = [
      { label: 'Week 1', repairs: 0 },
      { label: 'Week 2', repairs: 0 },
      { label: 'Week 3', repairs: 0 },
      { label: 'Week 4', repairs: 0 },
      { label: 'Week 5', repairs: 0 },
    ];
    repairs.forEach((r) => {
      const date = new Date(r.createdAt);
      const day = date.getDate();
      if (day <= 7) weeks[0].repairs++;
      else if (day <= 14) weeks[1].repairs++;
      else if (day <= 21) weeks[2].repairs++;
      else if (day <= 28) weeks[3].repairs++;
      else weeks[4].repairs++;
    });
    return weeks;
  }, [repairs]);

  const monthlyStats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const currentMonthRepairs = repairs.filter((r) => {
      const date = new Date(r.createdAt);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    const cost = currentMonthRepairs.reduce((sum, r) => sum + (r.totalCost ?? 0), 0);
    return {
      count: currentMonthRepairs.length,
      cost,
    };
  }, [repairs]);

  return {
    repairs,
    audits,
    loading,
    error,
    summary,
    totalCost,
    averageCost,
    topRepairs,
    latestRepairs,
    statusDistribution,
    repairVolume,
    monthlyStats,
  };
}
