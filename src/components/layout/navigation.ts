import { FileTextIcon, LayoutDashboardIcon, UsersIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavigationRole = 'user' | 'viewer' | 'reviewer' | 'superuser'
export type NavigationId = 'overview' | 'reports' | 'users'
export type NavigationItem = {
  id: NavigationId
  title: string
  icon: LucideIcon
  href: '/dashboard' | '/relatorios' | '/usuarios'
}

const roles: Record<string, NavigationRole> = {
  OPERATOR: 'user',
  USER: 'user',
  VIEWER: 'viewer',
  REVIEWER: 'reviewer',
  SUPERUSER: 'superuser',
}

export function getNavigationRole(role: string): NavigationRole | undefined {
  return roles[role.toUpperCase()]
}

export function getRoleLabel(role: string): string {
  const normalized = getNavigationRole(role)
  const labels: Record<NavigationRole, string> = {
    user: 'Usuário', viewer: 'Consulta', reviewer: 'Reviewer', superuser: 'SuperUser',
  }
  return normalized ? labels[normalized] : 'Perfil não identificado'
}

export const navigationByRole: Record<NavigationRole, readonly NavigationId[]> = {
  user: ['overview', 'reports'],
  viewer: ['overview', 'reports'],
  reviewer: ['overview', 'reports'],
  superuser: ['overview', 'reports', 'users'],
}

export const navigationItems: Record<NavigationId, NavigationItem> = {
  overview: { id: 'overview', title: 'Visão Geral', icon: LayoutDashboardIcon, href: '/dashboard' },
  reports: { id: 'reports', title: 'Relatórios', icon: FileTextIcon, href: '/relatorios' },
  users: { id: 'users', title: 'Usuários', icon: UsersIcon, href: '/usuarios' },
}

export function getNavigationItems(role: string) {
  const normalized = getNavigationRole(role)
  const ids = normalized ? navigationByRole[normalized] : ['overview'] as const
  return ids.map((id) => navigationItems[id])
}
