import logoUrl from '@/assets/logo-foodshare.png';

const stats = [
  { value: '500+', label: 'Estabelecimentos' },
  { value: '120+', label: 'Entidades parceiras' },
  { value: '10k+', label: 'Doações feitas' },
];

export function BrandPanel() {
  return (
    <div className="hidden flex-col justify-between bg-linear-to-b from-[#1d4ed8] to-[#1e3a8a] p-12 text-white md:flex md:w-[45%] lg:w-[40%]">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full bg-white p-1.5 shadow-lg">
          <img src={logoUrl} alt="" className="size-full object-contain" />
        </span>
        <span className="text-2xl font-semibold tracking-tight">Food Share</span>
      </div>

      <div className="flex flex-col gap-6">
        <h1 className="text-4xl font-bold tracking-tight">
          Conectando quem doa
          <br />
          com quem precisa
        </h1>
        <p className="max-w-md text-base text-white/80">
          Uma plataforma que une estabelecimentos com excedentes de alimentos a entidades
          beneficiárias que mais precisam. Juntos, reduzimos o desperdício e alimentamos
          comunidades.
        </p>
        <dl className="flex gap-10">
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1">
              <dt className="text-2xl font-bold">{stat.value}</dt>
              <dd className="text-xs text-[#ffffffaa]">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="text-xs text-[#ffffff66]">© 2026 Food Share. Todos os direitos reservados.</p>
    </div>
  );
}
