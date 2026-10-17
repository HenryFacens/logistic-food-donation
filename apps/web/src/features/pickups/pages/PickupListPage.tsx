import { Button, EmptyState, LoadingState } from '../../../shared/ui'
import { usePickupActions, usePickups } from '../api/usePickups'
import { PickupCard } from '../components/PickupCard'
import { pickupMessages } from '../messages'
import { nextPickupAction } from '../viewModels'
import '../pickups.css'

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

  const orderedPickups = [...pickups.data.items].sort((left, right) => {
    const priority = (action: ReturnType<typeof nextPickupAction>) => {
      if (action === 'collect' || action === 'deliver') return 0
      if (action === 'assign') return 1
      return 2
    }
    return priority(nextPickupAction(left)) - priority(nextPickupAction(right))
  })
  const actionable = orderedPickups.filter((pickup) => nextPickupAction(pickup))

  return (
    <div className={`pickups-screen pickups-screen--${audience}`}>
      <header className="pickups-screen__header">
        <span className="eyebrow">{audience === 'driver' ? 'Operação em campo' : 'Entidade receptora'}</span>
        <div className="pickups-screen__title-row">
          <h1>{audience === 'driver' ? 'Corridas para você' : 'Receber doação'}</h1>
          <span className="pickups-screen__count">
            <strong>{audience === 'driver' ? actionable.length : orderedPickups.length}</strong>
            <small>{audience === 'driver' ? 'ações agora' : 'recebimentos'}</small>
          </span>
        </div>
        <p>
          {audience === 'driver'
            ? 'Assuma uma rota e confirme retirada e entrega com código e localização.'
            : 'Acompanhe a chegada e compartilhe o código somente com o coletador no local.'}
        </p>
      </header>
      {orderedPickups.map((pickup) => (
        <PickupCard
          assigning={actions.assign.isPending && actions.assign.variables === pickup.id}
          audience={audience}
          confirming={actions.confirm.isPending && actions.confirm.variables?.pickupId === pickup.id}
          creatingReceipt={
            actions.createReceipt.isPending &&
            actions.createReceipt.variables?.pickupId === pickup.id
          }
          key={pickup.id}
          onAssign={actions.assign.mutateAsync}
          onConfirm={actions.confirm.mutateAsync}
          onCreateReceipt={actions.createReceipt.mutateAsync}
          pickup={pickup}
        />
      ))}
    </div>
  )
}

export function NgoPickupsPage() {
  return <PickupListPage audience="ngo" />
}
