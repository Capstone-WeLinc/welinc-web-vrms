import { useId, useRef, useState } from 'react';
import { AlertCircle, Info, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { DetailSection } from '../../../components/shared/DetailSection';
import { ErrorState } from '../../../components/shared/ErrorState';
import { useHasTabBar } from '../../../components/layout/useNavSections';
import { showToast } from '../../../context/toast';
import { useLeaveGuard } from '../../../hooks/useLeaveGuard';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';
import { updateSettings, type Setting } from '../../../lib/api/settingsApi';
import { MODULE_LABELS } from '../../../lib/permissions/keys';
import { usePermissions } from '../../../lib/permissions/usePermissions';
import { useSettings } from '../hooks/useSettings';
import { RecentChanges } from './RecentChanges';
import { unitsByKey } from '../lib/changes';
import { STALE_SETTINGS_TOAST } from '../lib/sections';
import {
  formatAmount,
  groupValues,
  hasInvalidEdit,
  isCustom,
  pendingChanges,
  shownText,
  thresholdError,
  type ThresholdEdit,
  type ThresholdEdits,
} from '../lib/thresholds';

const NOTE_MAX = 500;

function ThresholdField({
  setting,
  edit,
  onEdit,
}: {
  setting: Setting;
  edit: ThresholdEdit | undefined;
  onEdit: (edit: ThresholdEdit | undefined) => void;
}) {
  const inputId = useId();
  const helpId = useId();
  const errorId = useId();
  const text = shownText(setting, edit);
  const error = edit?.kind === 'value' ? thresholdError(setting, edit.text) : null;
  const custom = isCustom(setting, edit);

  if (setting.type === 'boolean') {
    // Spec 0015, AC-4: a yes or no value is a switch; saving still goes through the one Save bar
    return (
      <div className="flex items-start justify-between gap-4 border-t border-border py-4 first:border-t-0 first:pt-0">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor={inputId} className="text-body font-medium text-foreground">
              {setting.label}
            </Label>
            {custom && <Badge variant="secondary">Custom</Badge>}
          </div>
          <p id={helpId} className="mt-1 text-body text-pretty text-muted-foreground">
            {setting.description} Default {setting.default ? 'on' : 'off'}.
          </p>
        </div>
        <Switch
          id={inputId}
          checked={text === 'true'}
          onCheckedChange={(on) => {
            const next = String(on);
            onEdit(next === String(setting.value) ? undefined : { kind: 'value', text: next });
          }}
          aria-describedby={helpId}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border py-4 first:border-t-0 first:pt-0 md:flex-row md:items-start md:justify-between md:gap-6">
      <div className="min-w-0 md:flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Label htmlFor={inputId} className="text-body font-medium text-foreground">
            {setting.label}
          </Label>
          {custom && <Badge variant="secondary">Custom</Badge>}
        </div>
        <p id={helpId} className="mt-1 text-body text-pretty text-muted-foreground">
          {setting.description} Allowed {formatAmount(Number(setting.min))} to {formatAmount(Number(setting.max), setting.unit)}. Default{' '}
          {formatAmount(Number(setting.default), setting.unit)}.
        </p>
      </div>
      <div className="flex flex-col gap-1 md:w-60 md:items-start">
        <div className="flex items-center gap-2">
          <Input
            id={inputId}
            inputMode="numeric"
            value={text}
            onChange={(event) => onEdit({ kind: 'value', text: event.target.value })}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${helpId} ${errorId}` : helpId}
            className="w-24 text-right tabular-nums"
          />
          <span className="w-20 text-body text-muted-foreground">{setting.unit}</span>
        </div>
        {error && (
          <p id={errorId} className="flex items-center gap-1.5 text-caption text-destructive">
            <AlertCircle aria-hidden="true" className="size-3.5 shrink-0" />
            {error}
          </p>
        )}
        {custom && (
          <Button type="button" variant="ghost" size="sm" className="-ml-2" onClick={() => onEdit(setting.isDefault ? undefined : { kind: 'reset' })}>
            <RotateCcw aria-hidden="true" />
            Reset to default
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Spec 0012, AC-23 and AC-27: values grouped by catalog group. Edits collect into one Save and
 * Discard bar; a 409 reloads, drops the edits and says so.
 */
export function ThresholdsSection() {
  const { state, data, errorMessage, retry, replace } = useSettings();
  const { modules } = usePermissions();
  const [edits, setEdits] = useState<ThresholdEdits>({});
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const submittedRef = useRef(false);
  const noteId = useId();
  const hasTabBar = useHasTabBar();

  const settings = data?.settings ?? [];
  const changes = pendingChanges(settings, edits);
  const invalid = hasInvalidEdit(settings, edits);
  const dirty = changes.length > 0 || invalid;

  useLeaveGuard({
    isDirty: dirty,
    submittedRef,
    savingRef,
    title: 'Discard your changes?',
    description: 'The values you changed in Thresholds are not saved yet.',
  });

  const discard = () => {
    setEdits({});
    setNote('');
  };

  const save = async () => {
    if (!data || changes.length === 0 || invalid) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const saved = await updateSettings({ version: data.version, changes, note: note.trim() || undefined });
      replace(saved);
      discard();
      showToast(changes.length === 1 ? 'Saved 1 change.' : `Saved ${changes.length} changes.`);
    } catch (err) {
      if (getApiErrorStatus(err) === 409) {
        discard();
        retry();
        showToast(STALE_SETTINGS_TOAST, 'error');
      } else {
        showToast(getApiErrorMessage(err, 'Could not save the thresholds.'), 'error');
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading thresholds">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }
  if (state === 'error' || !data) {
    return <ErrorState title="Couldn’t load the thresholds." message={errorMessage ?? 'Check your connection, then try again.'} onRetry={retry} retryText="Retry" />;
  }

  const groups = groupValues(settings);

  return (
    <div className="flex flex-col gap-4">
      {groups.map(({ group, settings: values }) => {
        const module = values.find((s) => s.module)?.module ?? null;
        return (
          <DetailSection key={group} title={group}>
            {module && !modules[module] && (
              <p className="-mt-2 flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3 text-body text-muted-foreground">
                <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {MODULE_LABELS[module]} is off. These apply when it is turned back on.
              </p>
            )}
            <div>
              {values.map((setting) => (
                <ThresholdField
                  key={setting.key}
                  setting={setting}
                  edit={edits[setting.key]}
                  onEdit={(edit) =>
                    setEdits((prev) => {
                      const next = { ...prev };
                      if (edit) next[setting.key] = edit;
                      else delete next[setting.key];
                      return next;
                    })
                  }
                />
              ))}
            </div>
          </DetailSection>
        );
      })}

      <RecentChanges
        keys={new Set(settings.filter((s) => s.kind === 'value').map((s) => s.key))}
        refreshToken={data.version}
        units={unitsByKey(settings)}
      />

      {dirty && (
        <div
          role="region"
          aria-label="Unsaved changes"
          // Above the phone tab bar (h-16) when this user has one
          className={cn(
            'sticky z-10 flex flex-col gap-3 rounded-xl border border-transparent bg-card p-4 shadow-pop md:flex-row md:items-end',
            hasTabBar ? 'bottom-20 md:bottom-4' : 'bottom-4',
          )}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Label htmlFor={noteId} className="text-body font-medium text-foreground">
              {changes.length === 0 ? 'Fix the value marked in red' : changes.length === 1 ? '1 value changed' : `${changes.length} values changed`}
              <span className="font-normal text-muted-foreground"> · applies as soon as you save · note (optional)</span>
            </Label>
            <Input id={noteId} value={note} maxLength={NOTE_MAX} placeholder="Why this change?" onChange={(event) => setNote(event.target.value)} />
          </div>
          <div className="flex flex-col-reverse gap-2 md:flex-row">
            <Button type="button" variant="outline" size="touch" onClick={discard} disabled={saving}>
              Discard
            </Button>
            <Button type="button" size="touch" onClick={save} loading={saving} disabled={invalid || changes.length === 0}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
