import type { Classification } from '@resgata/shared'
import { useState } from 'react'
import type { ApiClient } from '../../../shared/api'
import { navigate } from '../../../shared/routing'
import { AppIcon } from '../../../shared/ui'
import { VisionClassifier } from '../../vision'
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
            {donationMessages.donateEyebrow} · Cambuí
          </span>
          <h1 className="screen-header__title">
            {donationMessages.donateTitle}
          </h1>
        </div>
        <strong className="producer-screen-header__step">
          {donationMessages.donateStep}
        </strong>
      </header>

      <progress
        aria-label="Etapa 2 de 2"
        className="producer-step-progress"
        max={2}
        value={2}
      />

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
      <DonationForm
        apiClient={apiClient}
        classification={classification}
        onPublished={(outcome) => {
          onPublished?.(outcome)
          if (!onPublished && outcome.status === 'confirmed') {
            navigate('/minhas-doacoes')
          }
        }}
        publisher={publisher}
      />
    </div>
  )
}
