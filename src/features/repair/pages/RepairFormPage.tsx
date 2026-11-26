import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type Resolver } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { PageHeader } from '../../../components/layout/PageHeader';
import { FormAlert } from '../../../components/shared/FormAlert';
import { useToast } from '../../../context/toast';
import { getApiErrorMessage, getDriverExists, getOdometerProblem, getOpenTicketExists } from '../../../lib/api/errors';
import { createRepair } from '../../../lib/api/repairApi';
import { useVehicleSummary } from '../hooks/useVehicleSummary';
import { formatShortDate } from '../../../lib/utils/format';
import { getRepairFormOptions } from '../../../lib/repairOptions';
import { useAuthStore } from '../../../store/authStore';
import { AssignmentSection } from '../components/repair-form/AssignmentSection';
import { BillingSection } from '../components/repair-form/BillingSection';
import { IssueLoggingSection } from '../components/repair-form/IssueLoggingSection';
import { RepairFormActions } from '../components/repair-form/RepairFormActions';
import { RepairSummaryDialog } from '../components/repair-form/RepairSummaryDialog';
import { VehicleSection } from '../components/repair-form/VehicleSection';
import { useLeaveGuard } from '../../../hooks/useLeaveGuard';
import { blocksSubmit, useRepairFormOptions } from '../hooks/useRepairFormOptions';
import { useReferral } from '../hooks/useReferral';
import { ReferralFormBanner } from '../components/referrals/ReferralFormBanner';
import { referralBlocker, referralFormValues } from '../lib/referralPrefill';
import {
  buildRepairFormSchema,
  REPAIR_FORM_DEFAULTS,
  toCreatePayload,
  type RepairFormInput,
  type RepairFormValues,
} from '../lib/repairFormSchema';

const CREATE_FAILED = 'Couldn’t create the ticket. Check your connection and try again.';

