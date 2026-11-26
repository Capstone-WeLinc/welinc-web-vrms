import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleSlash, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Callout } from '../../../components/shared/Callout';
import { ErrorState } from '../../../components/shared/ErrorState';
import { useToast } from '../../../context/toast';
import { dismissDelivery, retryDelivery, type DeliveryDetail } from '../../../lib/api/deliveriesApi';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { useCan } from '../../../lib/permissions/usePermissions';
import { formatDateTime } from '../../../lib/utils/format';
import { TicketNoteDialog } from '../../repair/components/TicketNoteDialog';
import { useDelivery } from '../hooks/useDelivery';
import { DELIVERY_KIND_LABEL, lastErrorText } from '../lib/deliveries';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';

/**
 * Spec 0029, AC-22: one message to VMMS or BMS: what it carried, every attempt fact and the last
 * error, with Retry and Dismiss on a failed one for `integration.respond`.
 */
export function DeliverySheet({ deliveryId, onClose, onChanged }: { deliveryId: string | null; onClose: () => void; onChanged: () => void }) {
  const delivery = useDelivery(deliveryId);

  return (
    <Sheet open={!!deliveryId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-lg">
        <SheetHeader className="border-b border-divider px-5 pt-5 pb-4">
          <SheetTitle className="text-subheading">
            {delivery.state === 'ready'
              ? `${DELIVERY_KIND_LABEL[delivery.delivery.kind]} to ${delivery.delivery.target}`
              : 'Message'}
          </SheetTitle>
          <SheetDescription className="text-small">Sent through the outbox, retried for up to 24 hours.</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {delivery.state === 'loading' && (
            <div className="flex flex-col gap-3" aria-busy="true">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}
          {delivery.state === 'error' && (
            <ErrorState kind="tile" subject="trucks" title="We couldn’t load this message" message={delivery.message} onRetry={delivery.retry} />
          )}
          {delivery.state === 'ready' && <DeliveryBody delivery={delivery.delivery} />}
        </div>

        {delivery.state === 'ready' && (
          <DeliveryActions
            key={delivery.delivery.id}
            delivery={delivery.delivery}
            onDone={(next) => {
              delivery.replace(next);
              onChanged();
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-label text-muted-strong">{label}</dt>
      <dd className="text-body text-foreground">{children}</dd>
    </div>
  );
}

const when = (value: string | null) =>
  value ? <span className="font-mono">{formatDateTime(value)}</span> : <span className="text-muted-foreground">—</span>;

function DeliveryBody({ delivery }: { delivery: DeliveryDetail }) {
  const error = lastErrorText(delivery);
  return (
    <div className="flex flex-col gap-5">
      {delivery.warning && (
        <Callout tone="warning">
          Still retrying after {delivery.attempts} attempts{delivery.lastStatusCode ? `, last answer ${delivery.lastStatusCode}` : ''}. A
          401 or 403 usually means a missing grant in the sign in service.
        </Callout>
      )}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Fact label="Status">
          <DeliveryStatusBadge row={delivery} />
        </Fact>
        <Fact label="About">
          {delivery.ticket ? (
            <Link to={`/repairs/${delivery.ticket.id}`} className="font-mono font-medium text-primary underline-offset-2 hover:underline">
              {delivery.ticket.repairNumber}
            </Link>
          ) : delivery.referral ? (
            <span className="font-mono">{delivery.referral.workOrderNumber}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </Fact>
        <Fact label="Attempts">
          <span className="font-mono">{delivery.attempts}</span>
          {delivery.manualRetryCount > 0 && (
            <span className="text-small text-muted-foreground"> (retried by hand {delivery.manualRetryCount}×)</span>
          )}
        </Fact>
        <Fact label="Last error">{error ? <span className="font-mono text-small break-all">{error}</span> : <span className="text-muted-foreground">—</span>}</Fact>
        <Fact label="Created">{when(delivery.createdAt)}</Fact>
        <Fact label="First try">{when(delivery.firstAttemptAt)}</Fact>
        <Fact label="Last try">{when(delivery.lastAttemptAt)}</Fact>
        {delivery.status === 'PENDING' ? (
          <Fact label="Next try">{when(delivery.nextAttemptAt)}</Fact>
        ) : (
          <Fact label="Sent">{when(delivery.sentAt)}</Fact>
        )}
        {delivery.dismissReason && (
          <div className="col-span-2">
            <Fact label="Why it was dismissed">{delivery.dismissReason}</Fact>
          </div>
        )}
      </dl>
      <section aria-labelledby="delivery-payload" className="flex flex-col gap-2">
        <h3 id="delivery-payload" className="text-group text-foreground">
          What it carried
        </h3>
        <pre className="rounded-lg bg-muted p-3 font-mono text-caption break-words whitespace-pre-wrap text-foreground">
          {JSON.stringify(delivery.payload, null, 2)}
        </pre>
      </section>
    </div>
  );
}

function DeliveryActions({ delivery, onDone }: { delivery: DeliveryDetail; onDone: (next: DeliveryDetail) => void }) {
  const canRespond = useCan('integration.respond');
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  if (delivery.status !== 'FAILED' || !canRespond) return null;

  const retry = async () => {
    setBusy(true);
    try {
      onDone(await retryDelivery(delivery.id));
      showToast('Sending again', 'success', { body: 'The worker tries it within 15 seconds.' });
    } catch (err) {
      showToast(getApiErrorMessage(err, 'That didn’t retry. Try again.'), 'error');
    } finally {
      setBusy(false);
    }
  };
  const dismiss = async (reason: string) => {
    const next = await dismissDelivery(delivery.id, reason.trim());
    setDismissing(false);
    onDone(next);
    showToast('Message dismissed', 'success', {
      body: delivery.ticket ? `Later messages for ${delivery.ticket.repairNumber} go out now.` : undefined,
    });
  };

  return (
    <div className="flex flex-col gap-2 border-t border-border p-4 md:px-5">
      <Button onClick={() => void retry()} loading={busy}>
        <RotateCw aria-hidden="true" />
        Retry
      </Button>
      <Button variant="destructive" disabled={busy} onClick={() => setDismissing(true)}>
        <CircleSlash aria-hidden="true" />
        Dismiss
      </Button>
      <TicketNoteDialog
        open={dismissing}
        onOpenChange={setDismissing}
        title="Dismiss this message?"
        description={`It is never sent. ${delivery.ticket ? 'Later messages for this ticket go out in order.' : ''}`.trim()}
        fieldLabel="Why"
        requiredMessage="Say why you’re dismissing it."
        minLength={5}
        confirmLabel="Dismiss message"
        destructive
        onSubmit={dismiss}
      />
    </div>
  );
}
