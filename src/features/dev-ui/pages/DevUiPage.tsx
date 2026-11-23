import { ButtonsSection } from '../components/ButtonsSection';
import { DataDisplaySection } from '../components/DataDisplaySection';
import { DataTableSection } from '../components/DataTableSection';
import { FeedbackSection } from '../components/FeedbackSection';
import { FormsSection } from '../components/FormsSection';

export function DevUiPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 md:px-8">
          <p className="text-label text-sidebar-primary">VRMS design system</p>
          <h1 className="text-title font-semibold">UI kit</h1>
          <p className="text-body">
            Every shared component in every state. Development builds only; the production bundle has no route here.
          </p>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:px-8">
        <ButtonsSection />
        <FeedbackSection />
        <FormsSection />
        <DataDisplaySection />
        <DataTableSection />
      </main>
    </div>
  );
}
