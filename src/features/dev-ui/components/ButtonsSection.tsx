import { Plus, Trash2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Row, Section } from './ShowcaseLayout';

const VARIANTS = ['default', 'outline', 'ghost', 'destructive', 'link'] as const;

function variantLabel(variant: (typeof VARIANTS)[number]) {
  if (variant === 'default') return 'Save repair';
  if (variant === 'destructive') return 'Delete ticket';
  return `${variant[0].toUpperCase()}${variant.slice(1)}`;
}

export function ButtonsSection() {
  return (
    <Section
      id="buttons"
      title="Button"
      description="One primary action per view. Use touch sizes on mechanic screens. Tab to any button to see its focus ring."
    >
      <Row label="Variants">
        {VARIANTS.map((variant) => (
          <Button key={variant} variant={variant}>
            {variantLabel(variant)}
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
  );
}
