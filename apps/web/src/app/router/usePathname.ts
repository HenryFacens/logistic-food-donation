import { useSyncExternalStore } from 'react'
import { subscribeToNavigation } from '../../shared/routing'

const getPathname = () => window.location.pathname

export const usePathname = () =>
  useSyncExternalStore(subscribeToNavigation, getPathname, () => '/')

