import { StatCard } from '@/components/ui/stat-card';

export type AttentionTile = {
  caption: string;
  value: number;
  /** The list behind the number, already filtered (suite spec 0016, AC-14). */
  href: string;
  /** On the VRMS hot list for the viewer (docs/context/vrms/design.md, Hot counts). */
  hot?: boolean;
};

export function AttentionTiles({ tiles }: { tiles: AttentionTile[] }) {
  return (
    // Five with the VMMS referrals tile (spec 0029), four otherwise
    <div className={tiles.length > 4 ? 'grid grid-cols-2 gap-4 lg:grid-cols-5' : 'grid grid-cols-2 gap-4 lg:grid-cols-4'}>
      {tiles.map((tile) => (
        <StatCard key={tile.caption} caption={tile.caption} value={tile.value} href={tile.href} hot={tile.hot} />
      ))}
    </div>
  );
}
