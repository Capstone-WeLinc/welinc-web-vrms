import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '@/components/ui/button';
import { PORTAL_URL, processToken } from '../lib/session';

function goToPortal() {
  window.location.href = `${PORTAL_URL}/login`;
}

function hasHandoffToken() {
  return new URLSearchParams(window.location.search).has('token') || sessionStorage.getItem('welinc_handoff_token') !== null;
}

/** Portal mode: takes the token the portal hands over, or sends you to the portal to sign in. */
export function SsoHandoff() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [signingIn] = useState(hasHandoffToken);

  useEffect(() => {
    // First check query string parameters for a token passed by portal redirect
    const ssoToken = new URLSearchParams(window.location.search).get('token');
    if (ssoToken) {
      processToken(ssoToken, navigate, setError);
      return;
    }

    // Check if already authenticated
    const existingToken = useAuthStore.getState().token || localStorage.getItem('welinc_token');
    if (existingToken) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // Listen for token handoff via postMessage from the portal
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'WELINC_AUTH_TOKEN' && typeof event.data.token === 'string') {
        processToken(event.data.token, navigate, setError);
      }
    };
    window.addEventListener('message', handleMessage);

    // Also check sessionStorage for the fallback handoff
    const handoffToken = sessionStorage.getItem('welinc_handoff_token');
    if (handoffToken) {
      sessionStorage.removeItem('welinc_handoff_token');
      processToken(handoffToken, navigate, setError);
      return;
    }

    // No token received: redirect to the portal
    const timer = setTimeout(goToPortal, 1500);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timer);
    };
  }, [navigate]);

  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle aria-hidden="true" className="size-6" />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold text-foreground">We couldn't sign you in</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <Button size="touch" className="mt-2 w-full" onClick={goToPortal}>
          Back to portal sign in
        </Button>
      </div>
    );
  }

  return (
    <div role="status" className="flex flex-col items-center gap-4 text-center">
      <Loader2 aria-hidden="true" className="size-10 animate-spin text-primary motion-reduce:animate-none" />
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-foreground">
          {signingIn ? 'Signing you in' : 'Taking you to the WeLinc portal'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {signingIn
            ? 'Checking your account. This takes a second.'
            : 'You sign in to VRMS through the portal. This takes a second.'}
        </p>
      </div>
      {!signingIn && (
        <Button variant="link" onClick={goToPortal}>
          Go to the portal now
          <ArrowRight aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
