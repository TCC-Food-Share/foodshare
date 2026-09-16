import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { HeartHandshakeIcon, StoreIcon } from 'lucide-react';
import type { Control } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { RadioGroup } from '@/components/ui/radio-group';
import type { SignUpInput } from '@/features/auth/sign-up/sign-up-schema';
import { cn } from '@/lib/cn';

const OPTIONS = [
  {
    value: 'establishment',
    icon: StoreIcon,
    title: 'Estabelecimento',
    description:
      'Doe excedentes de alimentos do seu negócio para entidades beneficiárias próximas.',
  },
  {
    value: 'beneficiary',
    icon: HeartHandshakeIcon,
    title: 'Entidade beneficiária',
    description: 'Receba doações de alimentos para sua organização.',
  },
] as const;

export function ProfileTypeStep({ control }: { control: Control<SignUpInput> }) {
  return (
    <FormField
      control={control}
      name="profileType"
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <RadioGroup
              value={field.value ?? ''}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
            >
              {OPTIONS.map(({ value, icon: Icon, title, description }) => (
                <RadioGroupPrimitive.Item
                  key={value}
                  value={value}
                  className={cn(
                    'group flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-left transition-colors outline-none',
                    'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                    'data-[state=checked]:border-primary data-[state=checked]:bg-primary/5',
                    'data-[state=unchecked]:hover:bg-accent/50',
                  )}
                >
                  <span className="bg-muted text-muted-foreground group-data-[state=checked]:bg-primary group-data-[state=checked]:text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-md">
                    <Icon className="size-5" />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{title}</span>
                    <span className="text-muted-foreground text-sm">{description}</span>
                  </span>
                </RadioGroupPrimitive.Item>
              ))}
            </RadioGroup>
          </FormControl>
          <FormMessage />
          <p className="text-muted-foreground mt-4 text-center text-sm">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Entrar
            </Link>
          </p>
        </FormItem>
      )}
    />
  );
}
