import { cn } from '@/lib/cn';

const STEP_TITLES = [
  'Qual o seu perfil?',
  'Dados institucionais',
  'Dados do responsável',
  'Endereço',
];

const STEP_SUBTITLES = [
  'Selecione como você deseja participar da plataforma.',
  'Informe os dados jurídicos da sua organização.',
  'Dados de quem vai administrar a conta.',
  'Onde sua organização está localizada.',
];

export function WizardProgress({ step }: { step: number }) {
  return (
    <div className="mb-6 flex flex-col gap-3">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn('h-1 flex-1 rounded-full', i <= step ? 'bg-primary' : 'bg-muted')}
          />
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-primary text-xs font-medium">Etapa {step + 1} de 4</span>
        <h2 className="text-2xl font-semibold tracking-tight">{STEP_TITLES[step]}</h2>
        <p className="text-muted-foreground text-sm">{STEP_SUBTITLES[step]}</p>
      </div>
    </div>
  );
}
