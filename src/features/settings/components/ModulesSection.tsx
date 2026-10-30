import { useId, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { DetailSection } from '../../../components/shared/DetailSection';
import { ErrorState } from '../../../components/shared/ErrorState';
import { showToast } from '../../../context/toast';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';
import { updateSettings, type Setting } from '../../../lib/api/settingsApi';
import { usePermissions } from '../../../lib/permissions/usePermissions';
import { useSettings } from '../hooks/useSettings';
import { dependentsTurningOff, missingRequirements } from '../lib/modules';
import { STALE_SETTINGS_TOAST } from '../lib/sections';
import { ModuleConfirmDialog } from './ModuleConfirmDialog';
import { RecentChanges } from './RecentChanges';

function ModuleRow({ module, onFlip }: { module: Setting; onFlip: () => void }) {
  const labelId = useId();
  const descriptionId = useId();
  const on = module.value === true;
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border py-4 first:border-t-0 first:pt-0">
      <div className="min-w-0">
        <p id={labelId} className="text-sm font-medium text-foreground">
          {module.label}
        </p>
        <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
          {module.description}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 pt-0.5">
        <span className="text-sm text-muted-foreground" aria-hidden="true">
          {on ? 'On' : 'Off'}
        </span>
        <Switch checked={on} onCheckedChange={onFlip} aria-labelledby={labelId} aria-describedby={descriptionId} />
      </div>
    </div>
  );
}

/**
 * Spec 0012, AC-22: one switch per module. Flipping asks first; the switch only moves once the
 * save lands, so Cancel leaves it as it was.
 */
export function ModulesSection() {
  const { state, data, errorMessage, retry, replace } = useSettings();
  const { refresh: refreshPermissions } = usePermissions();
  const [pending, setPending] = useState<Setting | null>(null);
  const [saving, setSaving] = useState(false);

  const settings = data?.settings ?? [];
  const modules = settings.filter((setting) => setting.kind === 'module');

  const flip = (module: Setting) => {
    // Turning on needs every required module on first (AC-9); the server refuses it too
    const missing = module.value === true ? [] : missingRequirements(settings, module);
    if (missing.length > 0) {
      showToast(`${module.label} needs ${missing.map((m) => m.label).join(', ')} on first.`, 'error');
      return;
    }
    setPending(module);
  };

  const confirm = async (reason: string) => {
    if (!data || !pending) return;
    const turnOn = pending.value !== true;
    setSaving(true);
    try {
      const saved = await updateSettings({
        version: data.version,
        changes: [{ key: pending.key, value: turnOn }],
        note: reason,
      });
      replace(saved);
      setPending(null);
      // This tab's nav and pages follow at once; other tabs follow on their next refetch (AC-12)
      refreshPermissions();
      showToast(`${pending.label} is ${turnOn ? 'on' : 'off'}.`);
    } catch (err) {
      setPending(null);
      if (getApiErrorStatus(err) === 409) {
        retry();
        showToast(STALE_SETTINGS_TOAST, 'error');
      } else {
        showToast(getApiErrorMessage(err, 'Could not change the module.'), 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  if (state === 'loading') {
    return (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading modules">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  if (state === 'error' || !data) {
    return <ErrorState title="Couldn’t load the modules." message={errorMessage ?? 'Check your connection, then try again.'} onRetry={retry} retryText="Retry" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <DetailSection title="Modules">
        <p className="-mt-2 text-sm text-muted-foreground">
          A module that is off disappears for everyone and its background work stops. Its data stays for when it comes back.
        </p>
        <div>
          {modules.map((module) => (
            <ModuleRow key={module.key} module={module} onFlip={() => flip(module)} />
          ))}
        </div>
      </DetailSection>
      <RecentChanges keys={new Set(modules.map((m) => m.key))} refreshToken={data.version} />
      <ModuleConfirmDialog
        module={pending}
        dependents={pending && pending.value === true ? dependentsTurningOff(settings, pending.key) : []}
        saving={saving}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
