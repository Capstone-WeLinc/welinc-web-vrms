import { CategoriesPanel } from '../../knowledge-base/components/CategoriesPanel';
import { LookupListPanel } from './LookupListPanel';

/**
 * Spec 0012, AC-25: issue categories, moved from the Knowledge base. Spec 0016, AC-20: vehicle
 * types and corporations beside them. Parts, reasons and locations join later (feature 40).
 */
export function LookupsSection() {
  return (
    <div className="flex flex-col gap-4">
      <CategoriesPanel />
      <LookupListPanel
        list="vehicle_type"
        title="Vehicle types"
        noun="vehicle type"
        deactivateNote="It leaves the Vehicles list choices. Trucks that already have it keep it."
      />
      <LookupListPanel
        list="corporation"
        title="Corporations"
        noun="corporation"
        deactivateNote="It leaves the new ticket form. Tickets that already have it keep the name."
      />
    </div>
  );
}
