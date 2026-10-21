import { ButtonsSection } from '../components/ButtonsSection';
import { FeedbackSection } from '../components/FeedbackSection';

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
        <ButtonsSection />
        <FeedbackSection />
      </main>
    </div>
  );
}
