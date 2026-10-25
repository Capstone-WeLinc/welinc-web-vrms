import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { Wrench } from 'lucide-react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { FormAlert } from '../../../components/shared/FormAlert';
import { useToast } from '../../../context/toast';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { createRepair } from '../../../lib/api/repairApi';
import { formatShortDate } from '../../../lib/utils/format';
import { useAuthStore } from '../../../store/authStore';
import { AssignmentSection } from '../components/repair-form/AssignmentSection';
import { BillingSection } from '../components/repair-form/BillingSection';
import { IssueLoggingSection } from '../components/repair-form/IssueLoggingSection';
import { RepairFormActions } from '../components/repair-form/RepairFormActions';
import { RepairSummaryDialog } from '../components/repair-form/RepairSummaryDialog';
import { VehicleSection } from '../components/repair-form/VehicleSection';
import { useLeaveGuard } from '../../../hooks/useLeaveGuard';
import { blocksSubmit, useRepairFormOptions } from '../hooks/useRepairFormOptions';
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

  // The schema is built per validation from the lists as they are now, so "still in its list" holds on every submit (AC-20).
  const resolver = useMemo<Resolver<RepairFormInput, unknown, RepairFormValues>>(
    () => (values, context, resolverOptions) =>
      zodResolver(buildRepairFormSchema(getCheckLists()))(values, context, resolverOptions),
    [getCheckLists],
  );

  const {
    control,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    trigger,
    formState: { isDirty, submitCount },
  } = useForm<RepairFormInput, unknown, RepairFormValues>({
    resolver,
    defaultValues: REPAIR_FORM_DEFAULTS,
    mode: 'onTouched',
    // Focus goes to the first invalid field in page order instead (below).
    shouldFocusError: false,
  });

  const [summaryValues, setSummaryValues] = useState<RepairFormValues | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<{ message: string; at: number } | null>(null);

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
      const ticket = await createRepair(toCreatePayload(summaryValues));
      submittedRef.current = true;
      savingRef.current = false;
      if (!mountedRef.current) return;
      setSummaryOpen(false);
      showToast(`${ticket.repairNumber} created.`, 'success');
      navigate(`/repairs/${ticket.id}`, { replace: true });
    } catch (err) {
      savingRef.current = false;
      if (!mountedRef.current) return;
      const serverMessage = getApiErrorMessage(err, '');
      const message = serverMessage ? `Couldn’t create the ticket: ${serverMessage}` : CREATE_FAILED;
      setSaving(false);
      setSummaryOpen(false);
      setFailure({ message, at: Date.now() });
      showToast(message, 'error');
      // Lists may have changed under the form; refetch, then show what is no longer available.
      void refetchAll().then(() => {
        if (mountedRef.current) void trigger();
      });
    }
  };

  const chosenVehicle = options.vehicles.data?.find((v) => v.plateNumber === summaryValues?.vehiclePlate);
  const listsBlocked = blocksSubmit(options.vehicles) || blocksSubmit(options.garages);
  const reporter = user?.name?.trim() || user?.email || '';

  return (
    <div className="pb-action-bar lg:pb-0">
      <PageHeader title="New repair ticket" subtitle="Log a vehicle repair and assign it." icon={Wrench} />
      <p className="-mt-3 mb-6 text-sm text-muted-foreground">
        Reported by {reporter} · {formatShortDate(openedAt)}
      </p>

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
            drivers={options.drivers}
            garages={options.garages}
          />
          <IssueLoggingSection control={control} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <AssignmentSection
            control={control}
            mechanics={options.mechanics}
            setValue={setValue}
            setError={setError}
            clearErrors={clearErrors}
          />
          <BillingSection control={control} setValue={setValue} clearErrors={clearErrors} />
        </div>

        {failure && (
          <div
            ref={alertRef}
            tabIndex={-1}
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring xl:col-span-3"
          >
            <FormAlert message={failure.message} />
          </div>
        )}

        <div className="xl:col-span-3">
          <RepairFormActions saving={saving} listsBlocked={listsBlocked} onCancel={() => navigate('/repairs')} />
        </div>
      </form>

      <RepairSummaryDialog
        open={summaryOpen}
        values={summaryValues}
        vehicle={chosenVehicle}
        saving={saving}
        finalFocusRef={alertRef}
        onCancel={closeSummary}
        onConfirm={() => void create()}
      />
    </div>
  );
}
