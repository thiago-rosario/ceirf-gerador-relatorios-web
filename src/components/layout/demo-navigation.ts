import { getNavigationItems } from './navigation'

// Demonstration data uses the same functional navigation as the application.
export function getDemoNavigation(role: string) {
  return getNavigationItems(role)
}
