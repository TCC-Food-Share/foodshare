import { type Control, useFormContext } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { SignUpInput } from '@/features/auth/sign-up/sign-up-schema';
import { ImagePicker } from '@/features/files/image-picker';

export function ProfilePhotoStep({ control }: { control: Control<SignUpInput> }) {
  const form = useFormContext<SignUpInput>();

  return (
    <FormField
      control={control}
      name="image"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Foto de perfil</FormLabel>
          <FormControl>
            <ImagePicker
              name={field.name}
              value={field.value}
              onChange={(file) => {
                form.clearErrors('image');
                field.onChange(file);
              }}
              onReject={(message) => form.setError('image', { message })}
              onBlur={field.onBlur}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
