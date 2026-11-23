import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../../../store/authStore';
import { updateOwnProfile } from '../../../lib/api/authApi';
import { getApiErrorMessage } from '../../../lib/api/errors';
import { useToast } from '../../../context/toast';
import { FormAlert } from '../../../components/shared/FormAlert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup, FormField } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { ManagedUser } from '../../../types';
import { personalDetailsSchema, type PersonalDetailsValues } from '../lib/profileSchemas';
import { EmailAddressRow } from './EmailAddressRow';

type PersonalDetailsFormProps = {
  initialValues: PersonalDetailsValues;
  /** Your email is read only here; it changes through Change email (suite spec 0009, AC-27). */
  email: { address: string; verified: boolean; pending: string | null };
  onPendingEmailChange: (pendingEmail: string | null) => void;
  onEmailChanged: (user: ManagedUser) => void;
};

export function PersonalDetailsForm({ initialValues, email, onPendingEmailChange, onEmailChanged }: PersonalDetailsFormProps) {
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, reset, formState: { isSubmitting, isDirty } } = useForm<PersonalDetailsValues>({
    resolver: zodResolver(personalDetailsSchema),
    defaultValues: initialValues,
  });

  const onSubmit = async (values: PersonalDetailsValues) => {
    setError(null);
    try {
      const updatedUser = await updateOwnProfile({
        name: values.name,
        contact: values.contact || undefined,
      });

      // Keep the header in step with the new name (the store is memory only).
      const storeUser = useAuthStore.getState().user;
      if (storeUser) {
        useAuthStore.setState({ user: { ...storeUser, name: updatedUser.name } });
      }

      reset({ name: updatedUser.name, contact: updatedUser.contact ?? '' });
      showToast('Your details are saved.', 'success');
    } catch (err) {
      setError(getApiErrorMessage(err, 'We couldn’t save your details. Try again.'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-group">Personal details</CardTitle>
        <CardDescription>Your WeLinc account details, the same in every system you use.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Outside the form: the dialog's own form would otherwise bubble its submit up here */}
        <EmailAddressRow
          email={email.address}
          emailVerified={email.verified}
          pendingEmail={email.pending}
          onPendingChange={onPendingEmailChange}
          onChanged={onEmailChanged}
        />
        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <FieldGroup className="gap-5">
            <FormField
              control={control}
              name="name"
              label="Full name"
              required
              render={({ field, controlProps }) => <Input {...field} {...controlProps} autoComplete="name" />}
            />
            <FormField
              control={control}
              name="contact"
              label="Contact number"
              description="Optional."
              render={({ field, controlProps }) => (
                <Input {...field} {...controlProps} type="tel" autoComplete="tel" placeholder="09171234567" />
              )}
            />
          </FieldGroup>

          {error && <FormAlert message={error} />}

          <div className="flex justify-end">
            <Button type="submit" className="w-full sm:w-auto" loading={isSubmitting} disabled={!isDirty}>
              {isSubmitting ? 'Saving' : 'Save changes'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
