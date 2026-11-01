import type { ReactNode, RefObject } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PriorityBadge } from '../../../../components/shared/PriorityBadge';
import { ResponsiveDialog } from '../../../../components/shared/ResponsiveDialog';
import type { VehicleOption } from '../../../../lib/api/vrmsConfigApi';
import { type RepairFormValues } from '../../lib/repairFormSchema';

interface RepairSummaryDialogProps {
  open: boolean;
  values: RepairFormValues | null;
  vehicle: VehicleOption | undefined;
  /** Category names by id, for each issue's System. */
  categoryNames: Record<string, string>;
  saving: boolean;
  /** The server found a big jump above the last reading and wants it confirmed (spec 0016, AC-7). */
  jump: { message: string } | null;
  jumpConfirmed: boolean;
  onJumpConfirmedChange: (confirmed: boolean) => void;
  /** Where focus goes on close instead of the opener, when it exists (the failure alert, AC-20). */
  finalFocusRef: RefObject<HTMLElement | null>;
  onCancel: () => void;
  onConfirm: () => void;
}

function Row({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-b-0 sm:flex-row sm:gap-4">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase sm:w-28 sm:shrink-0 sm:pt-0.5">
        {term}
      </dt>
      <dd className="min-w-0 text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function RepairSummaryDialog({
  open,
  values,
  vehicle,
  categoryNames,
  saving,
  jump,
  jumpConfirmed,
  onJumpConfirmedChange,
  finalFocusRef,
  onCancel,
  onConfirm,
}: RepairSummaryDialogProps) {
  const issueCount = values?.issues.length ?? 0;

  return (
    <ResponsiveDialog
      open={open}
      // Escape, an overlay click and a swipe do nothing while the ticket saves (AC-17).
      onOpenChange={(next) => {
        if (!next && !saving) onCancel();
      }}
      title="Create this repair ticket?"
      finalFocusRef={finalFocusRef}
      footer={
        <>
          <Button type="button" variant="outline" size="touch" className="md:h-10 md:text-sm" disabled={saving} onClick={onCancel}>
            Keep editing
          </Button>
          <Button type="button" size="touch" className="md:h-10 md:text-sm" loading={saving} disabled={!!jump && !jumpConfirmed} onClick={onConfirm}>
            Create ticket
          </Button>
        </>
      }
    >
      {values && (
        <dl>
          <Row term="Vehicle">
            <p>{vehicle?.model ? `${values.vehiclePlate} · ${vehicle.model}` : values.vehiclePlate}</p>
          </Row>
          <Row term="Priority">
            <PriorityBadge priority={values.priority} />
          </Row>
          <Row term="Mechanics">
            {values.mechanics.length === 0 ? (
              <p>This ticket will be Open until someone is assigned.</p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {values.mechanics.map((m) => (
                  <li key={m.id}>{m.name}</li>
                ))}
              </ul>
            )}
          </Row>
          <Row term="Issues">
            {issueCount} {issueCount === 1 ? 'issue' : 'issues'}: {values.issues.map((i) => categoryNames[i.categoryId] ?? 'Unknown system').join(', ')}
          </Row>
          <Row term="Garage">{values.garageLocation}</Row>
          {jump && (
            <Row term="Odometer">
              <p className="flex items-start gap-1.5">
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                {jump.message}
              </p>
              <label className="mt-2 flex min-h-11 items-center gap-2 text-sm md:min-h-0">
                <Checkbox checked={jumpConfirmed} onCheckedChange={(checked) => onJumpConfirmedChange(checked === true)} />
                The reading is right
              </label>
            </Row>
          )}
        </dl>
      )}
    </ResponsiveDialog>
  );
}