export function RepairFormPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const user = useAuthStore((state) => state.user);
  const [openedAt] = useState(() => new Date());
  const options = useRepairFormOptions();
  const { getCheckLists, refetchAll } = options;
  // Spec 0029, AC-8: opened from a VMMS referral (?referral=<id>): prefilled, and no driver needed
  const [searchParams] = useSearchParams();
  const referralId = searchParams.get('referral');
  const referral = useReferral(referralId);
  const blocker = referral.state === 'ready' ? referralBlocker(referral.referral) : null;
  // The schema is built per validation from the lists as they are now, so "still in its list" holds on every submit (AC-20).
  const resolver = useMemo<Resolver<RepairFormInput, unknown, RepairFormValues>>(
    () => (values, context, resolverOptions) =>
      zodResolver(buildRepairFormSchema({ ...getCheckLists(), driverOptional: !!referralId }))(values, context, resolverOptions),
    [getCheckLists, referralId],
  );

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    clearErrors,
    setError,
    trigger,
    formState: { isDirty, submitCount },
  } = useForm<RepairFormInput, unknown, RepairFormValues>({
    resolver,
    defaultValues: REPAIR_FORM_DEFAULTS,
    mode: 'onTouched',
    // Focus goes to the first invalid field in page order instead (below).
    shouldFocusError: false,
  });

  // Development only (break-ui): fill the form with the chosen ?data= dataset once the lists are in
  const prefilled = useRef(false);
  const listsReady = [options.vehicles, options.garages, options.categories, options.mechanics, options.corporations].every((l) => l.data);
  useEffect(() => {
    if (!import.meta.env.DEV || referralId || prefilled.current || !listsReady) return;
    prefilled.current = true;
    void import('../../dev-ui/worst-case/formPrefill').then(({ devFormPrefill }) => {
      const values = devFormPrefill({
        vehicles: options.vehicles.data ?? [],
        garages: options.garages.data ?? [],
        categories: options.categories.data ?? [],
        mechanics: options.mechanics.data ?? [],
        corporations: options.corporations.data ?? [],
        rootCauses: getRepairFormOptions().rootCauses,
      });
      if (values) reset(values);
    });
  }, [listsReady, referralId, options.vehicles.data, options.garages.data, options.categories.data, options.mechanics.data, options.corporations.data, reset]);

  // Spec 0029, AC-8: fill the form from the referral once, after the lists are in
  const referralFilled = useRef(false);
  const readyReferral = referral.state === 'ready' ? referral.referral : null;
  useEffect(() => {
    if (!readyReferral || !listsReady || referralFilled.current) return;
    referralFilled.current = true;
    reset(referralFormValues(readyReferral), { keepDefaultValues: true });
  }, [readyReferral, listsReady, reset]);

  // Facts about the picked truck, and its usual driver in the empty driver field (spec 0016, AC-12)
  const plate = useWatch({ control, name: 'vehiclePlate' });
  const vehicleId = options.vehicles.data?.find((v) => v.plateNumber === plate)?.id ?? '';
  const vehicleSummary = useVehicleSummary(vehicleId);
  const lastDriver = vehicleSummary.summary?.lastDriver ?? null;
  useEffect(() => {
    // A truck VMMS referred keeps an empty driver: whoever drove it last isn't bringing it in
    if (!lastDriver || referralId) return;
    const current = getValues();
    if (current.addingDriver || current.driverId) return;
    setValue('driverId', lastDriver.id, { shouldDirty: true });
    setValue('driverLabel', lastDriver.name);
    clearErrors('driverId');
  }, [lastDriver, referralId, getValues, setValue, clearErrors]);

  const [summaryValues, setSummaryValues] = useState<RepairFormValues | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<{
    message: string;
    at: number;
    ticket?: { id: string; repairNumber: string };
    driver?: { id: string; name: string };
  } | null>(null);
  // A big odometer jump the server wants confirmed (spec 0016, AC-7)
  const [jump, setJump] = useState<{ message: string } | null>(null);
  const [jumpConfirmed, setJumpConfirmed] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);
  const submittedRef = useRef(false);
  const mountedRef = useRef(true);
  const focusErrorRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const closeSummary = useCallback(() => setSummaryOpen(false), []);
  useLeaveGuard({ isDirty, submittedRef, savingRef, onBeforePrompt: closeSummary });

  // AC-3: after an invalid submit renders its errors, focus the first invalid control in page order.
  useEffect(() => {
    if (!focusErrorRef.current) return;
    focusErrorRef.current = false;
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [submitCount]);

  // AC-20: the failure alert takes focus (the dialog's close also returns focus to it).
  useEffect(() => {
    if (failure) alertRef.current?.focus();
  }, [failure]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (savingRef.current) {
      event.preventDefault();
      return;
    }
    setFailure(null);
    void handleSubmit(
      (values) => {
        setSummaryValues(values);
        setJump(null);
        setJumpConfirmed(false);
        setSummaryOpen(true);
      },
      () => {
        focusErrorRef.current = true;
      },
    )(event);
  };

  const create = async () => {
    if (!summaryValues || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      const ticket = await createRepair(
        toCreatePayload(summaryValues, { confirmOdometerJump: jumpConfirmed, referralId: referralId ?? undefined }),
      );
      submittedRef.current = true;
      savingRef.current = false;
      if (!mountedRef.current) return;
      setSummaryOpen(false);
      showToast(`${ticket.repairNumber} created.`, 'success');
      // Spec 0029, AC-5: saved on the last copy of the truck; the sync catches up later
      if (ticket.fleetStale) {
        showToast('VMMS can’t be reached, using the last copy', 'warning', {
          body: 'The truck’s details on this ticket come from VRMS’s last copy and update once VMMS is back.',
        });
      }
      navigate(`/repairs/${ticket.id}`, { replace: true });
    } catch (err) {
      savingRef.current = false;
      if (!mountedRef.current) return;
      const odometer = getOdometerProblem(err);
      if (odometer) {
        setSaving(false);
        if (odometer.code === 'ODOMETER_JUMP_UNCONFIRMED') {
          // Stay in the summary: the person confirms the reading there and creates again
          setJump({ message: odometer.message });
          return;
        }
        setSummaryOpen(false);
        setError('odometerReading', { type: 'server', message: odometer.message });
        focusErrorRef.current = true;
        formRef.current?.querySelector<HTMLElement>('[name="odometerReading"]')?.focus();
        return;
      }
      const existingDriver = getDriverExists(err);
      const openTicket = getOpenTicketExists(err);
      const serverMessage = getApiErrorMessage(err, '');
      const message = openTicket
        ? openTicket.message
        : serverMessage
          ? `Couldn’t create the ticket: ${serverMessage}`
          : CREATE_FAILED;
      setSaving(false);
      setSummaryOpen(false);
      setFailure({
        message: existingDriver ? `A driver with this license exists: ${existingDriver.name}.` : message,
        at: Date.now(),
        ticket: openTicket?.ticket,
        driver: existingDriver ?? undefined,
      });
      showToast(message, 'error');
      // Lists may have changed under the form; refetch, then show what is no longer available.
      void refetchAll().then(() => {
        if (mountedRef.current) void trigger();
      });
    }
  };

  // "Use <name>" after DRIVER_EXISTS: switch from the new driver fields to that driver (spec 0016, AC-13)
  const switchToExistingDriver = (driver: { id: string; name: string }) => {
    setValue('addingDriver', false, { shouldDirty: true });
    setValue('driverId', driver.id, { shouldDirty: true });
    setValue('driverLabel', driver.name);
    setValue('newDriverName', '');
    setValue('newDriverLicense', '');
    clearErrors(['driverId', 'newDriverName', 'newDriverLicense']);
    setFailure(null);
  };

  const chosenVehicle = options.vehicles.data?.find((v) => v.plateNumber === summaryValues?.vehiclePlate);
  const categoryNames = Object.fromEntries((options.categories.data ?? []).map((c) => [c.id, c.name]));
  const listsBlocked = blocksSubmit(options.vehicles) || blocksSubmit(options.garages) || blocksSubmit(options.categories);
  const reporter = user?.name?.trim() || user?.email || '';

  return (
    <div className="pb-action-bar lg:pb-0">
      <PageHeader
        title="New repair ticket"
        context={referralId ? 'Open a repair ticket from a VMMS referral.' : 'Log a vehicle repair and assign it.'}
      />
      <p className="-mt-3 mb-6 text-body text-muted-foreground">
        Reported by {reporter} · {formatShortDate(openedAt)}
      </p>

      {referral.state !== 'none' && <ReferralFormBanner referral={referral} blocker={blocker} />}

      <form
        ref={formRef}
        noValidate
        onSubmit={onSubmit}
        aria-label="New repair ticket"
        // One column below 1280px; from 1280px two columns like the detail page, the vehicle and issues on the left.
        className="flex max-w-3xl flex-col gap-4 xl:grid xl:max-w-none xl:grid-cols-3 xl:items-start [&_:is(button,input,textarea)]:scroll-mt-24 [&_:is(button,input,textarea)]:scroll-mb-action-bar"
      >
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          <VehicleSection
            control={control}
            vehicles={options.vehicles}
            garages={options.garages}
            summary={vehicleSummary}
            setValue={setValue}
            clearErrors={clearErrors}
            driverOptional={!!referralId}
          />
          <IssueLoggingSection
            control={control}
            categories={options.categories}
            entries={options.entries}
            setValue={setValue}
            getValues={getValues}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <AssignmentSection
            control={control}
            mechanics={options.mechanics}
            clearErrors={clearErrors}
          />
          <BillingSection control={control} setValue={setValue} clearErrors={clearErrors} corporations={options.corporations} />
        </div>

        {failure && (
          <div
            ref={alertRef}
            tabIndex={-1}
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring xl:col-span-3"
          >
            <FormAlert
              message={failure.message}
              action={
                failure.ticket ? (
                  <Link to={`/repairs/${failure.ticket.id}`} className="font-medium underline underline-offset-2">
                    Open {failure.ticket.repairNumber}
                  </Link>
                ) : failure.driver ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => switchToExistingDriver(failure.driver!)}>
                    Use {failure.driver.name}
                  </Button>
                ) : undefined
              }
            />
          </div>
        )}

        <div className="xl:col-span-3">
          <RepairFormActions
            saving={saving}
            // A referral that hasn't loaded, or can't be opened, blocks the save like a failed list
            listsBlocked={listsBlocked || (!!referralId && (referral.state !== 'ready' || !!blocker))}
            blockedNote={
              listsBlocked
                ? undefined
                : blocker ?? (referral.state === 'error' ? 'The VMMS referral didn’t load.' : referral.state === 'loading' ? 'Loading the VMMS referral…' : undefined)
            }
            openTicketBlocked={!!vehicleSummary.summary?.openTicket}
            onCancel={() => navigate(referralId ? '/repairs?view=referrals' : '/repairs')}
          />
        </div>
      </form>

      <RepairSummaryDialog
        open={summaryOpen}
        values={summaryValues}
        vehicle={chosenVehicle}
        categoryNames={categoryNames}
        saving={saving}
        jump={jump}
        jumpConfirmed={jumpConfirmed}
        onJumpConfirmedChange={setJumpConfirmed}
        finalFocusRef={alertRef}
        onCancel={closeSummary}
        onConfirm={() => void create()}
      />
    </div>
  );
}
