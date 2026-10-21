import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuthStore } from '../../../store/authStore';
import { api } from '../../../lib/api/client';
import { getApiErrorMessage, getApiErrorStatus } from '../../../lib/api/errors';
import { FormAlert } from '../../../components/shared/FormAlert';
import { PasswordInput } from '../../../components/shared/PasswordInput';
import { Button } from '@/components/ui/button';
import { FieldGroup, FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { processToken } from '../lib/session';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email address.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

type LoginValues = z.infer<typeof loginSchema>;

/** Standalone mode (VITE_AUTH_MODE=standalone): sign in without the portal, mostly for local work. */
export function StandaloneLoginForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState: { isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    const existingToken = useAuthStore.getState().token || localStorage.getItem('welinc_token');
    if (existingToken) navigate('/dashboard', { replace: true });
  }, [navigate]);

  const onSubmit = async ({ email, password }: LoginValues) => {
    setError(null);
    try {
      const response = await api.post('/auth/login', { email: email.trim(), password });
      await processToken(response.data.accessToken, navigate, setError);
    } catch (err) {
      const status = getApiErrorStatus(err);
      if (status === 401) setError('That email and password don’t match. Check them and try again.');
      else if (status === undefined) setError('We can’t reach the server. Check your connection and try again.');
      else setError(getApiErrorMessage(err, 'Sign in failed. Try again.'));
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground">Sign in to VRMS</h1>
        <p className="text-sm text-muted-foreground">Use your WeLinc account email and password.</p>
      </div>

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <FieldGroup className="gap-5">
          <FormField
            control={control}
            name="email"
            label="Email address"
            required
            render={({ field, controlProps }) => (
              <Input {...field} {...controlProps} type="email" autoComplete="email" placeholder="you@welinc.com" />
            )}
          />
          <FormField
            control={control}
            name="password"
            label="Password"
            required
            render={({ field, controlProps }) => (
              <PasswordInput {...field} {...controlProps} autoComplete="current-password" />
            )}
          />
        </FieldGroup>

        {error && <FormAlert message={error} />}

        <Button type="submit" size="touch" className="w-full" loading={isSubmitting}>
          {isSubmitting ? 'Signing in' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
