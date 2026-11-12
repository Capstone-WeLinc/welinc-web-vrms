import { useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { isAxiosError } from 'axios';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { FormAlert } from '../../../components/shared/FormAlert';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import { rejectDeletion, type DeletionRequest } from '../../../lib/api/authApi';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { decisionFailureMessage } from '../lib/deletionRequests';

const NOTE_MAX = 500;
const schema = z.object({
  note: z.string().trim().min(1, 'Tell them why, so they know what to do next.').max(NOTE_MAX, `Keep it under ${NOTE_MAX} characters.`),
});
type Values = z.infer<typeof schema>;

type RejectDeletionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: DeletionRequest | null;
  onRejected: (request: DeletionRequest) => void;
};

/** Give it a new `key` on each opening. Suite spec 0012, AC-12, AC-23: reject with a required note. */
export function RejectDeletionDialog({ open, onOpenChange, request, onRejected }: RejectDeletionDialogProps) {
  const formId = useId();
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { note: '' } });
  const note = useWatch({ control, name: 'note' });

  const onSubmit = async (values: Values) => {
    if (!request) return;
    setError(null);
    try {
      onRejected(await rejectDeletion(request.id, values.note));
    } catch (err) {
      const code = isAxiosError<{ code?: string }>(err) ? err.response?.data?.code : undefined;
      setError(decisionFailureMessage(code, getApiErrorMessage(err, 'We couldn’t reject the request. Try again.')));
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => !isSubmitting && onOpenChange(next)}
      title={request?.user ? `Reject ${request.user.name}’s request?` : 'Reject this request?'}
      description="Their account stays as it is. They get your note by email and on their profile."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Back
          </Button>
          <Button type="submit" form={formId} loading={isSubmitting}>
            {isSubmitting ? 'Rejecting' : 'Reject request'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <FormField
          control={control}
          name="note"
          label="Note to them"
          required
          description={`${note.length} of ${NOTE_MAX} characters.`}
          render={({ field, controlProps }) => <Textarea {...field} {...controlProps} rows={3} maxLength={NOTE_MAX} />}
        />
        {error && <FormAlert message={error} />}
      </form>
    </ResponsiveDialog>
  );
}
