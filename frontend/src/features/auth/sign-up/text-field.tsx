import type { MaskOptions } from '@react-input/mask';
import type { ComponentProps } from 'react';
import type { Control, FieldPath } from 'react-hook-form';

import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MaskedInput } from '@/components/ui/masked-input';
import type { SignUpInput } from '@/features/auth/sign-up/sign-up-schema';

type MaskProps = Pick<MaskOptions, 'mask' | 'replacement' | 'modify'>;

export function TextField({
  control,
  name,
  label,
  optional,
  mask,
  replacement,
  modify,
  ...inputProps
}: {
  control: Control<SignUpInput>;
  name: FieldPath<SignUpInput>;
  label: string;
  optional?: boolean;
} & ComponentProps<typeof Input> &
  Partial<MaskProps>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>
            {label}
            {optional && <span className="text-muted-foreground font-normal">(opcional)</span>}
          </FormLabel>
          <FormControl>
            {mask ? (
              <MaskedInput
                mask={mask}
                replacement={replacement}
                modify={modify}
                {...inputProps}
                name={field.name}
                ref={field.ref}
                defaultValue={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            ) : (
              <Input {...inputProps} {...field} />
            )}
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
