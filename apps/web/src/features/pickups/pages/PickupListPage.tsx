import { Button, EmptyState, LoadingState } from '../../../shared/ui'
import { usePickupActions, usePickups } from '../api/usePickups'
import { PickupCard } from '../components/PickupCard'
import { pickupMessages } from '../messages'

export function PickupListPage({ audience }: { audience: 'driver' | 'ngo' }) {
  const pickups = usePickups(audience)
  const actions = usePickupActions()

  if (pickups.isPending) return <LoadingState label="Organizando rotas e recebimentos" />
  if (pickups.isError) {
    return (
      <EmptyState
        action={<Button icon="refresh" onClick={() => void pickups.refetch()}>Tentar novamente</Button>}
        description={pickupMessages.loadError}
        icon="warning"
        title="Falha ao carregar"
      />
    )
  }
  if (!pickups.data.items.length) {
    return (
      <EmptyState
        description={audience === 'driver' ? pickupMessages.emptyDriver : pickupMessages.emptyNgo}
        icon="route"
        title={audience === 'driver' ? 'Sem coletas agora' : 'Sem recebimentos agora'}
      />
    )
  }

  return (
    <div className="grid gap-4">
      <div>
        <span className="eyebrow">{audience === 'driver' ? 'Operação em campo' : 'Acompanhamento da ONG'}</span>
        <p className="mb-0">
          {audience === 'driver'
            ? 'Assuma uma rota e confirme cada etapa com código e localização.'
            : 'Acompanhe a chegada e compartilhe o código apenas no recebimento.'}
        </p>
      </div>
      {pickups.data.items.map((pickup) => (
        <PickupCard
          assigning={actions.assign.isPending && actions.assign.variables === pickup.id}
          audience={audience}
          confirming={actions.confirm.isPending && actions.confirm.variables?.pickupId === pickup.id}
          key={pickup.id}
          onAssign={actions.assign.mutateAsync}
          onConfirm={actions.confirm.mutateAsync}
          pickup={pickup}
        />
      ))}
    </div>
  )
}

export function NgoPickupsPage() {
  return <PickupListPage audience="ngo" />
}

export function DriverPickupsPage() {
  return <PickupListPage audience="driver" />
}
