import type { Classification } from '@resgata/shared'
import { useState } from 'react'
import type { ApiClient } from '../../../shared/api'
import { navigate } from '../../../shared/routing'
import { VisionClassifier } from '../../vision'
import { DonationForm } from '../components/DonationForm'
import type {
  DonationPublisher,
  DonationPublishOutcome,
} from '../model/publish'

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
    <div className="grid gap-5">
      <VisionClassifier
        apiClient={apiClient}
        onChange={setClassification}
        value={classification}
      />
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
