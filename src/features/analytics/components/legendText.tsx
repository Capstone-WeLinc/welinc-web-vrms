import type { ReactNode } from 'react';

/** A chart legend label in foreground text: recharts colours it with the series colour, and gold text on white fails contrast (spec 0016). */
export const legendText = (value: ReactNode) => <span style={{ color: 'var(--foreground)' }}>{value}</span>;
