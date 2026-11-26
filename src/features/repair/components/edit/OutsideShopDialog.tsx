import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Callout } from '../../../../components/shared/Callout';
import { FormAlert } from '../../../../components/shared/FormAlert';
import { ResponsiveDialog } from '../../../../components/shared/ResponsiveDialog';
import { getApiErrorMessage, getApiErrorStatus } from '../../../../lib/api/errors';
import { getOutsideShops, type OutsideShop } from '../../../../lib/api/vrmsConfigApi';

type ShopList = { state: 'loading' } | { state: 'ready'; shops: OutsideShop[]; stale: boolean } | { state: 'error'; message: string };

interface OutsideShopDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repairNumber: string;
  /** Resolve once handled (the page closes the dialog); throw to show the message here. */
  onSave: (vmmsProviderId: string) => Promise<void>;
}

/** Spec 0029, AC-36: pick the outside shop from VMMS's list for a ticket outsourced without one. */
export function OutsideShopDialog({ open, onOpenChange, repairNumber, onSave }: OutsideShopDialogProps) {
  const selectId = useId();
  const [list, setList] = useState<ShopList>({ state: 'loading' });
  const [shopId, setShopId] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOutsideShops()
      .then(({ shops, stale }) => {
        if (!cancelled) setList({ state: 'ready', shops, stale });
      })
      .catch((err) => {
        if (cancelled) return;
        setList({
          state: 'error',
          message:
            getApiErrorStatus(err) === 503 ? 'VMMS can’t be reached, try again.' : getApiErrorMessage(err, 'The shop list didn’t load.'),
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    if (!shopId) {
      setFormError('Choose the outside shop.');
      return;
    }
    setFormError(null);
    setSaving(true);
    try {
      await onSave(shopId);
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'That didn’t save. Try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => !saving && onOpenChange(next)}
      title={`Outside shop for ${repairNumber}`}
      description="Pick where the truck went. VMMS shows this shop on the truck’s repair."
      footer={
        <>
          <Button type="button" variant="outline" size="touch" className="md:h-10 md:text-body" disabled={saving} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="touch"
            className="md:h-10 md:text-body"
            loading={saving}
            disabled={list.state !== 'ready'}
            onClick={() => void save()}
          >
            Save shop
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {formError && <FormAlert message={formError} />}
        {list.state === 'error' && <FormAlert message={list.message} />}
        {list.state === 'ready' && list.stale && (
          <Callout tone="warning">VMMS can’t be reached, using the list it sent earlier today.</Callout>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={selectId} className="text-label text-muted-strong">
            Outside shop
          </Label>
          <Select value={shopId} onValueChange={setShopId} disabled={list.state !== 'ready'}>
            <SelectTrigger id={selectId} className="w-full">
              <SelectValue placeholder={list.state === 'loading' ? 'Loading shops' : 'Choose a shop'} />
            </SelectTrigger>
            <SelectContent>
              {list.state === 'ready' &&
                list.shops.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
