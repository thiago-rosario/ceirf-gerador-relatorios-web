import { useRef, useState } from "react"
import type { RefObject } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Menu } from "@base-ui/react/menu"
import { Popover } from "@base-ui/react/popover"
import { BellIcon, ChevronDownIcon, LoaderCircleIcon, LogOutIcon, SettingsIcon, UserRoundIcon, XIcon } from "lucide-react"

import logoCeirf from "@/assets/logo-ceirf.png"
import { getRoleLabel } from "@/components/layout/navigation"
import { Button } from "@/components/ui/button"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type HeaderUser = { name: string; email: string; role: string }
type AccountPanel = "profile" | "settings" | null

type HeaderProps = {
  user: HeaderUser
  isLoggingOut: boolean
  onLogout: () => void
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words.length ? `${words[0][0]}${words.length > 1 ? words.at(-1)?.[0] : ""}`.toLocaleUpperCase("pt-BR") : "?"
}

function Notifications() {
  return (
    <Popover.Root>
      <Tooltip>
        <TooltipTrigger render={<Popover.Trigger render={<Button variant="ghost" className="size-11 cursor-pointer" />} />} aria-label="Notificações">
          <BellIcon aria-hidden="true" className="size-5" />
        </TooltipTrigger>
        <TooltipContent>Notificações</TooltipContent>
      </Tooltip>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="w-80 max-w-[calc(100vw-2rem)] rounded-lg border bg-popover p-4 text-popover-foreground shadow-sm outline-none">
            <div className="flex items-center justify-between gap-3">
              <Popover.Title className="text-sm font-semibold">Notificações</Popover.Title>
              <Tooltip>
                <TooltipTrigger render={<Popover.Close render={<Button variant="ghost" className="size-11 cursor-pointer" />} />} aria-label="Fechar notificações">
                  <XIcon aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent>Fechar notificações</TooltipContent>
              </Tooltip>
            </div>
            <Popover.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Nenhuma notificação disponível.
            </Popover.Description>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  )
}

function AccountDialog({ panel, onClose, user, triggerRef }: {
  panel: AccountPanel
  onClose: () => void
  user: HeaderUser
  triggerRef: RefObject<HTMLElement | null>
}) {
  return (
    <Dialog.Root open={panel !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-slate-950/20" />
        <Dialog.Popup finalFocus={triggerRef} className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border bg-popover p-6 text-popover-foreground shadow-sm outline-none">
          <div className="flex items-center justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold">{panel === "profile" ? "Meu Perfil" : "Configurações"}</Dialog.Title>
            <Tooltip>
              <TooltipTrigger render={<Dialog.Close render={<Button variant="ghost" className="size-11 cursor-pointer" />} />} aria-label="Fechar janela">
                <XIcon aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent>Fechar</TooltipContent>
            </Tooltip>
          </div>
          <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {panel === "profile" ? "Dados da sua conta na aplicação da CEIRF." : "As configurações da conta ainda não estão disponíveis nesta aplicação."}
          </Dialog.Description>
          {panel === "profile" && (
            <dl className="mt-5 space-y-4 text-sm">
              <div><dt className="text-muted-foreground">Nome</dt><dd className="mt-1 break-words font-medium">{user.name || "Não informado"}</dd></div>
              <div><dt className="text-muted-foreground">E-mail</dt><dd className="mt-1 break-all font-medium">{user.email || "Não informado"}</dd></div>
              <div><dt className="text-muted-foreground">Perfil atual</dt><dd className="mt-1 font-medium">{getRoleLabel(user.role)}</dd></div>
            </dl>
          )}
          <Dialog.Close render={<Button variant="outline" className="mt-6 min-h-11 cursor-pointer px-4" />}>Fechar</Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function Header({ user, isLoggingOut, onLogout }: HeaderProps) {
  const [accountPanel, setAccountPanel] = useState<AccountPanel>(null)
  const userTriggerRef = useRef<HTMLButtonElement | null>(null)
  const { isMobile, open, openMobile } = useSidebar()
  const roleLabel = getRoleLabel(user.role)
  const accountName = user.name || "Minha conta"
  const menuItemClass = "flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 text-sm outline-none transition-colors active:bg-muted data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50"

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between gap-2 border-b bg-card px-3 sm:px-6" aria-label="Cabeçalho da aplicação">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <Tooltip>
          <TooltipTrigger render={<SidebarTrigger className="size-11 cursor-pointer" />} aria-label="Alternar menu de navegação" aria-expanded={isMobile ? openMobile : open} />
          <TooltipContent>Alternar menu de navegação</TooltipContent>
        </Tooltip>
        <img src={logoCeirf} alt="" className="size-9 shrink-0 object-contain sm:size-10" />
        <p className="min-w-0 text-sm font-semibold leading-tight text-primary">
          <span className="block">CEIRF</span>
          <span className="sr-only text-xs font-normal md:not-sr-only md:block">Coordenação Executiva de Infraestrutura da Rede Física</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1 sm:gap-3">
        <Notifications />
        <Menu.Root>
          <Menu.Trigger ref={userTriggerRef} render={<Button variant="ghost" className="h-11 cursor-pointer gap-2 px-1.5 sm:px-2" />} disabled={isLoggingOut} aria-label={`Menu de ${accountName}, perfil ${roleLabel}`}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/10 bg-accent text-xs font-semibold text-primary" aria-hidden="true">{getInitials(user.name)}</span>
            <span className="hidden max-w-40 text-left sm:block">
              <span className="block truncate text-sm font-medium">{accountName}</span>
              <span className="block text-xs text-muted-foreground">{roleLabel}</span>
            </span>
            {isLoggingOut ? <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : <ChevronDownIcon aria-hidden="true" className="size-4" />}
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={8} align="end" className="z-50">
              <Menu.Popup finalFocus={accountPanel ? false : true} className="w-64 max-w-[calc(100vw-2rem)] rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-sm outline-none">
                <Menu.Group>
                  <Menu.GroupLabel className="border-b px-3 py-3 text-sm">
                    <span className="block truncate font-medium">{accountName}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{roleLabel}</span>
                  </Menu.GroupLabel>
                  <Menu.Item className={`${menuItemClass} mt-1`} onClick={() => setAccountPanel("profile")}><UserRoundIcon aria-hidden="true" className="size-4" />Meu Perfil</Menu.Item>
                  <Menu.Item className={menuItemClass} onClick={() => setAccountPanel("settings")}><SettingsIcon aria-hidden="true" className="size-4" />Configurações</Menu.Item>
                  <Menu.Item className={`${menuItemClass} text-destructive`} disabled={isLoggingOut} onClick={onLogout}><LogOutIcon aria-hidden="true" className="size-4" />{isLoggingOut ? "Saindo…" : "Sair"}</Menu.Item>
                </Menu.Group>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
      <AccountDialog panel={accountPanel} onClose={() => setAccountPanel(null)} user={user} triggerRef={userTriggerRef} />
    </header>
  )
}
