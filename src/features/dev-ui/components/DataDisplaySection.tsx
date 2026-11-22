import { AlertTriangle, CheckCircle2, ClipboardList, Clock, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { KpiCard } from '@/components/shared/KpiCard';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { RoleChip } from '@/components/ui/role-chip';
import { roleLabel } from '@/lib/roles';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Row, Section } from './ShowcaseLayout';

const STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'FOR_VERIFICATION', 'CLOSED', 'CANCELLED', 'ACTIVE', 'INACTIVE', 'DELETED', 'ON_HOLD'];
const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'URGENT'];
const ROLES = ['ADMIN', 'CHIEF_MECHANIC', 'MECHANIC', 'OPERATIONS', 'CUSTOMER_SUPPORT', 'DRIVER', 'AUDITOR'];

export function DataDisplaySection() {
  return (
    <Section
      id="data-display"
      title="Data display"
      description="Badges always show their label, so color is never the only signal. The last badge in each row is an unknown value: it renders gray with its raw text."
    >
      <Row label="Status badge">
        {STATUSES.map((status) => <StatusBadge key={status} status={status} />)}
      </Row>
      <Row label="Priority badge">
        {PRIORITIES.map((priority) => <PriorityBadge key={priority} priority={priority} />)}
      </Row>
      <Row label="Role badge">
        {ROLES.map((role) => <RoleChip key={role}>{roleLabel(role)}</RoleChip>)}
      </Row>

      <Row label="KPI card">
        <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard caption="Open tickets" value="38" icon={ClipboardList} context="6 more than last week" />
          <KpiCard caption="Completed this month" value="124" icon={CheckCircle2} tone="success" context="92% on time" />
          <KpiCard caption="Overdue" value="5" icon={AlertTriangle} tone="destructive" context="Oldest is 9 days late" />
          <KpiCard caption="Awaiting parts" value="11" icon={Clock} tone="highlight" context="3 parts on back order" />
        </div>
      </Row>

      <Row label="Tabs">
        <Tabs defaultValue="details" className="w-full max-w-xl">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="costs">Costs</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="text-sm text-foreground">Toyota Hilux, NAB 1234. Brake pads worn on the front axle.</TabsContent>
          <TabsContent value="costs" className="text-sm text-foreground">Parts ₱4,800 and labor ₱1,500.</TabsContent>
          <TabsContent value="history" className="text-sm text-foreground">Three earlier repairs, the last in March.</TabsContent>
        </Tabs>
      </Row>

      <Row label="Card and skeleton">
        <div className="grid w-full gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>REP-20260723-00515</CardTitle>
              <CardDescription>Toyota Hilux · NAB 1234</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <StatusBadge status="IN_PROGRESS" />
              <PriorityBadge priority="HIGH" />
            </CardContent>
            <CardFooter>
              <Button variant="outline">View ticket</Button>
            </CardFooter>
          </Card>
          <Card aria-busy="true">
            <span className="sr-only">Loading ticket</span>
            <CardHeader>
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </CardHeader>
            <CardContent className="flex gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-28" />
            </CardFooter>
          </Card>
        </div>
      </Row>

      <Row label="Empty and error states">
        <div className="grid w-full gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border">
            <EmptyState
              icon={SearchX}
              title="No tickets match these filters"
              description="Try a wider date range or clear the status filter."
              action={<Button variant="outline">Clear filters</Button>}
            />
          </div>
          <div className="rounded-xl border border-border">
            <ErrorState message="The repair service did not respond." onRetry={() => undefined} />
          </div>
        </div>
      </Row>
    </Section>
  );
}
