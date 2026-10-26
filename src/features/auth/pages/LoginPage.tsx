import { AuthLayout } from '../components/AuthLayout';
import { SsoHandoff } from '../components/SsoHandoff';

/** Sign in happens on the portal only (spec 0009, AC-15): this page takes its token or sends you there. */
export function LoginPage() {
  return (
    <AuthLayout>
      <SsoHandoff />
    </AuthLayout>
  );
}
