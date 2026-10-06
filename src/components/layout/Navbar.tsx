import logoSsp from '@/assets/logo-ssp.png'
import { NavMain } from '@/components/nav-main'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { XIcon } from 'lucide-react'
import { getNavigationItems, type NavigationId, type NavigationItem } from './navigation'

type NavbarProps = {
  role: string
  activeItem: NavigationId
  onNavigate: (href: NavigationItem['href']) => void
}

export function Navbar({ role, activeItem, onNavigate }: NavbarProps) {
  const { isMobile, setOpenMobile } = useSidebar()
  const permittedItems = getNavigationItems(role)

  return (
    <Sidebar collapsible="icon" className="app-navbar">
      <SidebarHeader className="gap-4 border-b px-4 py-5 group-data-[collapsible=icon]:px-2">
        <div className="flex min-h-10 items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground group-data-[collapsible=icon]:hidden">
            ÁREA DE TRABALHO
          </p>
          {isMobile && (
            <Button variant="ghost" size="icon" className="size-11" aria-label="Fechar menu de navegação" onClick={() => setOpenMobile(false)}>
              <XIcon aria-hidden="true" />
            </Button>
          )}
          <span aria-hidden="true" className="hidden text-xs font-semibold text-primary group-data-[collapsible=icon]:block">CE</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-5 py-3">
        <nav aria-label="Navegação principal">
          <NavMain items={permittedItems} activeItem={activeItem} onNavigate={onNavigate} />
        </nav>
        <div className="mx-4 mt-3 rounded-lg border border-border bg-background p-4 text-xs leading-relaxed text-muted-foreground group-data-[collapsible=icon]:hidden">
          <p className="mb-1 font-medium text-primary">Relatórios CEIRF</p>
          <p>Acompanhe os registros e atividades das coordenações.</p>
        </div>
      </SidebarContent>
      <SidebarFooter className="gap-3 border-t px-4 py-5 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <img src={logoSsp} alt="SSP Bahia" className="size-9 shrink-0 object-contain group-data-[collapsible=icon]:size-8" />
          <p className="text-xs leading-relaxed text-muted-foreground group-data-[collapsible=icon]:hidden">Secretaria da<br />Segurança Pública da Bahia</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
