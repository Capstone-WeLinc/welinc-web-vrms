import { Link } from 'react-router-dom';
import { RoadScene } from '../components/brand/scenes/RoadScene';
import { SceneBand } from '../components/brand/scenes/SceneBand';
import { BrandMark } from '../components/layout/BrandMark';
import { buttonVariants } from '../components/ui/button';
import { cn } from '../lib/utils';

/**
 * Spec 0028, AC-15: any address web-vrms doesn't know. The portal's road (`R34NotFound`): a WeLinc
 * truck waits at a road barrier, and the way out goes to the dashboard. A page you land on, not a
 * failure that interrupts you, so the words carry no alert.
 */
export function NotFoundPage() {
  return (
    <SceneBand
      alert={false}
      lockup={
        <Link
          to="/dashboard"
          aria-label="WeLinc VRMS, dashboard"
          className="rounded-md focus-visible:ring-2 focus-visible:ring-ring-on-dark focus-visible:outline-none"
        >
          <BrandMark tone="sidebar" />
        </Link>
      }
      scene={<RoadScene />}
      eyebrow="Error 404"
      title="Wrong turn"
      line="This page doesn't exist or has moved. Head back and pick another route."
      actions={
        <Link to="/dashboard" className={cn(buttonVariants({ size: 'touch' }), 'w-55 rounded-xl bg-sidebar hover:bg-primary')}>
          Back to dashboard
        </Link>
      }
    />
  );
}
