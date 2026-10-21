import type { LucideIcon } from 'lucide-react';
import { KpiCard } from '../../../components/shared/KpiCard';

export type AttentionTile = {
  caption: string;
  value: number;
  icon: LucideIcon;
  tone?: 'default' | 'success' | 'destructive';
};

// Not clickable until feature 11 adds URL filters for the repair list.
export function AttentionTiles({ tiles }: { tiles: AttentionTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map((tile) => (
        <KpiCard key={tile.caption} caption={tile.caption} value={tile.value} icon={tile.icon} tone={tile.tone} />
      ))}
    </div>
  );
}
