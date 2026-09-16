import { type MaskOptions, useMask } from '@react-input/mask';
import type * as React from 'react';

import { Input } from '@/components/ui/input';

type MaskedInputProps = Omit<React.ComponentProps<typeof Input>, 'type' | 'value'> &
  Pick<MaskOptions, 'mask' | 'replacement' | 'modify'>;

// Uncontrolled on purpose: the mask library owns the DOM value and reports the
// masked value via onChange. A controlled `value` here drops characters on
// fast typing/programmatic fill — react-hook-form's value is a defaultValue only.
function MaskedInput({
  mask,
  replacement = { _: /\d/ },
  modify,
  ref,
  defaultValue,
  ...props
}: MaskedInputProps & { defaultValue?: unknown }) {
  const maskRef = useMask({ mask, replacement, modify });

  return (
    <Input
      inputMode="numeric"
      defaultValue={typeof defaultValue === 'string' ? defaultValue : undefined}
      ref={(node) => {
        maskRef.current = node as HTMLInputElement;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      {...props}
    />
  );
}

export { MaskedInput };
