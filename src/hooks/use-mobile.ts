import { useSyncExternalStore } from 'react'

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

function getSnapshot() {
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches
}

function subscribe(onChange: () => void) {
  const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mediaQuery.addEventListener('change', onChange)
  return () => mediaQuery.removeEventListener('change', onChange)
}
