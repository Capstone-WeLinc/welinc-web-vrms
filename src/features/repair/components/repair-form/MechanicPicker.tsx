import { useId, useMemo } from 'react';
import { Controller, useFormState, type UseFormClearErrors, type UseFormSetError } from 'react-hook-form';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import type { MechanicOption } from '../../../../lib/api/vrmsConfigApi';
import type { OptionList } from '../../hooks/useRepairFormOptions';
import { NAME_LIMIT, sameName, type RepairFormControl, type RepairFormInput } from '../../lib/repairFormSchema';
import { ListError } from './RepairFormParts';

interface MechanicPickerProps {
  control: RepairFormControl;
  mechanics: OptionList<MechanicOption>;
  setError: UseFormSetError<RepairFormInput>;
  clearErrors: UseFormClearErrors<RepairFormInput>;
}

/** Free mechanics first, then busy ones, alphabetical within each; one row per name. */
function sortMechanics(list: MechanicOption[]) {
  const unique = list.filter((m, i) => list.findIndex((other) => sameName(other.name, m.name)) === i);
  return unique.sort((a, b) => Number(!a.isAvailable) - Number(!b.isAvailable) || a.name.localeCompare(b.name));
}

/**
 * An adder: picking a mechanic adds a chip and clears the picker (AC-10). The error for an empty
 * list shows only after a submit, so the picker never calls the field's onBlur.
 */
export function MechanicPicker({ control, mechanics, setError, clearErrors }: MechanicPickerProps) {
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
        const taken = (name: string) => chips.some((chip) => sameName(chip.name, name));
        const options: ComboboxOption[] = sorted
          .filter((m) => !taken(m.name))
          .map((m) => ({
            value: m.name,
            label: m.name,
            badge: m.isAvailable ? undefined : <Badge variant="secondary">Has open work</Badge>,
          }));

        const add = (name: string, isOutsourced: boolean) => {
          clearErrors('mechanics');
          field.onChange([...chips, { name, isOutsourced }]);
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
            <FieldLabel htmlFor={id} required>
              Mechanics
            </FieldLabel>
            <Combobox
              id={id}
              ref={field.ref}
              aria-invalid={invalid}
              aria-describedby={describedBy}
              options={options}
              value=""
              onValueChange={(name) => add(name, false)}
              onCreate={(text) => {
                if (text.length > NAME_LIMIT) {
                  setError('mechanics', { type: 'manual', message: 'Keep names to 100 characters.' });
                  return;
                }
                add(text, true);
              }}
              canCreate={(text) => !taken(text)}
              createLabel={(text) => `Add "${text}" as outsourced`}
              placeholder="Add a mechanic"
              searchPlaceholder="Search or type an outsourced name"
              emptyText="No mechanic matches."
            />
            <FieldDescription id={`${id}-help`}>
              {noneInHouse
                ? 'No in house mechanics are set up yet. Add an outsourced one.'
                : 'Type a name that isn’t listed to add an outsourced mechanic.'}
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
                      key={`${chip.isOutsourced ? 'out' : 'in'}:${chip.name}`}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full border bg-secondary py-0.5 pl-3 text-sm text-foreground',
                        stale ? 'border-destructive' : 'border-border',
                      )}
                    >
                      <span className="max-w-60 truncate">{chip.name}</span>
                      {chip.isOutsourced && <Badge variant="outline">Outsourced</Badge>}
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
