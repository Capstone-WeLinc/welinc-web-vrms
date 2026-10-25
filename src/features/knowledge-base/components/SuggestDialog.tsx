import { useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { FormAlert } from '../../../components/shared/FormAlert';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import { useToast } from '../../../context/toast';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { createSuggestion, type SuggestionKind } from '../../../lib/api/knowledgeApi';

const BODY_MAX = 1000;
const schema = z.object({
  body: z.string().trim().min(5, 'Write at least 5 characters.').max(BODY_MAX, 'Keep it to 1000 characters.'),
});
type SuggestForm = z.input<typeof schema>;
const resolver = zodResolver(schema);

interface SuggestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: SuggestionKind;
  /** The entry a "Suggest a change" is about. */
  entryId?: string;
  /** The ticket issue a "Suggest an entry" came from. */
  repairIssueId?: string;
  /** Starts the text, such as the unlinked issue's description. */
  initialBody?: string;
}

/** "Suggest a change" or "Suggest an entry", for any reader (spec 0007, AC-35). */
export function SuggestDialog({ open, onOpenChange, kind, entryId, repairIssueId, initialBody = '' }: SuggestDialogProps) {
  const formId = useId();
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<SuggestForm>({ resolver, defaultValues: { body: initialBody } });

  const send = async ({ body }: SuggestForm) => {
    setError(null);
    try {
      await createSuggestion({ kind, body: body.trim(), entryId, repairIssueId });
      showToast('Thanks, an editor will review it.', 'success');
      reset({ body: '' });
      onOpenChange(false);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Couldn’t send your suggestion. Try again.'));
    }
  };

  const change = kind === 'CHANGE';
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => !isSubmitting && onOpenChange(next)}
      title={change ? 'Suggest a change' : 'Suggest an entry'}
      description={
        change
          ? 'Tell the editors what is wrong or missing in this entry.'
          : 'Describe a problem that keeps coming up, and what usually fixes it.'
      }
      footer={
        <>
          <Button type="button" variant="outline" size="touch" className="md:h-10 md:text-sm" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form={formId} size="touch" className="md:h-10 md:text-sm" loading={isSubmitting}>
            Send suggestion
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={(e) => void handleSubmit(send)(e)} className="flex flex-col gap-4">
        <FormField
          control={control}
          name="body"
          label={change ? 'What should change?' : 'What should the entry cover?'}
          required
          description="5 to 1000 characters."
          render={({ field, controlProps }) => <Textarea {...field} {...controlProps} rows={5} maxLength={BODY_MAX} className="text-base md:text-sm" />}
        />
        {error && <FormAlert message={error} />}
      </form>
    </ResponsiveDialog>
  );
}
