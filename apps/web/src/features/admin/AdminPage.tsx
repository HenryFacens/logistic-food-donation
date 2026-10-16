import { useMemo, useState } from 'react'
import {
  AppIcon,
  Button,
  Card,
  EmptyState,
  LoadingState,
  StatusBadge,
} from '../../shared/ui'
import {
  useDeadLettersQuery,
  useQueueDashboardQuery,
  useReplayDeadLettersMutation,
} from './queries'
import {
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

  return (
    <div className="admin-page">
      <section className="admin-summary" aria-label="Resumo das filas">
        <Card className="admin-summary__card">
          <span>Pendentes</span>
          <strong>{summary.pending}</strong>
          <small>prontas ou agendadas</small>
        </Card>
        <Card className="admin-summary__card">
          <span>Em processamento</span>
          <strong>{summary.inFlight}</strong>
          <small>mensagens em execução</small>
        </Card>
        <Card className="admin-summary__card admin-summary__card--danger">
          <span>Dead-letter</span>
          <strong>{summary.deadLetter}</strong>
          <small>aguardando análise</small>
        </Card>
        <Card className="admin-summary__driver">
          <div>
            <span className="eyebrow">Message bus</span>
            <strong>{queues.data?.driver || '—'}</strong>
          </div>
          <Button
            icon="refresh"
            onClick={() => void queues.refetch()}
            disabled={queues.isFetching}
          >
            Atualizar filas
          </Button>
        </Card>
      </section>

      <Card className="admin-queues">
        <div className="admin-section-heading">
          <div>
            <span className="eyebrow">Operação</span>
            <h2>Saúde das filas</h2>
          </div>
          {queues.data ? (
            <span className="admin-updated">
              Verificado às{' '}
              {new Intl.DateTimeFormat('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }).format(new Date(queues.data.checkedAt))}
            </span>
          ) : null}
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
            <span className="eyebrow">Recuperação</span>
            <h2>Mensagens dead-letter</h2>
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
