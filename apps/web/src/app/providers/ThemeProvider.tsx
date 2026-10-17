import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

export type ThemePreference = 'dark' | 'light' | 'system'

const STORAGE_KEY = 'resgata.theme'

interface ThemeContextValue {
  resolvedTheme: 'dark' | 'light'
  setTheme(theme: ThemePreference): void
  theme: ThemePreference
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const restoreTheme = (): ThemePreference => {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'dark' || value === 'light' || value === 'system') return value
  } catch {
    // The light default remains the safe fallback.
  }
  // Light is the default: projectors wash out the dark theme during demos.
  return 'light'
}

const systemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(restoreTheme)
  const [system, setSystem] = useState<'dark' | 'light'>(systemTheme)
  const resolvedTheme = theme === 'system' ? system : theme

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setSystem(media.matches ? 'dark' : 'light')
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  const value = useMemo<ThemeContextValue>(
    () => ({
      resolvedTheme,
      setTheme(nextTheme) {
        try {
          localStorage.setItem(STORAGE_KEY, nextTheme)
        } catch {
          // Theme remains active for the current tab.
        }
        setThemeState(nextTheme)
      },
      theme,
    }),
    [resolvedTheme, theme],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used within ThemeProvider')
  return value
}

