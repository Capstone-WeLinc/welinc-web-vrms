import { Link } from 'react-router-dom';
import { ClosedScene } from '../components/brand/scenes/ClosedScene';
import { ScenePanel } from '../components/brand/scenes/ScenePanel';
import { Button } from '../components/ui/button';
import { MODULE_LABELS, type ModuleName } from '../lib/permissions/keys';

/**
 * Spec 0012, AC-12: a bookmarked URL of a switched off module lands here, not on the 403 page.
 * Spec 0028, AC-11: the shutter down with the Closed for now sign.
 */
export function ModuleOffPage({ module }: { module: ModuleName }) {
  return (
    <ScenePanel
      scene={<ClosedScene />}
      title={`${MODULE_LABELS[module]} is turned off`}
      line="This module is turned off by your Admin. Its data is kept for when it comes back."
      actions={
        <Button asChild>
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      }
    />
  );
}
