const userIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const isUserId = (id) => typeof id === 'string' && userIdPattern.test(id)

export const canManageUsers = (user) => (
  typeof user?.role === 'string'
  && user.role.toUpperCase() === 'SUPERUSER'
  && !user.must_change_password
)

/** @returns {{ screen: 'list' } | { screen: 'create' } | { screen: 'edit', id: string } | null} */
export const getUsersRoute = (pathname) => {
  if (pathname === '/usuarios') return { screen: 'list' }
  if (pathname === '/usuarios/novo') return { screen: 'create' }

  const match = typeof pathname === 'string' && pathname.match(/^\/usuarios\/([^/]+)\/editar$/)
  return match && isUserId(match[1]) ? { screen: 'edit', id: match[1] } : null
}
