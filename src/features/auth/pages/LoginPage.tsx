import { AuthLayout } from '../components/AuthLayout';
import { SsoHandoff } from '../components/SsoHandoff';
import { StandaloneLoginForm } from '../components/StandaloneLoginForm';
import { AUTH_MODE } from '../lib/session';

export function LoginPage() {
  return <AuthLayout>{AUTH_MODE === 'standalone' ? <StandaloneLoginForm /> : <SsoHandoff />}</AuthLayout>;
}
