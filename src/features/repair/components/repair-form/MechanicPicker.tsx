import { useId, useMemo } from 'react';
import { Controller, useFormState, type UseFormClearErrors } from 'react-hook-form';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import type { MechanicOption } from '../../../../lib/api/vrmsConfigApi';
import type { OptionList } from '../../hooks/useRepairFormOptions';
import type { RepairFormControl, RepairFormInput } from '../../lib/repairFormSchema';
import { ListError } from './RepairFormParts';

interface MechanicPickerProps {
  control: RepairFormControl;
  mechanics: OptionList<MechanicOption>;
  clearErrors: UseFormClearErrors<RepairFormInput>;
}

/** Free mechanics first, then busy ones, alphabetical within each. */
function sortMechanics(list: MechanicOption[]) {
  return [...list].sort((a, b) => Number(!a.isAvailable) - Number(!b.isAvailable) || a.name.localeCompare(b.name));
}

/**
 * An adder: picking a mechanic adds a chip and clears the picker (AC-10). In house mechanics only
 * (spec 0010, AC-12). The error for an empty list shows only after a submit, so the picker never
 * calls the field's onBlur.
 */
export function MechanicPicker({ control, mechanics, clearErrors }: MechanicPickerProps) {
  const id = useId();
  const { errors } = useFormState({ control, name: 'mechanics' });
  const sorted = useMemo(() => sortMechanics(mechanics.data ?? []), [mechanics.data]);
  const noneInHouse = mechanics.data?.length === 0;

  return (
    <Controller
      control={control}
      name="mechanics"
      render={({ field }) => {
        const chips = field.value;
        // Picks are by Mechanic id, so two people with one name stay apart (spec 0009, AC-27)
        const options: ComboboxOption[] = sorted
          .filter((m) => !chips.some((chip) => chip.id === m.id))
          .map((m) => ({
            value: m.id,
            label: m.name,
            badge: m.isAvailable ? undefined : <Badge variant="secondary">Has open work</Badge>,
          }));

        const add = (chip: { id: string; name: string }) => {
          clearErrors('mechanics');
          field.onChange([...chips, chip]);
        };

        const rootError = errors.mechanics?.message;
        const chipErrors = chips
          .map((chip, index) => (errors.mechanics?.[index]?.message ? { index, message: errors.mechanics[index]?.message } : null))
          .filter((item) => item !== null);
        const invalid = !!rootError || chipErrors.length > 0;
        const describedBy =
          [`${id}-help`, invalid && `${id}-error`].filter(Boolean).join(' ') || undefined;

        return (
          <Field data-invalid={invalid || undefined}>
            <FieldLabel htmlFor={id}>
              Mechanics
            </FieldLabel>
            <Combobox
              id={id}
              ref={field.ref}
              aria-invalid={invalid}
              aria-describedby={describedBy}
              options={options}
              value=""
              onValueChange={(mechanicId) => {
                const picked = sorted.find((m) => m.id === mechanicId);
                if (picked) add({ id: picked.id, name: picked.name });
              }}
              placeholder="Add a mechanic"
              searchPlaceholder="Search mechanics"
              emptyText="No mechanic matches."
            />
            <FieldDescription id={`${id}-help`}>
              {noneInHouse
                ? 'No in house mechanics are set up yet. Give someone a mechanic role on the Users page.'
                : 'Pick everyone working on this repair.'}
            </FieldDescription>
            {mechanics.failed && (
              <ListError message="Couldn’t load mechanics." retrying={mechanics.retrying} onRetry={mechanics.retry} />
            )}
            {chips.length > 0 && (
              <ul aria-label="Assigned mechanics" className="flex flex-wrap gap-2">
                {chips.map((chip, index) => {
                  const stale = chipErrors.some((item) => item.index === index);
                  return (
                    <li
                      key={chip.id}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border bg-secondary py-0.5 pl-3 text-sm text-foreground',
                        stale ? 'border-destructive' : 'border-border',
                      )}
                    >
                      <span className="max-w-60 truncate">{chip.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-11 rounded-full md:size-8"
                        aria-label={`Remove ${chip.name}`}
                        onClick={() => field.onChange(chips.filter((_, i) => i !== index))}
                      >
                        <X aria-hidden="true" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
            {invalid && (
              <FieldError
                id={`${id}-error`}
                errors={[...(rootError ? [{ message: rootError }] : []), ...chipErrors]}
              />
            )}
          </Field>
        );
      }}
    />
  );
}
