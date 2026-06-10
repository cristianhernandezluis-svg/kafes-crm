import { ReactNode } from "react";

interface Props {
  titulo: string;
  valor: number;
  cambio: string;
  color: string;
  icono: ReactNode;
}

export default function KpiCard({
  titulo,
  valor,
  cambio,
  color,
  icono,
}: Props) {
  return (
    <div
      className="
      bg-slate-900
      border
      border-slate-800
      rounded-2xl
      p-5
      shadow-lg
      hover:scale-[1.02]
      transition-all
      duration-300
    "
    >
      <div className="flex items-center gap-4">
        <div
          className={`
          h-14
          w-14
          rounded-full
          flex
          items-center
          justify-center
          ${color}
        `}
        >
          {icono}
        </div>

        <div>
          <p className="text-slate-400 text-sm">
            {titulo}
          </p>

          <h2 className="text-3xl font-bold text-white">
            {valor}
          </h2>

          <span className="text-green-500 text-sm">
            {cambio}
          </span>
        </div>
      </div>
    </div>
  );
}