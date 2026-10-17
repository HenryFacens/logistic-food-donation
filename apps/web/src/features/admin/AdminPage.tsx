import { useMemo, useState } from 'react'
import {
  AppIcon,
  Button,
  Card,
  EmptyState,
  LoadingState,
  StatusBadge,
} from '../../shared/ui'
import { adminMessages } from './messages'
import {
  useDeadLettersQuery,
  useQueueDashboardQuery,
  useReplayDeadLettersMutation,
} from './queries'
import {
  buildQueueHealth,
  formatQueueAge,
  queueLabels,
  summarizeQueues,
} from './view-model'
import './admin.css'

const queueTone = (count: number) => (count > 0 ? 'danger' : 'success')

export function AdminPage() {
  const [notice, setNotice] = useState<{
    message: string
    tone: 'danger' | 'success'
  } | null>(null)
  const [topic, setTopic] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const queues = useQueueDashboardQuery()
  const deadLetters = useDeadLettersQuery(topic)
  const replay = useReplayDeadLettersMutation()

  const summary = useMemo(
    () => summarizeQueues(queues.data?.queues || []),
    [queues.data?.queues],
  )
  const health = useMemo(
    () => buildQueueHealth(queues.data?.queues || []),
    [queues.data?.queues],
  )
  const visibleSelected = useMemo(() => {
    const available = new Set(
      deadLetters.data?.items.map(({ id }) => id) || [],
    )
    return selected.filter((id) => available.has(id))
  }, [deadLetters.data?.items, selected])
  const allVisibleSelected =
    Boolean(deadLetters.data?.items.length) &&
    deadLetters.data!.items.every(({ id }) => visibleSelected.includes(id))

  const toggleAll = () => {
    if (!deadLetters.data) return
    setSelected(
      allVisibleSelected ? [] : deadLetters.data.items.map(({ id }) => id),
    )
  }

  const runReplay = async () => {
    if (visibleSelected.length === 0) return
    try {
      const result = await replay.mutateAsync(visibleSelected)
      setSelected([])
      setNotice({
        message: `${result.replayed} mensagem(ns) reenfileirada(s); ${result.skipped} ignorada(s).`,
        tone: 'success',
      })
    } catch (error) {
      setNotice({
        message:
          error instanceof Error
            ? error.message
            : 'Falha ao reenfileirar mensagens.',
        tone: 'danger',
      })
    }
  }

  const checkedAt = queues.data
    ? new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(queues.data.checkedAt))
    : null

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <span className="eyebrow">{adminMessages.eyebrow}</span>
          <h2>{adminMessages.title}</h2>
          <p>{adminMessages.subtitle}</p>
        </div>
        <div className="admin-header__meta">
          <StatusBadge
            label={queues.isError ? 'Integração indisponível' : 'Dados operacionais'}
            tone={queues.isError ? 'danger' : 'success'}
          />
          <span>{checkedAt ? `Verificado às ${checkedAt}` : 'Consultando agora'}</span>
        </div>
      </header>

      <Card className="admin-indicator">
        <div>
          <span className="eyebrow">Indicador principal</span>
          <strong>{adminMessages.indicatorTitle}</strong>
        </div>
        <b>{health.healthRate}%</b>
        <p>
          {health.totalQueues === 0
            ? 'Aguardando o message bus retornar as filas configuradas.'
            : `${health.healthyQueues} de ${health.totalQueues} filas não possuem mensagens em dead-letter.`}
        </p>
        <StatusBadge
          label={health.healthRate === 100 ? 'Operação estável' : 'Requer atenção'}
          tone={health.healthRate === 100 ? 'success' : 'warning'}
        />
      </Card>

      <Card className="admin-activity">
        <div className="admin-section-heading">
          <div>
            <span className="eyebrow">Tempo real</span>
            <h2>{adminMessages.activityTitle}</h2>
          </div>
          <Button
            icon="refresh"
            onClick={() => void queues.refetch()}
            disabled={queues.isFetching}
          >
            Atualizar filas
          </Button>
        </div>

        {queues.isPending ? (
          <LoadingState label="Consultando filas" />
        ) : queues.isError ? (
          <EmptyState
            action={
              <Button icon="refresh" onClick={() => void queues.refetch()}>
                Tentar novamente
              </Button>
            }
            description={queues.error.message}
            icon="warning"
            title="Filas indisponíveis"
          />
        ) : (
          <>
            <div className="admin-activity__bars">
              {health.activity.map((state) => (
                <div
                  className={`admin-activity__row admin-activity__row--${state.key}`}
                  key={state.key}
                >
                  <span>{state.label}</span>
                  <div aria-hidden="true">
                    <span style={{ width: `${state.width}%` }} />
                  </div>
                  <strong>{state.value}</strong>
                </div>
              ))}
            </div>
            <div className="admin-activity__metrics">
              <div>
                <span>Mensagens visíveis</span>
                <strong>{health.totalVisibleMessages}</strong>
              </div>
              <div>
                <span>Pendentes</span>
                <strong>{summary.pending}</strong>
              </div>
              <div>
                <span>Em processamento</span>
                <strong>{summary.inFlight}</strong>
              </div>
              <div>
                <span>Dead-letter</span>
                <strong>{summary.deadLetter}</strong>
              </div>
              <div>
                <span>Driver</span>
                <strong>{queues.data.driver}</strong>
              </div>
            </div>
          </>
        )}
      </Card>

      <Card className="admin-queues">
        <div className="admin-section-heading">
          <div>
            <span className="eyebrow">Diagnóstico</span>
            <h2>{adminMessages.queuesTitle}</h2>
          </div>
          <span className="admin-updated">
            Atualização automática a cada 15 segundos
          </span>
        </div>

        {queues.isPending ? (
          <LoadingState label="Consultando filas" />
        ) : queues.isError ? (
          <EmptyState
            action={
              <Button icon="refresh" onClick={() => void queues.refetch()}>
                Tentar novamente
              </Button>
            }
            description={queues.error.message}
            icon="warning"
            title="Filas indisponíveis"
          />
        ) : queues.data.queues.length === 0 ? (
          <EmptyState
            description="O message bus não retornou filas configuradas."
            icon="admin"
            title="Nenhuma fila encontrada"
          />
        ) : (
          <div className="admin-queue-grid">
            {queues.data.queues.map((queue) => (
              <article className="admin-queue" key={queue.name}>
                <div className="admin-queue__heading">
                  <AppIcon name="route" size={22} />
                  <div>
                    <strong>{queueLabels[queue.name] || queue.name}</strong>
                    <code>{queue.name}</code>
                  </div>
                </div>
                <dl>
                  <div>
                    <dt>Prontas</dt>
                    <dd>{queue.ready}</dd>
                  </div>
                  <div>
                    <dt>Agendadas</dt>
                    <dd>{queue.scheduled}</dd>
                  </div>
                  <div>
                    <dt>Processando</dt>
                    <dd>{queue.processing}</dd>
                  </div>
                </dl>
                <div className="admin-queue__footer">
                  <StatusBadge
                    label={`${queue.deadLetter} dead-letter`}
                    tone={queueTone(queue.deadLetter)}
                  />
                  <span>{formatQueueAge(queue.oldestMessageAt)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Card className="admin-dead-letters">
        <div className="admin-section-heading admin-section-heading--actions">
          <div>
            <span className="eyebrow">Recuperação real</span>
            <h2>{adminMessages.deadLettersTitle}</h2>
          </div>
          <div className="admin-toolbar">
            <label>
              <span>Filtrar por fila</span>
              <select
                value={topic}
                onChange={(event) => {
                  setTopic(event.target.value)
                  setSelected([])
                }}
              >
                <option value="">Todas</option>
                {queues.data?.queues.map((queue) => (
                  <option key={queue.name} value={queue.name}>
                    {queueLabels[queue.name] || queue.name}
                  </option>
                ))}
              </select>
            </label>
            <Button
              icon="refresh"
              onClick={() => void deadLetters.refetch()}
              disabled={deadLetters.isFetching}
            >
              Atualizar lista
            </Button>
            <Button
              icon="refresh"
              onClick={() => void runReplay()}
              disabled={visibleSelected.length === 0 || replay.isPending}
              variant="primary"
            >
              Reenfileirar ({visibleSelected.length})
            </Button>
          </div>
        </div>

        <p className="admin-dead-letters__note">
          A seleção, o filtro, a leitura do payload e o replay idempotente abaixo
          continuam conectados aos endpoints administrativos existentes.
        </p>

        {notice ? (
          <div
            className={`admin-notice admin-notice--${notice.tone}`}
            role={notice.tone === 'danger' ? 'alert' : 'status'}
          >
            <AppIcon
              name={notice.tone === 'success' ? 'check' : 'warning'}
            />
            <span>{notice.message}</span>
            <Button onClick={() => setNotice(null)} variant="ghost">
              Fechar
            </Button>
          </div>
        ) : null}

        {deadLetters.isPending ? (
          <LoadingState label="Carregando mensagens dead-letter" />
        ) : deadLetters.isError ? (
          <EmptyState
            action={
              <Button icon="refresh" onClick={() => void deadLetters.refetch()}>
                Tentar novamente
              </Button>
            }
            description={deadLetters.error.message}
            icon="warning"
            title="Dead-letters indisponíveis"
          />
        ) : deadLetters.data.items.length === 0 ? (
          <EmptyState
            description="Não há mensagens pendentes de replay para o filtro selecionado."
            icon="check"
            title="Fila de exceções limpa"
          />
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <caption className="admin-visually-hidden">
                Mensagens dead-letter disponíveis para replay
              </caption>
              <thead>
                <tr>
                  <th scope="col">
                    <input
                      aria-label="Selecionar todas as mensagens visíveis"
                      checked={allVisibleSelected}
                      onChange={toggleAll}
                      type="checkbox"
                    />
                  </th>
                  <th scope="col">Fila e evento</th>
                  <th scope="col">Erro</th>
                  <th scope="col">Tentativas</th>
                  <th scope="col">Entrada</th>
                  <th scope="col">Payload</th>
                </tr>
              </thead>
              <tbody>
                {deadLetters.data.items.map((message) => (
                  <tr key={message.id}>
                    <td>
                      <input
                        aria-label={`Selecionar ${message.eventType}`}
                        checked={selected.includes(message.id)}
                        onChange={() =>
                          setSelected((current) =>
                            current.includes(message.id)
                              ? current.filter((id) => id !== message.id)
                              : [...current, message.id],
                          )
                        }
                        type="checkbox"
                      />
                    </td>
                    <td>
                      <strong>{queueLabels[message.topic] || message.topic}</strong>
                      <code>{message.eventType}</code>
                    </td>
                    <td className="admin-table__error">{message.error}</td>
                    <td>{message.attempts}</td>
                    <td>
                      {new Intl.DateTimeFormat('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      }).format(new Date(message.deadLetteredAt))}
                    </td>
                    <td>
                      <details aria-label={`Payload de ${message.eventType}`}>
                        <summary>Ver JSON</summary>
                        <pre>{JSON.stringify(message.payload, null, 2)}</pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
