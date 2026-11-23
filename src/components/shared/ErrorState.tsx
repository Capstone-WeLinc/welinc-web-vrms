import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

interface ErrorStateProps {
  /** What failed, usually from getApiErrorMessage. */
  message: string;
  onRetry?: () => void;
  title?: string;
  retryText?: string;
}

export function ErrorState({ message, onRetry, title = 'Something went wrong', retryText = 'Try again' }: ErrorStateProps) {
  return (
    <Empty role="alert">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <AlertCircle aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle className="text-group font-semibold text-foreground">{title}</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
      {onRetry && (
        <EmptyContent>
          <Button variant="outline" onClick={onRetry}>{retryText}</Button>
        </EmptyContent>
      )}
    </Empty>
  );
}
