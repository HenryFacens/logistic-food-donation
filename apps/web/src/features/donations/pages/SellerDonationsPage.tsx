import type { ApiClient } from '../../../shared/api'
import { SellerDonationSection } from '../components/SellerDonationSection'

export interface SellerDonationsPageProps {
  apiClient: ApiClient
}

export function SellerDonationsPage({
  apiClient,
}: SellerDonationsPageProps) {
  return <SellerDonationSection apiClient={apiClient} />
}
