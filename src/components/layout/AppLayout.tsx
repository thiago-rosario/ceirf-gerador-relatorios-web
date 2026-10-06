import type { CSSProperties, ReactNode } from 'react'
import { CotecAssistant } from '@/components/assistant/CotecAssistant'
import { SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Header } from './Header'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import type { NavigationId, NavigationItem } from './navigation'

type AppLayoutProps = {
  children: ReactNode
  user: { name: string; email: string; role: string }
  activeItem: NavigationId
  onNavigate: (href: NavigationItem['href']) => void
  isLoggingOut: boolean
  onLogout: () => void
}

export function AppLayout({ children, user, activeItem, onNavigate, isLoggingOut, onLogout }: AppLayoutProps) {
  return (
    <TooltipProvider delay={250}>
      <SidebarProvider
        className="app-layout flex-col bg-background"
        style={{ '--sidebar-width': '15rem', '--sidebar-width-icon': '4.25rem' } as CSSProperties}
      >
        <a href="#main-content" className="skip-link">Ir para o conteúdo principal</a>
        <Header user={user} isLoggingOut={isLoggingOut} onLogout={onLogout} />
        <div className="flex min-w-0 flex-1">
          <Navbar role={user.role} activeItem={activeItem} onNavigate={onNavigate} />
          <div className="flex min-w-0 flex-1 flex-col">
            <main id="main-content" tabIndex={-1} className="@container/main mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
              {children}
            </main>
            <Footer />
          </div>
        </div>
        <CotecAssistant />
      </SidebarProvider>
    </TooltipProvider>
  )
}
