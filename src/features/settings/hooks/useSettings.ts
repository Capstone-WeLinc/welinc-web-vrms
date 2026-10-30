import { getSettings } from '../../../lib/api/settingsApi';
import { useLoad } from '../../knowledge-base/hooks/useLoad';

const fetchSettings = () => getSettings();

/** Every setting with the version a save sends back (spec 0012, AC-22, AC-23). */
export function useSettings() {
  return useLoad('settings', fetchSettings, 'Could not load the settings.');
}
