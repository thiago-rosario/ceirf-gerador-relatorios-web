const isCoordinationId = (id) => Number.isSafeInteger(id) && id > 0

const isAuthenticatedUser = (user) => (
  typeof user?.id === 'string'
  && user.id.trim().length > 0
  && user.is_active === true
  && user.must_change_password === false
)

/** @returns {{ create: boolean, search: boolean, review: boolean }} */
export const getReportPermissions = (user, coordinationId, isLoading = false) => {
  if (isLoading || !isAuthenticatedUser(user)) {
    return { create: false, search: false, review: false }
  }

  const isSuperuser = user.role === 'SUPERUSER'
  const isReviewer = user.role === 'REVIEWER'
  const belongsToCoordination = (
    isCoordinationId(user.coordination_id)
    && user.coordination_id === coordinationId
  )

  return {
    create: isCoordinationId(coordinationId) && (
      isSuperuser
      || ((user.role === 'OPERATOR' || isReviewer) && belongsToCoordination)
    ),
    search: true,
    // This permits entry to the review screen; the backend defines the queue scope.
    review: isSuperuser || isReviewer,
  }
}

/** @returns {{ screen: 'list' | 'search' } | { screen: 'actions' | 'create' | 'review', coordinationId: number } | null} */
export const getReportsRoute = (pathname) => {
  if (pathname === '/relatorios') return { screen: 'list' }
  if (pathname === '/relatorios/pesquisar') return { screen: 'search' }

  const match = typeof pathname === 'string'
    && pathname.match(/^\/relatorios\/coordenacoes\/([1-9]\d*)(?:\/(novo|revisao))?$/)

  if (!match) return null

  const coordinationId = Number(match[1])
  if (!isCoordinationId(coordinationId)) return null

  if (match[2] === 'novo') return { screen: 'create', coordinationId }
  if (match[2] === 'revisao') return { screen: 'review', coordinationId }
  return { screen: 'actions', coordinationId }
}

export const canAccessReportsRoute = (user, route, isLoading = false) => {
  if (!route) return false

  const permissions = getReportPermissions(user, route.coordinationId, isLoading)

  if (route.screen === 'list' || route.screen === 'search') return permissions.search

  if (!isCoordinationId(route.coordinationId)) return false

  if (route.screen === 'actions') return permissions.search
  if (route.screen === 'create') return permissions.create
  if (route.screen === 'review') return permissions.review
  return false
}
