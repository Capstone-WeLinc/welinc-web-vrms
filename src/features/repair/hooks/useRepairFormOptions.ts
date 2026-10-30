import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getAvailableMechanics,
  getDrivers,
  getGarages,
  getVehicles,
  type DriverOption,
  type GarageOption,
  type MechanicOption,
  type VehicleOption,
} from '../../../lib/api/vrmsConfigApi';
import { getCategories, getEntryOptions, type EntryOption, type IssueCategory } from '../../../lib/api/knowledgeApi';
import type { RepairFormLists } from '../lib/repairFormSchema';
import { useModuleOn } from '../../../lib/permissions/usePermissions';

interface ListSnapshot<T> {
  data: T[] | null;
  /** The last load failed. Old data, if any, stays. */
  failed: boolean;
}

export interface OptionList<T> extends ListSnapshot<T> {
  /** True only on the first load, before any data or failure (AC-14). */
  loading: boolean;
  retrying: boolean;
  retry: () => Promise<void>;
}

/** One server list with its own load, failure and retry. Refetches keep the old data on screen. */
const getActiveCategories = () => getCategories();
// Spec 0012, AC-15: no common issues while the knowledge base is off, and no refused call
const noEntries = () => Promise.resolve<EntryOption[]>([]);

function useOptionList<T>(fetcher: () => Promise<T[]>) {
  const [snapshot, setSnapshot] = useState<ListSnapshot<T>>({ data: null, failed: false });
  const [retrying, setRetrying] = useState(false);
  // Mirrors the snapshot as soon as a load settles, so validation can read it before React re-renders.
  const latest = useRef(snapshot);
  const alive = useRef(true);

  const load = useCallback(
    () =>
      fetcher().then(
        (data) => {
          latest.current = { data, failed: false };
          if (alive.current) setSnapshot(latest.current);
        },
        () => {
          latest.current = { data: latest.current.data, failed: true };
          if (alive.current) setSnapshot(latest.current);
        },
      ),
    [fetcher],
  );

  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  const retry = useCallback(() => {
    setRetrying(true);
    return load().finally(() => {
      if (alive.current) setRetrying(false);
    });
  }, [load]);

  const list: OptionList<T> = {
    ...snapshot,
    loading: snapshot.data === null && !snapshot.failed,
    retrying,
    retry,
  };
  return { list, latest };
}

const checkable = <T>(snapshot: ListSnapshot<T>) => (snapshot.failed ? null : snapshot.data);

/**
 * The lists the repair form picks from, each loading on its own (spec 0005, AC-14, AC-15), plus the
 * active categories for System and the common issues for the picker (spec 0007, AC-24).
 */
export function useRepairFormOptions() {
  const vehicles = useOptionList<VehicleOption>(getVehicles);
  const drivers = useOptionList<DriverOption>(getDrivers);
  const garages = useOptionList<GarageOption>(getGarages);
  const mechanics = useOptionList<MechanicOption>(getAvailableMechanics);
  const categories = useOptionList<IssueCategory>(getActiveCategories);
  const entries = useOptionList<EntryOption>(useModuleOn('knowledge') ? getEntryOptions : noEntries);

  const vehiclesLatest = vehicles.latest;
  const garagesLatest = garages.latest;
  const mechanicsLatest = mechanics.latest;
  /** The lists "still in its list" checks against, read at validation time (AC-20). */
  const getCheckLists = useCallback(
    (): RepairFormLists => ({
      vehiclePlates: checkable(vehiclesLatest.current)?.map((v) => v.plateNumber) ?? null,
      garageNames: checkable(garagesLatest.current)?.map((g) => g.name) ?? null,
      mechanicIds: checkable(mechanicsLatest.current)?.map((m) => m.id) ?? null,
    }),
    [vehiclesLatest, garagesLatest, mechanicsLatest],
  );

  const retryVehicles = vehicles.list.retry;
  const retryDrivers = drivers.list.retry;
  const retryGarages = garages.list.retry;
  const retryMechanics = mechanics.list.retry;
  const retryCategories = categories.list.retry;
  const retryEntries = entries.list.retry;
  /** Refetches every list; resolves once every one has settled. */
  const refetchAll = useCallback(
    () =>
      Promise.allSettled([
        retryVehicles(),
        retryDrivers(),
        retryGarages(),
        retryMechanics(),
        retryCategories(),
        retryEntries(),
      ]).then(() => undefined),
    [retryVehicles, retryDrivers, retryGarages, retryMechanics, retryCategories, retryEntries],
  );

  return {
    vehicles: vehicles.list,
    drivers: drivers.list,
    garages: garages.list,
    mechanics: mechanics.list,
    categories: categories.list,
    entries: entries.list,
    getCheckLists,
    refetchAll,
  };
}

/** A list that failed or loaded empty leaves its required field impossible to fill (AC-15). */
export function blocksSubmit(list: OptionList<unknown>) {
  return list.failed || (list.data !== null && list.data.length === 0);
}
