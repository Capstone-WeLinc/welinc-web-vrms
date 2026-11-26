import { useId, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ClosedScene } from '@/components/brand/scenes/ClosedScene';
import { CrashScene } from '@/components/brand/scenes/CrashScene';
import { ErrorTile } from '@/components/brand/scenes/ErrorTile';
import { GateScene } from '@/components/brand/scenes/GateScene';
import { LanyardScene } from '@/components/brand/scenes/LanyardScene';
import { LoadScene } from '@/components/brand/scenes/LoadScene';
import { NotFoundBayScene } from '@/components/brand/scenes/NotFoundBayScene';
import { NotFoundDrawerScene } from '@/components/brand/scenes/NotFoundDrawerScene';
import { PoleScene } from '@/components/brand/scenes/PoleScene';
import { ReaderScene } from '@/components/brand/scenes/ReaderScene';
import { RoadScene } from '@/components/brand/scenes/RoadScene';
import { ScenePanel } from '@/components/brand/scenes/ScenePanel';
import { TILE_SUBJECTS } from '@/components/brand/scenes/tileSubjects';
import { Row, Section } from './ShowcaseLayout';

/** One band scene in a navy strip, as SceneBand draws it, without the page around it. */
function BandPreview({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-label text-muted-foreground">{label}</figcaption>
      <div className="overflow-hidden rounded-2xl bg-sidebar pt-6">{children}</div>
    </figure>
  );
}

/**
 * VRMS spec 0028, AC-20: every panel scene, band scene and tile, both picks of each random pair
 * side by side, and a Still switch that shows the reduced motion frames.
 */
export function ScenesSection() {
  const [still, setStill] = useState(false);
  const switchId = useId();
  const retry = <Button variant="outline">Try again</Button>;

  return (
    <Section
      id="scenes"
      title="Error scenes"
      description="Spec 0028. Panels sit inside the shell, bands fill the page, tiles go in cards and dialogs. Still shows the frame a reduced motion visitor sees."
    >
      <div className="flex items-center gap-3">
        <Switch id={switchId} checked={still} onCheckedChange={setStill} />
        <Label htmlFor={switchId}>Still (reduced motion frames)</Label>
      </div>

      <div data-motion={still ? 'still' : undefined} className="flex flex-col gap-8">
        <Row label="Panels">
          <div className="grid w-full gap-6 xl:grid-cols-2">
            <ScenePanel alert={false} scene={<CrashScene />} title="Something went wrong on this page" line="Try reloading. If it keeps happening, tell your admin what you were doing." actions={<Button>Reload</Button>} />
            <ScenePanel alert={false} scene={<LoadScene />} title="We couldn't load the tickets" line="Check your connection, then try again." actions={retry} />
            <ScenePanel alert={false} scene={<NotFoundBayScene />} title="Repair ticket not found" line="Pick one of two: the empty bay." />
            <ScenePanel alert={false} scene={<NotFoundDrawerScene />} title="Repair ticket not found" line="Pick two of two: the ticket drawer." />
            <ScenePanel alert={false} scene={<GateScene />} title="This page needs a different role" line="Ask an admin to give you access if you need it for your work." />
            <ScenePanel alert={false} scene={<ClosedScene />} title="Analytics is turned off" line="This module is turned off by your Admin. Its data is kept for when it comes back." />
          </div>
        </Row>

        <Row label="Bands">
          <div className="grid w-full gap-6">
            <BandPreview label="Full page crash: pole">
              <PoleScene />
            </BandPreview>
            <div className="grid gap-6 lg:grid-cols-2">
              <BandPreview label="Permissions or sign in: card reader (one of two)">
                <ReaderScene />
              </BandPreview>
              <BandPreview label="Permissions or sign in: lanyard rack (two of two)">
                <LanyardScene />
              </BandPreview>
            </div>
            <BandPreview label="No VRMS access: the gate, wide">
              <GateScene wide />
            </BandPreview>
            <BandPreview label="Page not found: road">
              <RoadScene />
            </BandPreview>
          </div>
        </Row>

        <Row label="Tiles">
          <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {TILE_SUBJECTS.map((subject) => (
              <figure key={subject} className="flex flex-col items-center gap-2">
                <ErrorTile subject={subject} />
                <figcaption className="text-caption text-muted-foreground">{subject}</figcaption>
              </figure>
            ))}
          </div>
        </Row>
      </div>
    </Section>
  );
}
