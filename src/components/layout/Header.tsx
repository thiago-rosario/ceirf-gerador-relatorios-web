import { CircleUserRoundIcon, LoaderCircleIcon, LogOutIcon } from 'lucide-react'
import logoSsp from '@/assets/logo-ssp.png'
import { getNavigationItems, type NavigationId, type NavigationItem } from './navigation'

type HeaderProps = {
  user: { name: string; role: string }
  activeItem: NavigationId
  userManagementAllowed: boolean
  isLoggingOut: boolean
  onLogout: () => void
  onNavigate: (href: NavigationItem['href']) => void
}

export function Header({ user, activeItem, userManagementAllowed, isLoggingOut, onLogout, onNavigate }: HeaderProps) {
  const firstName = user.name.trim().split(/\s+/)[0] || 'Usuário'
  const managementItems = userManagementAllowed ? getNavigationItems(user.role).filter((item) => item.id === 'users') : []

  return (
    <header className="app-header flex shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 bg-[#073575] px-5 py-3 text-white sm:flex-nowrap sm:px-8 lg:px-[4%]" aria-label="Cabeçalho da aplicação">
      <a href="/dashboard" aria-label="CEIRF — Voltar ao dashboard"
        className="flex min-w-0 items-center gap-3 rounded-sm focus-visible:outline-white sm:gap-4"
        onClick={(event) => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          onNavigate('/dashboard')
        }}>
        <img src={logoSsp} alt="Brasão da Secretaria da Segurança Pública da Bahia" className="size-12 shrink-0 object-contain sm:size-16 lg:size-[72px]" />
        <span className="min-w-0 leading-snug">
          <span className="block text-lg font-bold sm:text-xl lg:text-2xl">CEIRF</span>
          <span className="mt-0.5 block text-xs sm:text-sm lg:text-base">Gerador Automático de Relatórios</span>
        </span>
      </a>
      <div className="ml-auto flex min-w-0 items-center gap-5 sm:gap-6 lg:gap-7">
        {managementItems.length > 0 && <nav aria-label="Gerenciamento de usuários">
          {managementItems.map((item) => <a key={item.id} href={item.href} aria-current={activeItem === item.id ? 'page' : undefined}
            className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm focus-visible:outline-white ${activeItem === item.id ? 'bg-white/15' : 'hover:bg-white/10'}`}
            onClick={(event) => {
              if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
              event.preventDefault()
              onNavigate(item.href)
            }}><item.icon aria-hidden="true" className="size-5" />{item.title}</a>)}
        </nav>}
        <p className="flex min-w-0 items-center gap-2 text-sm sm:gap-3 sm:text-base">
          <CircleUserRoundIcon aria-hidden="true" className="size-6 shrink-0 text-[#a5bbd9] sm:size-8" strokeWidth={1.2} />
          <span className="max-w-36 truncate sm:max-w-44 lg:max-w-64" title={`Olá, ${firstName}`}>Olá, {firstName}</span>
        </p>
        <button type="button" disabled={isLoggingOut} onClick={onLogout}
          className="flex min-h-11 shrink-0 items-center gap-2 rounded-sm px-1 text-sm transition-opacity hover:opacity-80 focus-visible:outline-white disabled:cursor-wait disabled:opacity-60 sm:gap-3 sm:text-base">
          {isLoggingOut ? <LoaderCircleIcon aria-hidden="true" className="size-6 animate-spin motion-reduce:animate-none sm:size-8" strokeWidth={1.2} /> : <LogOutIcon aria-hidden="true" className="size-6 text-[#a5bbd9] sm:size-8" strokeWidth={1.2} />}
          {isLoggingOut ? 'Saindo…' : 'Sair'}
        </button>
      </div>
    </header>
  )
}
