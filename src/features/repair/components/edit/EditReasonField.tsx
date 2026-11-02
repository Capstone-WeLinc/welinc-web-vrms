import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { FormField } from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { EDIT_REASON_MAX, EDIT_REASON_MIN } from '../../lib/ticketEdits';

/** Spec 0019, AC-3: the "why" an edit on an unlocked closed ticket needs. It becomes the audit note. */
export function EditReasonField<T extends FieldValues & { reason: string }>({ control }: { control: Control<T> }) {
  return (
    <FormField
      control={control}
      name={'reason' as FieldPath<T>}
      label="Reason for the change"
      required
      description={`This ticket is closed, so say why. ${EDIT_REASON_MIN} to ${EDIT_REASON_MAX} characters.`}
      render={({ field, controlProps }) => <Textarea {...field} {...controlProps} rows={2} />}
    />
  );
}
