import { useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { RotateCw } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormAlert } from '../../../components/shared/FormAlert';
import { ResponsiveDialog } from '../../../components/shared/ResponsiveDialog';
import { useToast } from '../../../context/toast';
import { getApiErrorMessage, getConflictCode } from '../../../lib/api/errors';
import { createCategory, updateCategory, type IssueCategory } from '../../../lib/api/knowledgeApi';

// Spec 0007, AC-22: name 2 to 50, description up to 200 (category.dto.ts).
const categorySchema = z.object({
  name: z.string().trim().min(2, 'Name must be 2 to 50 characters.').max(50, 'Name must be 2 to 50 characters.'),
  description: z.string().trim().max(200, 'Description can be up to 200 characters.'),
});
type CategoryForm = z.input<typeof categorySchema>;
type CategoryValues = z.output<typeof categorySchema>;
const resolver = zodResolver(categorySchema);

interface CategoryDialogProps {
  /** Null for a new category. */
  category: IssueCategory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (category: IssueCategory) => void;
  /** After a 409 STALE, refetch the list so Reload shows their changes (AC-20). */
  onReload: () => void;
}

/** New category and Edit category in one dialog (AC-22). Mount it keyed per category so its fields reset. */
export function CategoryDialog({ category, open, onOpenChange, onSaved, onReload }: CategoryDialogProps) {
  const formId = useId();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [stale, setStale] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // isDirty is only tracked when it is read during render, so destructure it here, not inside save
  const {
    control,
    handleSubmit,
    setError,
    formState: { isDirty },
  } = useForm<CategoryForm, unknown, CategoryValues>({
    resolver,
    mode: 'onTouched',
    defaultValues: { name: category?.name ?? '', description: category?.description ?? '' },
  });

  const save = async (values: CategoryValues) => {
    if (category && !isDirty) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const description = values.description || null;
      const saved = category
        ? await updateCategory(category.id, { name: values.name, description }, category.updatedAt)
        : await createCategory(values.name, description);
      showToast(category ? 'Category saved' : 'Category added', 'success');
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      const code = getConflictCode(err);
      if (code === 'DUPLICATE_NAME') {
        setError('name', { message: getApiErrorMessage(err, 'A category with this name already exists.') }, { shouldFocus: true });
      } else if (code === 'STALE') {
        setStale(true);
      } else {
        const message = getApiErrorMessage(err, 'Couldn’t save the category. Check your connection and try again.');
        setFormError(message);
        showToast(message, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={category ? `Edit ${category.name}` : 'New category'}
      description={category ? undefined : 'Categories group entries and fill the System list in the repair form.'}
      footer={
        <>
          <Button type="button" variant="outline" size="touch" className="md:h-10 md:text-sm" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form={formId} size="touch" className="md:h-10 md:text-sm" disabled={saving || stale} loading={saving}>
            {category ? 'Save changes' : 'Add category'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={(e) => void handleSubmit(save)(e)} className="flex flex-col gap-5">
        <FormField
          control={control}
          name="name"
          label="Name"
          required
          render={({ field, controlProps }) => <Input {...field} {...controlProps} maxLength={50} autoComplete="off" />}
        />
        <FormField
          control={control}
          name="description"
          label="Description"
          render={({ field, controlProps }) => <Textarea {...field} {...controlProps} rows={3} maxLength={200} />}
        />
        {stale && (
          <FormAlert
            message="Someone else changed this category. Reload to see their changes."
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onReload();
                }}
              >
                <RotateCw aria-hidden="true" />
                Reload
              </Button>
            }
          />
        )}
        {formError && <FormAlert message={formError} />}
      </form>
    </ResponsiveDialog>
  );
}
