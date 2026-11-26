import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ListPlus, Plus, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '../../../../components/shared/ErrorState';
import { PlateChip } from '../../../../components/shared/PlateChip';
import { formatDateTime } from '../../../../lib/utils/format';
import { useCan } from '../../../../lib/permissions/usePermissions';
import { addReferralToTicket, rejectReferral } from '../../../../lib/api/referralsApi';
import { useToast } from '../../../../context/toast';
import { TicketNoteDialog } from '../TicketNoteDialog';
import { AddReferralDialog } from './AddReferralDialog';
import { useReferral } from '../../hooks/useReferral';
import { referralBlocker } from '../../lib/referralPrefill';
import { REFERRAL_STATUS_LABEL } from '../../lib/referrals';

/**
 * Spec 0029, AC-7 to AC-11: one VMMS referral in a side sheet: the work order, the truck, the
 * odometer, every finding and the Chief Mechanic's remarks, with "Open a ticket" or "Add to
 * REP-…" (by whether the truck has an open ticket) and "Reject", for `integration.respond`.
 */
export function ReferralSheet({
  referralId,
  onClose,
  onDecided,
}: {
  referralId: string | null;
  onClose: () => void;
  /** After Add or Reject: the list refreshes and the sheet closes. */
  onDecided: () => void;
}) {
  const referral = useReferral(referralId);
  const canCreate = useCan('ticket.create');
  const canRespond = useCan('integration.respond');

  return (
    <Sheet open={!!referralId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-divider px-5 pt-5 pb-4">
          <SheetTitle className="text-subheading">VMMS referral</SheetTitle>
          <SheetDescription className="text-small">
            {referral.state === 'ready' ? (
              <span translate="no" className="font-mono">{referral.referral.workOrderNumber}</span>
            ) : (
              'A truck a VMMS inspection sent for repair.'
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {referral.state === 'loading' && (
            <div className="flex flex-col gap-3" aria-busy="true">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}
          {referral.state === 'error' && (
            <ErrorState kind="tile" subject="trucks" title="We couldn’t load this referral" message={referral.message} onRetry={referral.retry} />
          )}
          {referral.state === 'ready' && <ReferralBody referral={referral.referral} />}
        </div>

        {referral.state === 'ready' && (
          <ReferralActions
            // A fresh dialog state per referral
            key={referral.referral.id}
            referral={referral.referral}
            canCreate={canCreate}
            canRespond={canRespond}
            onDecided={onDecided}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

type Ready = Extract<ReturnType<typeof useReferral>, { state: 'ready' }>['referral'];

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-label text-muted-strong">{label}</dt>
      <dd className="text-body text-foreground">{children}</dd>
    </div>
  );
}

function ReferralBody({ referral }: { referral: Ready }) {
  const { vehicle } = referral;
  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Fact label="Truck">
          <span className="flex flex-wrap items-center gap-2">
            <PlateChip plate={vehicle.plateNumber} />
            <span className="text-muted-strong">{vehicle.model}</span>
          </span>
        </Fact>
        <Fact label="Garage">{vehicle.garage?.name ?? <span className="text-muted-foreground">—</span>}</Fact>
        <Fact label="Odometer">
          <span className="font-mono">{referral.odometerReading.toLocaleString()} km</span>
        </Fact>
        <Fact label="Received">
          <span className="font-mono">{formatDateTime(referral.receivedAt)}</span>
        </Fact>
        <Fact label="Status">{REFERRAL_STATUS_LABEL[referral.status]}</Fact>
        {referral.repairTicket && (
          <Fact label="Ticket">
            <Link to={`/repairs/${referral.repairTicket.id}`} className="font-medium text-primary underline-offset-2 hover:underline">
              {referral.repairTicket.repairNumber}
            </Link>
          </Fact>
        )}
      </dl>

      <section aria-labelledby="referral-findings" className="flex flex-col gap-2">
        <h3 id="referral-findings" className="text-group text-foreground">
          Findings <span className="font-mono text-muted-foreground">{referral.findings.length}</span>
        </h3>
        <ul className="flex flex-col divide-y divide-divider">
          {referral.findings.map((finding, index) => (
            <li key={`${finding.checklistItemId}-${index}`} className="flex flex-col gap-0.5 py-2.5 first:pt-0">
              <span className="text-body font-medium text-foreground">{finding.label}</span>
              {finding.note && <span className="text-small text-muted-foreground">{finding.note}</span>}
            </li>
          ))}
        </ul>
      </section>

      {referral.chiefMechanicRemarks && (
        <section aria-labelledby="referral-remarks" className="flex flex-col gap-1">
          <h3 id="referral-remarks" className="text-group text-foreground">
            Chief Mechanic’s remarks
          </h3>
          <p className="text-body whitespace-pre-line text-foreground">{referral.chiefMechanicRemarks}</p>
        </section>
      )}

      {referral.rejectionReason && (
        <Fact label="Why it was rejected">{referral.rejectionReason}</Fact>
      )}
    </div>
  );
}

function ReferralActions({
  referral,
  canCreate,
  canRespond,
  onDecided,
}: {
  referral: Ready;
  canCreate: boolean;
  canRespond: boolean;
  onDecided: () => void;
}) {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<'add' | 'reject' | null>(null);
  if (referral.status !== 'WAITING' || !canRespond) return null;
  const open = referral.vehicle.openTicket;
  const blocker = referralBlocker(referral);

  const add = async (issues: Parameters<typeof addReferralToTicket>[1]['issues']) => {
    if (!open) return;
    await addReferralToTicket(referral.id, { issues, updatedAt: open.updatedAt });
    setDialog(null);
    showToast(`Added to ${open.repairNumber}`, 'success', {
      body: 'VMMS sees the link to this ticket.',
      action: { label: 'Open ticket', onClick: () => navigate(`/repairs/${open.id}`) },
    });
    onDecided();
  };
  const reject = async (reason: string) => {
    await rejectReferral(referral.id, reason.trim());
    setDialog(null);
    showToast('Referral sent back to VMMS', 'success', { body: referral.workOrderNumber });
    onDecided();
  };

  return (
    <div className="flex flex-col gap-2 border-t border-border p-4 md:px-5">
      {open ? (
        <>
          <Button onClick={() => setDialog('add')}>
            <ListPlus aria-hidden="true" />
            Add to {open.repairNumber}
          </Button>
          <Button asChild variant="ghost">
            <Link to={`/repairs/${open.id}`}>
              Open {open.repairNumber}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </>
      ) : blocker ? (
        <p className="text-small text-muted-foreground">{blocker}</p>
      ) : (
        canCreate && (
          <Button asChild>
            <Link to={`/repairs/new?referral=${encodeURIComponent(referral.id)}`}>
              <Plus aria-hidden="true" />
              Open a ticket
            </Link>
          </Button>
        )
      )}
      <Button variant="destructive" onClick={() => setDialog('reject')}>
        <Undo2 aria-hidden="true" />
        Reject
      </Button>

      {open && dialog === 'add' && (
        <AddReferralDialog
          open
          onOpenChange={(next) => !next && setDialog(null)}
          referral={referral}
          ticket={open}
          onSave={add}
        />
      )}
      <TicketNoteDialog
        open={dialog === 'reject'}
        onOpenChange={(next) => !next && setDialog(null)}
        title={`Reject ${referral.workOrderNumber}?`}
        description="VMMS gets the referral back with your reason, and no ticket is opened."
        fieldLabel="Why"
        requiredMessage="Say why you’re sending it back."
        minLength={5}
        confirmLabel="Reject referral"
        destructive
        onSubmit={reject}
      />
    </div>
  );
}
