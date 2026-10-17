import type { Address } from '@resgata/shared'
import { useRef, useState } from 'react'
import type { ApiClient } from '../../../shared/api'
import { AppIcon, Button, SimuladoBadge, StatusBadge } from '../../../shared/ui'
import {
  currentPosition,
  lookupCep,
  reverseGeocode,
  useSaveShopAddress,
  useSellerProfile,
} from '../api/location'
import { donationMessages } from '../messages'
import { AddressAutocomplete } from './AddressAutocomplete'
import {
  addressFromValues,
  applyAddress,
  type DonationFormValues,
} from '../model/publish'

type LocationSource = 'default' | 'shop' | 'gps' | 'cep' | 'search' | 'edited'

const sourceLabels: Record<LocationSource, string> = {
  cep: donationMessages.locationFromCep,
  default: donationMessages.locationDefault,
  edited: donationMessages.locationEdited,
  gps: donationMessages.locationFromGps,
  search: donationMessages.locationFromSearch,
  shop: donationMessages.locationFromShop,
}

const inputClass =
  'min-h-12 rounded-control border border-border bg-surface px-3 font-normal'

interface PickupLocationProps {
  apiClient: ApiClient
  /** True when values start from the shop's registered address. */
  fromShop: boolean
  setValues(update: (current: DonationFormValues) => DonationFormValues): void
  values: DonationFormValues
}

export function PickupLocation({
  apiClient,
  fromShop,
  setValues,
  values,
}: PickupLocationProps) {
  const profile = useSellerProfile(apiClient)
  const saveShop = useSaveShopAddress(apiClient)
  const [source, setSource] = useState<LocationSource>(fromShop ? 'shop' : 'default')
  const [simulated, setSimulated] = useState(false)
  const [busy, setBusy] = useState<'gps' | 'cep' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const lastCep = useRef(values.postalCode.replace(/\D/g, ''))

  const takeAddress = (address: Address, from: LocationSource, isSimulated: boolean) => {
    setValues((current) => applyAddress(current, address))
    lastCep.current = address.postalCode.replace(/\D/g, '')
    setSource(from)
    setSimulated(isSimulated)
    setError(null)
  }

  const locate = async () => {
    setBusy('gps')
    setError(null)
    try {
      const point = await currentPosition()
      const result = await reverseGeocode(apiClient, point)
      takeAddress(result.address, 'gps', result.simulated)
      setEditing(true)
    } catch (caught) {
      setError((caught as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const fillFromCep = async (cep: string) => {
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8 || digits === lastCep.current) return
    lastCep.current = digits
    setBusy('cep')
    setError(null)
    try {
      const result = await lookupCep(apiClient, digits)
      takeAddress(result.address, 'cep', result.simulated)
    } catch (caught) {
      setError((caught as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const edit = (field: keyof DonationFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    if (field !== 'postalCode') setSource('edited')
  }

  const differsFromShop =
    profile.data &&
    (profile.data.address.line1 !== values.line1 ||
      profile.data.address.location.latitude !== Number(values.latitude) ||
      profile.data.address.location.longitude !== Number(values.longitude))

  return (
    <section
      aria-label={donationMessages.pickupDetails}
      className="screen-card producer-location grid gap-3"
    >
      <h2 className="m-0 text-lg font-extrabold">{donationMessages.pickupDetails}</h2>

      <div className="flex items-start gap-3">
        <AppIcon name="location" size={22} />
        <div className="grid flex-1 gap-1">
          <strong>
            {values.line1} · {values.district}
          </strong>
          <span className="text-sm">
            {values.city}/{values.state} · CEP {values.postalCode}
          </span>
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={sourceLabels[source]} tone={source === 'gps' ? 'success' : 'info'} />
            {simulated ? <SimuladoBadge /> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button disabled={busy !== null} icon="route" onClick={() => void locate()}>
          {busy === 'gps' ? donationMessages.locating : donationMessages.useMyLocation}
        </Button>
        <Button onClick={() => setEditing((value) => !value)} variant="ghost">
          {editing ? donationMessages.hideAddress : donationMessages.editAddress}
        </Button>
      </div>

      {error ? (
        <div className="rounded-control border border-warning/30 bg-warning/10 p-3 text-sm" role="alert">
          {error}
        </div>
      ) : null}

      {editing ? (
        <div className="grid gap-3">
          <label className="grid gap-2 font-bold">
            CEP
            <input
              className={inputClass}
              inputMode="numeric"
              onBlur={(event) => void fillFromCep(event.target.value)}
              onChange={(event) => {
                edit('postalCode', event.target.value)
                void fillFromCep(event.target.value)
              }}
              pattern="[0-9]{5}-?[0-9]{3}"
              required
              value={values.postalCode}
            />
            {busy === 'cep' ? (
              <span className="text-sm font-normal">{donationMessages.lookingUpCep}</span>
            ) : null}
          </label>
          <label className="grid gap-2 font-bold" htmlFor="pickup-address-line">
            {donationMessages.addressLine}
            <AddressAutocomplete
              id="pickup-address-line"
              onChange={(line1) => edit('line1', line1)}
              onPlace={(place) =>
                takeAddress(
                  {
                    city: place.city || values.city,
                    district: place.district || values.district,
                    line1: place.line1,
                    location: place.location,
                    postalCode: place.postalCode || values.postalCode,
                    state: place.state || values.state,
                  },
                  'search',
                  false,
                )
              }
              value={values.line1}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-2 font-bold">
              Bairro
              <input
                className={inputClass}
                onChange={(event) => edit('district', event.target.value)}
                required
                value={values.district}
              />
            </label>
            <label className="grid gap-2 font-bold">
              Cidade
              <input
                className={inputClass}
                onChange={(event) => edit('city', event.target.value)}
                required
                value={values.city}
              />
            </label>
            <label className="grid gap-2 font-bold">
              UF
              <input
                className={inputClass}
                maxLength={2}
                onChange={(event) => edit('state', event.target.value.toUpperCase())}
                required
                value={values.state}
              />
            </label>
          </div>
          {differsFromShop ? (
            <Button
              disabled={saveShop.isPending}
              onClick={() =>
                saveShop.mutate(addressFromValues(values), {
                  onSuccess: () => setSource('shop'),
                })
              }
              variant="secondary"
            >
              {saveShop.isPending ? donationMessages.savingShop : donationMessages.saveAsShop}
            </Button>
          ) : null}
          {saveShop.isSuccess ? (
            <StatusBadge label={donationMessages.shopSaved} tone="success" />
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
