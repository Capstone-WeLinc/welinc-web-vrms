import { Link } from 'react-router-dom';
import { GateScene } from '../components/brand/scenes/GateScene';
import { ScenePanel } from '../components/brand/scenes/ScenePanel';
import { Button } from '../components/ui/button';

/**
 * Spec 0012, AC-21: a Settings section opened without its key. Spec 0028, AC-10: the chained gate,
 * and copy that names no role and no person.
 */
export function ForbiddenPage() {
  return (
    <ScenePanel
      scene={<GateScene />}
      title="This page needs a different role"
      line="Ask an admin to give you access if you need it for your work."
      actions={
        <Button asChild>
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      }
    />
  );
}
