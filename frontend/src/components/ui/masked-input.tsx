import { type MaskOptions, useMask } from '@react-input/mask';
import type * as React from 'react';

import { Input } from '@/components/ui/input';

type MaskedInputProps = Omit<React.ComponentProps<typeof Input>, 'type' | 'value'> &
  Pick<MaskOptions, 'mask' | 'replacement' | 'modify'>;

/**
 * `Input` do shadcn com máscara de `@react-input/mask`. É **não controlado** de
 * propósito: a máscara é dona do valor exibido no DOM e reporta o valor
 * mascarado (com pontuação) pelo `onChange`. `value` do react-hook-form entra
 * como `defaultValue` (seed inicial) — os campos mascarados nunca são setados
 * programaticamente neste form.
 */
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
