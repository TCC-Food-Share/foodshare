import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Informe seu e-mail.')
    .pipe(z.email({ pattern: z.regexes.html5Email, error: 'E-mail inválido.' })),
  password: z.string().min(1, 'Informe sua senha.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
