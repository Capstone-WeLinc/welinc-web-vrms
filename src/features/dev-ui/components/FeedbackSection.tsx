import { useState } from 'react';
import { Info, MoreVertical, Pencil, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { confirm } from '@/components/shared/confirm/confirm';
import { ResponsiveDialog } from '@/components/shared/ResponsiveDialog';
import { useToast } from '@/context/toast';
import { Row, Section } from './ShowcaseLayout';

export function FeedbackSection() {
  const { showToast } = useToast();
  const [lastAnswer, setLastAnswer] = useState('No confirm answered yet.');
  const [dialogOpen, setDialogOpen] = useState(false);

  const ask = async (tone: 'default' | 'destructive') => {
    const confirmed = await confirm(
      tone === 'destructive'
        ? { title: 'Delete repair ticket?', description: 'REP-20260723-00515 and its photos will be removed. This cannot be undone.', confirmText: 'Delete ticket', tone }
        : { title: 'Submit repair ticket?', description: 'The ticket goes to the chief mechanic for assignment.', confirmText: 'Submit ticket' },
    );
    setLastAnswer(`Last answer: ${confirmed ? 'confirmed' : 'cancelled'}.`);
  };

  const askTwice = async () => {
    const [first, second] = await Promise.all([
      confirm({ title: 'First of two', description: 'The second confirm waits in the queue until this one closes.' }),
      confirm({ title: 'Second of two', description: 'Opened after the first one closed.' }),
    ]);
    setLastAnswer(`Queued answers: ${first ? 'confirmed' : 'cancelled'}, then ${second ? 'confirmed' : 'cancelled'}.`);
  };

  return (
    <Section
      id="feedback"
      title="Feedback and overlays"
      description="Toasts sit top center on phones and bottom right from 768px. Errors are announced assertively. Esc, a click outside, or leaving the page cancels a confirm."
    >
      <Row label="Toasts">
        <Button variant="outline" onClick={() => showToast('Repair ticket saved.', 'success')}>Success toast</Button>
        <Button variant="outline" onClick={() => showToast('Unable to save costs. Try again.', 'error')}>Error toast</Button>
        <Button variant="outline" onClick={() => showToast('Ticket REP-00515 was updated by another user.', 'info')}>Info toast</Button>
      </Row>

      <Row label="Confirm">
        <Button variant="outline" onClick={() => ask('default')}>Default confirm</Button>
        <Button variant="destructive" onClick={() => ask('destructive')}>Destructive confirm</Button>
        <Button variant="outline" onClick={askTwice}>Two queued confirms</Button>
        <p className="text-body text-muted-foreground" aria-live="polite">{lastAnswer}</p>
      </Row>

      <Row label="Responsive dialog">
        <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
        <ResponsiveDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Assign mechanic"
          description="A centered dialog from 768px up, a bottom sheet on phones."
          footer={
            <>
              <Button variant="outline" size="touch" className="md:h-10 md:text-body" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button size="touch" className="md:h-10 md:text-body" onClick={() => setDialogOpen(false)}>Assign</Button>
            </>
          }
        >
          <div className="flex flex-col gap-3 text-body text-foreground">
            {Array.from({ length: 12 }, (_, index) => (
              <p key={index}>
                Mechanic {index + 1}: currently on {index % 3} open tickets at the Marikina garage. The footer stays visible while this list scrolls.
              </p>
            ))}
          </div>
        </ResponsiveDialog>
      </Row>

      <Row label="Menu and tooltip">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-touch" aria-label="Row actions">
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuGroup>
              <DropdownMenuItem><Eye aria-hidden="true" />View</DropdownMenuItem>
              <DropdownMenuItem><Pencil aria-hidden="true" />Edit</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive"><Trash2 aria-hidden="true" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" aria-label="About odometer readings">
              <Info />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Odometer in kilometers, as read on intake</TooltipContent>
        </Tooltip>
      </Row>
    </Section>
  );
}
