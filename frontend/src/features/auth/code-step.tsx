import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { CircleAlertIcon, Loader2Icon } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { type CodeError, codeRequestError, codeVerifyError } from '@/features/auth/code-messages';

const CODE_LENGTH = 6;

interface CodeStepProps {
  email: string;
  submitLabel: string;
  submittingLabel: string;
  /** Confere o código; lança o erro da API quando ele não vale. */
  onVerify: (otp: string) => Promise<void>;
  /** Pede um novo código para o mesmo e-mail. */
  onResend: () => Promise<void>;
  /**
   * O que fazer quando o código não vale mais (expirado, tentativas
   * esgotadas). Sem ele, a ação reenvia o código como "Reenviar código".
   */
  onRequestNew?: () => void;
}

export function CodeStep({
  email,
  submitLabel,
  submittingLabel,
  onVerify,
  onResend,
  onRequestNew,
}: CodeStepProps) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<CodeError | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (otp.length !== CODE_LENGTH || verifying) return;
    setError(null);
    setVerifying(true);
    try {
      await onVerify(otp);
    } catch (err) {
      setError(codeVerifyError(err, 'code'));
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    setError(null);
    setResending(true);
    try {
      await onResend();
      setOtp('');
      toast.success(`Enviamos um novo código para ${email}.`);
    } catch (err) {
      setError(codeRequestError(err));
    } finally {
      setResending(false);
    }
  }

  return (
    <>
      {error && (
        <Alert variant="destructive" className="mb-6">
          <CircleAlertIcon />
          <AlertDescription>
            <p>{error.message}</p>
            {error.action === 'request-new' && (
              <Button
                type="button"
                variant="link"
                className="h-auto p-0"
                onClick={onRequestNew ?? (() => void handleResend())}
                disabled={resending}
              >
                Pedir um novo código
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="flex flex-col gap-2">
          <Label htmlFor="verification-code">Código de verificação</Label>
          <InputOTP
            id="verification-code"
            maxLength={CODE_LENGTH}
            pattern={REGEXP_ONLY_DIGITS}
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={setOtp}
            containerClassName="justify-between"
          >
            <InputOTPGroup className="w-full justify-between gap-2">
              {Array.from({ length: CODE_LENGTH }, (_, index) => (
                <InputOTPSlot
                  key={index}
                  index={index}
                  className="h-11 w-11 rounded-md border text-lg first:rounded-md last:rounded-md"
                />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>

        <Button type="submit" disabled={otp.length !== CODE_LENGTH || verifying}>
          {verifying && <Loader2Icon className="animate-spin" />}
          {verifying ? submittingLabel : submitLabel}
        </Button>
      </form>

      <Button
        type="button"
        variant="ghost"
        className="mt-2 w-full"
        onClick={() => void handleResend()}
        disabled={resending}
      >
        {resending && <Loader2Icon className="animate-spin" />}
        Reenviar código
      </Button>
    </>
  );
}
