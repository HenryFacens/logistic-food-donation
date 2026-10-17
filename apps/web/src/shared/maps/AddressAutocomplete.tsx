import { useEffect, useState } from 'react'
import {
  searchAddresses,
  type ParsedPlaceAddress,
} from './addressSearch'
import './maps.css'

interface AddressAutocompleteProps {
  id?: string
  onChange(value: string): void
  onPlace(place: ParsedPlaceAddress): void
  value: string
}

export function AddressAutocomplete({
  id,
  onChange,
  onPlace,
  value,
}: AddressAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<ParsedPlaceAddress[]>([])

  useEffect(() => {
    if (!open) return
    const query = value.trim()
    if (query.length < 3) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchAddresses(query, controller.signal)
        .then((places) => {
          if (!controller.signal.aborted) setSuggestions(places)
        })
        .catch(() => {
          if (!controller.signal.aborted) setSuggestions([])
        })
    }, 350)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [open, value])

  const visible = value.trim().length >= 3 ? suggestions : []

  const choose = (place: ParsedPlaceAddress) => {
    setOpen(false)
    setSuggestions([])
    onPlace(place)
  }

  return (
    <div className="address-suggest">
      <input
        autoComplete="off"
        className="min-h-12 rounded-control border border-border bg-surface px-3 font-normal"
        id={id}
        onChange={(event) => {
          setOpen(true)
          onChange(event.target.value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setOpen(false)
            return
          }
          if (event.key !== 'Enter') return
          event.preventDefault()
          const first = visible[0]
          if (first) choose(first)
        }}
        required
        value={value}
      />
      {open && visible.length ? (
        <ul className="address-suggest__list">
          {visible.map((place) => (
            <li key={`${place.line1}-${place.location.latitude}-${place.location.longitude}`}>
              <button
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(place)}
                type="button"
              >
                <strong>{place.line1}</strong>
                <span>
                  {[place.district, place.city, place.state].filter(Boolean).join(' · ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
