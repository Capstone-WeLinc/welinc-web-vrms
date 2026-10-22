import { useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm, useWatch, type Control } from 'react-hook-form';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { confirm } from '../../../components/shared/confirm/confirm';
import { FormAlert } from '../../../components/shared/FormAlert';
import { useToast } from '../../../context/toast';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';
import { updateRepairCosts, type UpdateCostsPayload } from '../../../lib/api/repairApi';
import { formatPesoExact } from '../../../lib/utils/format';
import type { RepairTicket } from '../../../types';
import { canEditCosts, COSTS_SECTION_ID, hasCosts, isClosed, STALE_TICKET_MESSAGE } from '../lib/nextAction';
import { DetailItem, DetailSection } from './DetailSection';

const STALE_COSTS_MESSAGE = 'Costs changed since you opened this. Check the current values before saving again.';

const AMOUNT = /^\d+(\.\d{1,2})?$/;
const amount = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter the ${label}.`)
    .regex(AMOUNT, 'Enter an amount of 0 or more, with up to 2 decimals.');

const partSchema = z.object({
  description: z.string().trim().min(1, 'Enter a description.').max(200, 'Keep it to 200 characters or fewer.'),
  unitCost: amount('unit cost'),
  quantity: z.string().trim().regex(/^[1-9]\d*$/, 'Enter a whole number of 1 or more.'),
});

// Only the active mode is checked: hidden item rows never block a lump sum save, and the other way round.
const costsSchema = z
  .object({
    mode: z.enum(['lump', 'itemized']),
    partsCost: z.string(),
    laborCost: amount('labor cost'),
    parts: z.array(z.object({ description: z.string(), unitCost: z.string(), quantity: z.string() })),
  })
  .superRefine((values, ctx) => {
    if (values.mode === 'lump') {
      const parsed = amount('parts cost').safeParse(values.partsCost);
      if (!parsed.success) ctx.addIssue({ code: 'custom', path: ['partsCost'], message: parsed.error.issues[0].message });
      return;
    }
    if (values.parts.length === 0) ctx.addIssue({ code: 'custom', path: ['parts'], message: 'Add at least one part.' });
    values.parts.forEach((part, index) => {
      const parsed = partSchema.safeParse(part);
      parsed.error?.issues.forEach((issue) =>
        ctx.addIssue({ code: 'custom', path: ['parts', index, ...issue.path], message: issue.message }),
      );
    });
  });

type PartValues = z.infer<typeof partSchema>;
type CostValues = z.infer<typeof costsSchema>;

const EMPTY_PART: PartValues = { description: '', unitCost: '', quantity: '1' };

function toNumber(value: string | undefined) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formValues(ticket: RepairTicket): CostValues {
  const parts = ticket.repairParts ?? [];
  const itemized = ticket.isLumpSum === false && parts.length > 0;
  return {
    mode: itemized ? 'itemized' : 'lump',
    partsCost: ticket.partsCost != null && !itemized ? String(ticket.partsCost) : '',
    laborCost: ticket.laborCost != null ? String(ticket.laborCost) : '',
    parts: itemized
      ? parts.map((p) => ({ description: p.description, unitCost: String(p.unitCost), quantity: String(p.quantity) }))
      : [EMPTY_PART],
  };
}

function LiveTotal({ control }: { control: Control<CostValues> }) {
  const [mode, partsCost, laborCost, parts] = useWatch({ control, name: ['mode', 'partsCost', 'laborCost', 'parts'] });
  const partsTotal =
    mode === 'lump' ? toNumber(partsCost) : parts.reduce((sum, p) => sum + toNumber(p.unitCost) * Math.floor(toNumber(p.quantity)), 0);
  return (
    <p className="flex items-baseline justify-between gap-3 border-t border-border pt-3 text-sm" aria-live="polite">
      <span className="font-medium text-foreground">Total</span>
      <span className="text-base font-semibold text-foreground tabular-nums">{formatPesoExact(partsTotal + toNumber(laborCost))}</span>
    </p>
  );
}

function PartSubtotal({ control, index }: { control: Control<CostValues>; index: number }) {
  const [unitCost, quantity] = useWatch({ control, name: [`parts.${index}.unitCost`, `parts.${index}.quantity`] });
  return <span className="tabular-nums">{formatPesoExact(toNumber(unitCost) * Math.floor(toNumber(quantity)))}</span>;
}

interface CostFormProps {
  ticket: RepairTicket;
  onSaved: (ticket: RepairTicket) => void;
  /** Reloads the ticket after a 409; resolves with it, or null if the reload failed. */
  onReload: () => Promise<RepairTicket | null>;
  onClose: () => void;
}

function CostForm({ ticket, onSaved, onReload, onClose }: CostFormProps) {
  const formId = useId();
  const { showToast } = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  // Filled once, when editing starts: a reload after a 409 must not wipe what the admin typed.
  const [defaults] = useState(() => formValues(ticket));
  const {
    control,
    handleSubmit,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<CostValues>({ resolver: zodResolver(costsSchema), defaultValues: defaults });
  const { fields, append, remove } = useFieldArray({ control, name: 'parts' });
  const mode = useWatch({ control, name: 'mode' });

  const save = async (values: CostValues) => {
    setFormError(null);
    if (isClosed(ticket)) {
      const ok = await confirm({
        title: `Save costs and lock ${ticket.repairNumber}?`,
        description: 'Saving locks the ticket again. You need another unlock to change costs after this.',
        confirmText: 'Save and lock',
      });
      if (!ok) return;
    }
    const payload: UpdateCostsPayload = {
      isLumpSum: values.mode === 'lump',
      laborCost: toNumber(values.laborCost),
      lastUpdatedAt: ticket.updatedAt,
      ...(values.mode === 'lump'
        ? { partsCost: toNumber(values.partsCost) }
        : {
            parts: values.parts.map((p) => ({
              description: p.description.trim(),
              unitCost: toNumber(p.unitCost),
              quantity: Number(p.quantity),
            })),
          }),
    };
    try {
      const updated = await updateRepairCosts(ticket.id, payload);
      onSaved(updated);
      showToast('Costs saved.', 'success');
      onClose();
    } catch (err) {
      if (getApiErrorStatus(err) !== 409) {
        setFormError(getApiErrorMessage(err, 'Costs didn’t save. Try again.'));
        return;
      }
      // Stale: keep the typed values, reload underneath so the next save sends the new lastUpdatedAt.
      const latest = await onReload();
      if (latest && !canEditCosts(latest, true)) {
        showToast(STALE_TICKET_MESSAGE, 'error');
        onClose();
        return;
      }
      setFormError(STALE_COSTS_MESSAGE);
    }
  };

  const modeButton = (value: CostValues['mode'], label: string) => (
    <Button
      type="button"
      variant={mode === value ? 'default' : 'outline'}
      size="sm"
      aria-pressed={mode === value}
      onClick={() => setValue('mode', value)}
    >
      {label}
    </Button>
  );

  const partsError = errors.parts?.root?.message ?? errors.parts?.message;

  return (
    <form id={formId} noValidate onSubmit={handleSubmit(save)} className="flex flex-col gap-4">
      <div role="group" aria-label="How parts are entered" className="flex gap-2">
        {modeButton('lump', 'Lump sum')}
        {modeButton('itemized', 'Itemized')}
      </div>

      {mode === 'lump' ? (
        <FormField
          control={control}
          name="partsCost"
          label="Parts cost (₱)"
          required
          render={({ field, controlProps }) => <Input {...field} {...controlProps} inputMode="decimal" autoComplete="off" />}
        />
      ) : (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-sm font-medium text-foreground">Parts</legend>
          <ul className="flex flex-col gap-3">
            {fields.map((item, index) => (
              <li key={item.id} className="grid gap-3 border-b border-border pb-3 sm:grid-cols-12 sm:items-start">
                <FormField
                  control={control}
                  name={`parts.${index}.description`}
                  label="Description"
                  required
                  className="sm:col-span-5"
                  render={({ field, controlProps }) => <Input {...field} {...controlProps} autoComplete="off" />}
                />
                <FormField
                  control={control}
                  name={`parts.${index}.unitCost`}
                  label="Unit cost (₱)"
                  required
                  className="sm:col-span-3"
                  render={({ field, controlProps }) => <Input {...field} {...controlProps} inputMode="decimal" autoComplete="off" />}
                />
                <FormField
                  control={control}
                  name={`parts.${index}.quantity`}
                  label="Qty"
                  required
                  className="sm:col-span-2"
                  render={({ field, controlProps }) => <Input {...field} {...controlProps} inputMode="numeric" autoComplete="off" />}
                />
                <div className="flex items-center justify-between gap-2 text-sm sm:col-span-2 sm:mt-7 sm:flex-col sm:items-end">
                  <PartSubtotal control={control} index={index} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove part ${index + 1}`}
                    disabled={fields.length === 1}
                    onClick={() => remove(index)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {partsError && <p className="text-xs text-destructive">{partsError}</p>}
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => append(EMPTY_PART)}>
            <Plus aria-hidden="true" />
            Add part
          </Button>
        </fieldset>
      )}

      <FormField
        control={control}
        name="laborCost"
        label="Labor cost (₱)"
        required
        description="Enter 0 if there was no labor charge."
        render={({ field, controlProps }) => <Input {...field} {...controlProps} inputMode="decimal" autoComplete="off" />}
      />

      <LiveTotal control={control} />

      {formError && <FormAlert message={formError} />}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Save costs
        </Button>
      </div>
    </form>
  );
}

