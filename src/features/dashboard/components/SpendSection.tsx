import { useState } from 'react';
import { PhilippinePeso, TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { KpiCard } from '../../../components/shared/KpiCard';
import { formatPeso } from '../../../lib/utils/format';
import { spendFor, type SpendTicket, type SpendTimeframe } from '../lib/attention';

const TIMEFRAMES: { value: SpendTimeframe; label: string }[] = [
  { value: 'month', label: 'This month' },
  { value: '90d', label: 'Last 90 days' },
  { value: '365d', label: 'Last 365 days' },
  { value: 'all', label: 'All time' },
];

interface SpendSectionProps {
  /** Active plus history tickets; CANCELLED is left out inside spendFor. */
  tickets: SpendTicket[];
  now: number;
}

export function SpendSection({ tickets, now }: SpendSectionProps) {
  const [timeframe, setTimeframe] = useState<SpendTimeframe>('month');
  const spend = spendFor(tickets, timeframe, now);

  return (
    <Card className="gap-4 p-5">
      <Tabs value={timeframe} onValueChange={(value) => setTimeframe(value as SpendTimeframe)} className="gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Repair spend</h2>
            <p className="text-sm text-muted-foreground">By ticket created date, cancelled tickets left out</p>
          </div>
          {/* Two by two on phones so the four labels never need a scrollbar. */}
          <TabsList
            aria-label="Spend timeframe"
            className="grid w-full grid-cols-2 group-data-[orientation=horizontal]/tabs:h-auto md:inline-flex md:w-fit md:group-data-[orientation=horizontal]/tabs:h-10"
          >
            {TIMEFRAMES.map((option) => (
              <TabsTrigger key={option.value} value={option.value} className="h-9 md:h-full">
                {option.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {TIMEFRAMES.map((option) => (
          <TabsContent key={option.value} value={option.value} className="grid gap-4 sm:grid-cols-2">
            <KpiCard caption="Total repair cost" value={formatPeso(spend.total)} icon={PhilippinePeso} />
            <KpiCard caption="Average cost" value={formatPeso(spend.average)} icon={TrendingUp} />
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}
