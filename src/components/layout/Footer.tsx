import { useState } from "react"
import { version } from "../../../package.json"

export function Footer() {
  const [year] = useState(() => new Intl.DateTimeFormat("pt-BR", { year: "numeric", timeZone: "America/Bahia" }).format(new Date()))

  return (
    <footer className="mt-auto border-t bg-card px-4 py-5 text-xs leading-relaxed text-muted-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-foreground">CEIRF — Coordenação Executiva de Infraestrutura da Rede Física</p>
          <p className="mt-0.5">Secretaria da Segurança Pública do Estado da Bahia</p>
        </div>
        <p className="flex shrink-0 items-center gap-4 md:pr-16"><span>Versão {version}</span><span>© {year}</span></p>
      </div>
    </footer>
  )
}