function CostSummary({ ticket }: { ticket: RepairTicket }) {
  if (!hasCosts(ticket)) return <p className="text-sm text-muted-foreground">No costs recorded yet.</p>;
  const money = (value: number | null | undefined) => (value == null ? '—' : formatPesoExact(value));
  const parts = ticket.isLumpSum === false ? (ticket.repairParts ?? []) : [];

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 gap-3 tabular-nums">
        <DetailItem label="Parts">{money(ticket.partsCost)}</DetailItem>
        <DetailItem label="Labor">{money(ticket.laborCost)}</DetailItem>
        <DetailItem label="Total">
          <span className="text-base font-semibold">{money(ticket.totalCost)}</span>
        </DetailItem>
      </dl>
      {parts.length > 0 && (
        <table className="w-full text-sm">
          <caption className="sr-only">Itemized parts</caption>
          <thead>
            <tr className="border-b border-border text-xs font-medium tracking-wide text-muted-foreground uppercase">
              <th scope="col" className="py-2 pr-2 text-left font-medium">
                Description
              </th>
              <th scope="col" className="hidden px-2 py-2 text-right font-medium sm:table-cell">
                Unit cost
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                Qty
              </th>
              <th scope="col" className="py-2 pl-2 text-right font-medium">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {parts.map((part) => (
              <tr key={part.id}>
                <td className="py-2 pr-2 break-words">{part.description}</td>
                <td className="hidden px-2 py-2 text-right tabular-nums sm:table-cell">{formatPesoExact(part.unitCost)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{part.quantity}</td>
                <td className="py-2 pl-2 text-right tabular-nums">{formatPesoExact(part.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

interface CostsSectionProps {
  ticket: RepairTicket;
  readOnly: boolean;
  onSaved: (ticket: RepairTicket) => void;
  onReload: () => Promise<RepairTicket | null>;
}

/** Admins only; the API never sends costs to mechanics (spec 0004, AC-21). */
export function CostsSection({ ticket, readOnly, onSaved, onReload }: CostsSectionProps) {
  const [editing, setEditing] = useState(false);
  const editable = !readOnly && canEditCosts(ticket, true);

  return (
    <DetailSection
      id={COSTS_SECTION_ID}
      title="Costs"
      action={
        editable && !editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit costs
          </Button>
        ) : null
      }
      className={cn(editing && 'ring-1 ring-primary/20')}
    >
      {editing && editable ? (
        <CostForm ticket={ticket} onSaved={onSaved} onReload={onReload} onClose={() => setEditing(false)} />
      ) : (
        <CostSummary ticket={ticket} />
      )}
    </DetailSection>
  );
}
