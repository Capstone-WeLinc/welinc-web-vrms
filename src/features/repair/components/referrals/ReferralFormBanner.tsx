import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FormAlert } from '../../../../components/shared/FormAlert';
import { PlateChip } from '../../../../components/shared/PlateChip';
import type { ReferralState } from '../../hooks/useReferral';

/**
 * Spec 0029, AC-8: above the new ticket form when it opens from a VMMS referral. Names the work
 * order and the truck and shows the Chief Mechanic's remarks; the findings are the issue lines.
 */
export function ReferralFormBanner({ referral, blocker }: { referral: Exclude<ReferralState, { state: 'none' }>; blocker: string | null }) {
  if (referral.state === 'loading') {
    return (
      <div className="mb-4 flex max-w-3xl flex-col gap-2 rounded-2xl border border-transparent bg-card p-4 shadow-card md:p-5" aria-busy="true">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
    );
  }
  if (referral.state === 'error') {
    return (
      <div className="mb-4 max-w-3xl">
        <FormAlert
          message={referral.message}
          action={
            <Button type="button" variant="outline" size="sm" onClick={referral.retry}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }
  const { referral: r } = referral;
  return (
    <section aria-label="VMMS referral" className="mb-4 flex max-w-3xl flex-col gap-3 rounded-2xl border border-transparent bg-card p-4 shadow-card md:p-5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h2 className="text-subheading text-foreground">
          From VMMS <span translate="no" className="font-mono whitespace-nowrap">{r.workOrderNumber}</span>
        </h2>
        <PlateChip plate={r.vehicle.plateNumber} />
      </div>
      <p className="text-small text-muted-foreground">
        A VMMS inspection found {r.findings.length === 1 ? 'one item' : `${r.findings.length} items`} for repair. Each one is an issue line
        below: pick its system and root cause, then save.
      </p>
      {r.chiefMechanicRemarks && (
        <div className="flex flex-col gap-1">
          <span className="text-label text-muted-strong">Chief Mechanic’s remarks</span>
          <p className="text-body whitespace-pre-line text-foreground">{r.chiefMechanicRemarks}</p>
        </div>
      )}
      {blocker && <FormAlert message={blocker} />}
    </section>
  );
}
