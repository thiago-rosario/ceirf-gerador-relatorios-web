import type { ReactNode } from 'react'
import { CotecAssistant } from '@/components/assistant/CotecAssistant'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Header } from './Header'
import { Footer } from './Footer'
import type { NavigationId, NavigationItem } from './navigation'

type AppLayoutProps = {
  children: ReactNode
  user: { name: string; email: string; role: string }
  activeItem: NavigationId
  userManagementAllowed: boolean
  onNavigate: (href: NavigationItem['href']) => void
  isLoggingOut: boolean
  onLogout: () => void
}

export function AppLayout({ children, user, activeItem, userManagementAllowed, onNavigate, isLoggingOut, onLogout }: AppLayoutProps) {
  const isReportsPage = activeItem === 'reports'

  return (
    <TooltipProvider delay={250}>
      <div className={`app-layout flex min-h-dvh flex-col ${isReportsPage ? 'bg-white' : 'bg-background'}`}>
        <a href="#main-content" className="skip-link">Ir para o conteúdo principal</a>
        <Header user={user} activeItem={activeItem} userManagementAllowed={userManagementAllowed} isLoggingOut={isLoggingOut} onLogout={onLogout} onNavigate={onNavigate} />
        <main id="main-content" tabIndex={-1} className={isReportsPage
          ? 'flex min-w-0 flex-1 flex-col outline-none'
          : '@container/main mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8'}>
          {children}
        </main>
        {isReportsPage ? <footer aria-label="Rodapé da aplicação" className="reports-footer h-12 shrink-0 bg-[#e5ecfb] lg:h-[78px]" /> : <Footer />}
        {!isReportsPage && <CotecAssistant />}
      </div>
    </TooltipProvider>
  )
}
