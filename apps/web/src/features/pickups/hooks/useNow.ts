import { useEffect, useState } from 'react'

/** Current time, refreshed on an interval (keeps render pure). */
export const useNow = (intervalMs: number) => {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}
