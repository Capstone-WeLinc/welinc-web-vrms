import api from './axios';
import type { NavCounts } from '../../components/layout/navItems';

/**
 * Spec 0027, AC-5: the sidebar's counts, only the ones the caller can see. Quiet: a failed read
 * keeps the last numbers and shows no error (AC-7).
 */
export async function getNavCounts(): Promise<NavCounts> {
  const response = await api.get<NavCounts>('/vrms/nav/counts', { quiet: true });
  return response.data;
}
