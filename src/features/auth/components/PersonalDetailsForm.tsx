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
import { personalDetailsSchema, type PersonalDetailsValues } from '../lib/profileSchemas';

export function PersonalDetailsForm({ initialValues }: { initialValues: PersonalDetailsValues }) {
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
        email: values.email.toLowerCase(),
        contact: values.contact || undefined,
      });

      // Keep the header and the stored session in step with the new name and email.
      const storeUser = useAuthStore.getState().user;
      if (storeUser) {
        const updated = { ...storeUser, name: updatedUser.name, email: updatedUser.email };
        useAuthStore.setState({ user: updated });
        localStorage.setItem('welinc_user', JSON.stringify(updated));
      }

      reset({ name: updatedUser.name, email: updatedUser.email, contact: updatedUser.contact ?? '' });
      showToast('Your details are saved.', 'success');
    } catch (err) {
      setError(getApiErrorMessage(err, 'We couldn’t save your details. Try again.'));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Personal details</CardTitle>
        <CardDescription>Your WeLinc account details, the same in every system you use.</CardDescription>
      </CardHeader>
      <CardContent>
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
              name="email"
              label="Email address"
              required
              render={({ field, controlProps }) => (
                <Input {...field} {...controlProps} type="email" autoComplete="email" />
              )}
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
