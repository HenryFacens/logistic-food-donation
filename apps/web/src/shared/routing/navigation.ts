const NAVIGATION_EVENT = 'resgata:navigate'

export const navigate = (to: string, replace = false) => {
  if (replace) window.history.replaceState(null, '', to)
  else window.history.pushState(null, '', to)
  window.dispatchEvent(new Event(NAVIGATION_EVENT))
}

export const subscribeToNavigation = (listener: () => void) => {
  window.addEventListener('popstate', listener)
  window.addEventListener(NAVIGATION_EVENT, listener)
  return () => {
    window.removeEventListener('popstate', listener)
    window.removeEventListener(NAVIGATION_EVENT, listener)
  }
}

