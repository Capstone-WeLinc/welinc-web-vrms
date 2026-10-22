import { useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DATE_PRESETS, type DatePreset, type DateRangeValue } from './dateRange';

interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  /** The Custom range error from resolveRange, shown under the date inputs. */
  error?: string;
}

// A preset picker; Custom adds two inclusive date inputs in the browser's local time.
export function DateRangeFilter({ value, onChange, error }: DateRangeFilterProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-preset`} className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Date range
        </Label>
        <Select value={value.preset} onValueChange={(preset) => onChange({ ...value, preset: preset as DatePreset })}>
          <SelectTrigger id={`${id}-preset`} className="w-full md:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {DATE_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {value.preset === 'custom' && (
        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">Custom date range</legend>
          <div className="grid grid-cols-2 gap-2">
            {(['from', 'to'] as const).map((field) => (
              <div key={field} className="flex min-w-0 flex-col gap-1.5">
                <Label htmlFor={`${id}-${field}`} className="text-xs font-medium text-muted-foreground">
                  {field === 'from' ? 'From' : 'To'}
                </Label>
                <Input
                  id={`${id}-${field}`}
                  type="date"
                  required
                  value={value[field]}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  onChange={(e) => onChange({ ...value, [field]: e.target.value })}
                />
              </div>
            ))}
          </div>
          {error && (
            <p id={errorId} role="alert" className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle aria-hidden="true" className="size-4" />
              {error}
            </p>
          )}
        </fieldset>
      )}
    </div>
  );
}
