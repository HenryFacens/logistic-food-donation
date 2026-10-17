import type { Classification } from '@resgata/shared'
import { useState } from 'react'
import type { ApiClient } from '../../../shared/api'
import { navigate } from '../../../shared/routing'
import { AppIcon, LoadingState } from '../../../shared/ui'
import { NearbyNeedsPanel } from '../../needs'
import { VisionClassifier } from '../../vision'
import { useSellerProfile } from '../api/location'
import { DonationForm } from '../components/DonationForm'
import { donationMessages } from '../messages'
import type {
  DonationPublisher,
  DonationPublishOutcome,
} from '../model/publish'
import '../producer-mobile.css'

export interface DonatePageProps {
  apiClient: ApiClient
  onPublished?(outcome: DonationPublishOutcome): void
  publisher?: DonationPublisher
}

export function DonatePage({
  apiClient,
  onPublished,
  publisher,
}: DonatePageProps) {
  const [classification, setClassification] = useState<Classification | null>(
    null,
  )
  const profile = useSellerProfile(apiClient)
  const district = profile.data?.address.district ?? 'Cambuí'

  return (
    <div className="resgata-screen producer-confirm-screen">
      <header className="screen-header producer-screen-header">
        <button
          aria-label="Voltar para minhas doações"
          className="producer-screen-header__back"
          onClick={() => navigate('/minhas-doacoes')}
          type="button"
        >
          <AppIcon name="arrow-left" size={30} />
        </button>
        <div className="producer-screen-header__copy">
          <span className="eyebrow">
            {profile.data?.legalName ?? district}
          </span>
          <h1 className="screen-header__title">
            {donationMessages.donateTitle}
          </h1>
        </div>
      </header>

      <VisionClassifier
        apiClient={apiClient}
        onChange={setClassification}
        value={classification}
      />
      {!classification ? (
        <p className="producer-confirm-screen__hint">
          {donationMessages.classificationPending}
        </p>
      ) : null}
      {profile.isPending ? (
        <LoadingState label={donationMessages.loadingShop} />
      ) : (
      <DonationForm
        apiClient={apiClient}
        classification={classification}
        shopAddress={profile.data?.address}
        onPublished={(outcome) => {
          onPublished?.(outcome)
          if (!onPublished && outcome.status === 'confirmed') {
            navigate('/minhas-doacoes')
          }
        }}
        publisher={publisher}
      />
      )}
      <NearbyNeedsPanel />
    </div>
  )
}
