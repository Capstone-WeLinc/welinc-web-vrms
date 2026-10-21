import type { ReactNode } from 'react';
import { Plus, Trash2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';

const VARIANTS = ['default', 'secondary', 'outline', 'ghost', 'destructive', 'link'] as const;

function Section({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-border bg-card p-4 shadow-xs md:p-5">
      <h2 id={id} className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 flex flex-col gap-6">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</h3>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

export function DevUiPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 md:px-8">
          <p className="text-xs font-medium tracking-wide text-sidebar-primary uppercase">VRMS design system</p>
          <h1 className="text-2xl font-semibold">UI kit</h1>
          <p className="text-sm">
            Every shared component in every state. Development builds only; the production bundle has no route here.
          </p>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-8">
        <Section
          id="buttons"
          title="Button"
          description="One primary action per view. Use touch sizes on mechanic screens. Tab to any button to see its focus ring."
        >
          <Row label="Variants">
            {VARIANTS.map((variant) => (
              <Button key={variant} variant={variant}>
                {variant === 'default' ? 'Save repair' : variant === 'destructive' ? 'Delete ticket' : `${variant[0].toUpperCase()}${variant.slice(1)}`}
              </Button>
            ))}
          </Row>

          <Row label="Sizes">
            <Button size="sm">Small (36px)</Button>
            <Button>Default (40px)</Button>
            <Button size="touch">Touch (44px)</Button>
            <Button size="icon" aria-label="Add repair">
              <Plus />
            </Button>
            <Button size="icon-touch" aria-label="Add repair">
              <Plus />
            </Button>
          </Row>

          <Row label="With icon">
            <Button>
              <Wrench aria-hidden="true" />
              Assign mechanic
            </Button>
            <Button variant="outline">
              <Plus aria-hidden="true" />
              New ticket
            </Button>
            <Button variant="destructive">
              <Trash2 aria-hidden="true" />
              Delete
            </Button>
          </Row>

          <Row label="Focus (shown statically)">
            {VARIANTS.slice(0, 5).map((variant) => (
              <Button key={variant} variant={variant} className="ring-2 ring-ring ring-offset-2 ring-offset-background">
                Focused {variant}
              </Button>
            ))}
          </Row>

          <Row label="Disabled">
            {VARIANTS.map((variant) => (
              <Button key={variant} variant={variant} disabled>
                Disabled
              </Button>
            ))}
          </Row>

          <Row label="Loading">
            <Button size="sm" loading>Saving</Button>
            <Button loading>Saving</Button>
            <Button size="touch" loading>Saving</Button>
            <Button variant="outline" loading>Exporting</Button>
            <Button variant="destructive" loading>Deleting</Button>
            <Button size="icon-touch" loading aria-label="Saving">
              <Plus />
            </Button>
          </Row>
        </Section>
      </main>
    </div>
  );
}
