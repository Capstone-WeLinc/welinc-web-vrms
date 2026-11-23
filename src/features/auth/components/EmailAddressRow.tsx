import { useState } from 'react';
import { MailCheck, MailQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cancelEmailChange } from '../../../lib/api/authApi';
import { useToast } from '../../../context/toast';
import type { ManagedUser } from '../../../types';
import { emailChangeFailure } from '../lib/emailChange';
import { ChangeEmailDialog } from './ChangeEmailDialog';

type EmailAddressRowProps = {
  email: string;
  emailVerified: boolean;
  pendingEmail: string | null;
  onPendingChange: (pendingEmail: string | null) => void;
  onChanged: (user: ManagedUser) => void;
};

/**
 * Suite spec 0009, AC-27, AC-28: your email, read only, with Change email. A change waiting for
 * its code shows here with Enter code and Cancel; an address an admin changed shows it isn't
 * confirmed yet.
 */
export function EmailAddressRow({ email, emailVerified, pendingEmail, onPendingChange, onChanged }: EmailAddressRowProps) {
  const { showToast } = useToast();
  const [dialog, setDialog] = useState<'change' | 'code' | null>(null);
  // A fresh dialog on every opening (see ChangeEmailDialog)
  const [opened, setOpened] = useState(0);
  const openDialog = (kind: 'change' | 'code') => {
    setOpened((n) => n + 1);
    setDialog(kind);
  };
  const [cancelling, setCancelling] = useState(false);

  const cancel = async () => {
    setCancelling(true);
    try {
      await cancelEmailChange();
      onPendingChange(null);
      showToast('Email change cancelled.', 'success');
    } catch (err) {
      showToast(`Couldn’t cancel the change: ${emailChangeFailure(err).message}`, 'error');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-body font-medium">Email address</span>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="min-w-0 text-body break-all">{email}</span>
          <Button type="button" variant="outline" size="sm" className="h-10" onClick={() => openDialog('change')}>
            Change email
          </Button>
        </div>
        {!emailVerified && (
          <p className="flex items-start gap-1.5 text-body text-muted-foreground">
            <MailQuestion aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Not verified yet. You’ll confirm it the next time you sign in.
          </p>
        )}
      </div>

      {pendingEmail && (
        <div role="status" className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3 text-body">
          <p className="flex items-start gap-1.5">
            <MailCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 break-all">Waiting for you to confirm {pendingEmail}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" className="h-10" onClick={() => openDialog('code')}>
              Enter code
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-10" loading={cancelling} onClick={() => void cancel()}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <ChangeEmailDialog
        key={opened}
        open={dialog !== null}
        onOpenChange={(next) => !next && setDialog(null)}
        currentEmail={email}
        pendingEmail={dialog === 'code' ? pendingEmail : null}
        onPendingChange={onPendingChange}
        onChanged={onChanged}
      />
    </div>
  );
}
