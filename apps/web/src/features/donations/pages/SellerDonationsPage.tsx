import type { ApiClient } from '../../../shared/api'
import { SellerDonationSection } from '../components/SellerDonationSection'
import '../producer-mobile.css'

export interface SellerDonationsPageProps {
  apiClient: ApiClient
}

export function SellerDonationsPage({
  apiClient,
}: SellerDonationsPageProps) {
  return (
    <SellerDonationSection apiClient={apiClient} presentation="mobile" />
  )
}
