import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/context/toast';
import { Row, Section } from './ShowcaseLayout';

const MECHANICS = [
  'Ramon Dela Cruz',
  'Jessa Villanueva',
  'Arnel Bautista',
  'Marites Santos',
  'Paolo Reyes',
  'Lito Mendoza',
  'Grace Aquino',
  'Noel Castillo',
].map((name) => ({ value: name.toLowerCase().replace(/ /g, '-'), label: name }));

const sampleSchema = z.object({
  plateNumber: z
    .string()
    .trim()
    .min(1, 'Enter the plate number.')
    .regex(/^[A-Z]{3} ?\d{3,4}$/i, 'Use the format ABC 1234.'),
  mechanic: z.string().min(1, 'Choose a mechanic.'),
  priority: z.string().min(1, 'Choose a priority.'),
  description: z.string().trim().min(10, 'Describe the issue in at least 10 characters.'),
  notifyDriver: z.boolean(),
  towed: z.boolean(),
});

type SampleValues = z.infer<typeof sampleSchema>;

const DEFAULT_VALUES: SampleValues = {
  plateNumber: '',
  mechanic: '',
  priority: '',
  description: '',
  notifyDriver: true,
  towed: false,
};

function SampleRepairForm() {
  const { showToast } = useToast();
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<SampleValues>({
    resolver: zodResolver(sampleSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const onSubmit = async (values: SampleValues) => {
    // A fake save, so the spinner and the disabled submit are visible.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    showToast(`Ticket for ${values.plateNumber.toUpperCase()} saved.`, 'success');
    reset();
  };

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex w-full max-w-xl flex-col gap-6">
      <FieldGroup className="gap-5">
        <FormField
          control={control}
          name="plateNumber"
          label="Plate number"
          required
          description="As printed on the plate, for example NAB 1234."
          render={({ field, controlProps }) => <Input {...field} {...controlProps} autoComplete="off" />}
        />
        <FormField
          control={control}
          name="mechanic"
          label="Assigned mechanic"
          required
          render={({ field, controlProps }) => (
            <Combobox
              {...controlProps}
              options={MECHANICS}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              placeholder="Choose a mechanic"
              searchPlaceholder="Search mechanics"
            />
          )}
        />
        <FormField
          control={control}
          name="priority"
          label="Priority"
          required
          render={({ field, controlProps }) => (
            <Select name={field.name} value={field.value} onValueChange={field.onChange}>
              <SelectTrigger {...controlProps} onBlur={field.onBlur} className="w-full">
                <SelectValue placeholder="Choose a priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
        />
        <FormField
          control={control}
          name="description"
          label="Issue description"
          required
          description="What the driver reported, and anything you saw on intake."
          render={({ field, controlProps }) => <Textarea {...field} {...controlProps} rows={4} />}
        />
        <FormField
          control={control}
          name="notifyDriver"
          label="Text the driver when the repair is done"
          orientation="horizontal"
          render={({ field, controlProps }) => (
            <Checkbox {...controlProps} checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} onBlur={field.onBlur} />
          )}
        />
        <FormField
          control={control}
          name="towed"
          label="Vehicle arrived by tow truck"
          orientation="horizontal"
          render={({ field, controlProps }) => (
            <Switch {...controlProps} checked={field.value} onCheckedChange={field.onChange} onBlur={field.onBlur} />
          )}
        />
      </FieldGroup>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="touch" className="md:h-10 md:text-sm" loading={isSubmitting}>
          {isSubmitting ? 'Saving' : 'Save ticket'}
        </Button>
        <Button type="button" variant="outline" size="touch" className="md:h-10 md:text-sm" disabled={isSubmitting} onClick={() => reset()}>
          Reset
        </Button>
      </div>
    </form>
  );
}

export function FormsSection() {
  return (
    <Section
      id="forms"
      title="Forms"
      description="react-hook-form with zod. Submit the empty form to see every error inline. Inputs are 44px tall with 16px text on phones, so iOS does not zoom."
    >
      <Row label="Sample form (fake save)">
        <SampleRepairForm />
      </Row>

      <Row label="Field states">
        <div className="grid w-full max-w-3xl gap-5 md:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="demo-default">Odometer (km)</FieldLabel>
            <Input id="demo-default" inputMode="numeric" defaultValue="48210" aria-describedby="demo-default-help" />
            <FieldDescription id="demo-default-help">As read on intake.</FieldDescription>
          </Field>
          <Field data-invalid>
            <FieldLabel htmlFor="demo-invalid" required>Labor cost</FieldLabel>
            <Input id="demo-invalid" defaultValue="-250" aria-invalid aria-describedby="demo-invalid-error" />
            <FieldError id="demo-invalid-error">Cost cannot be negative.</FieldError>
          </Field>
          <Field data-disabled>
            <FieldLabel htmlFor="demo-disabled">Ticket number</FieldLabel>
            <Input id="demo-disabled" defaultValue="REP-20260723-00515" disabled />
          </Field>
        </div>
      </Row>
    </Section>
  );
}
