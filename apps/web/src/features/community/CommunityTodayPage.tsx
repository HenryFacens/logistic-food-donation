import { AppIcon, AppLink, SimuladoBadge } from '../../shared/ui'
import { communityMessages } from './messages'
import './community.css'

const availability = [
  {
    category: 'Frutas e verduras',
    distance: '1,2 km',
    entity: 'Entidade Esperança',
    hours: 'a partir das 16h',
    icon: 'leaf' as const,
  },
  {
    category: 'Pães',
    distance: '3,8 km',
    entity: 'Cozinha Comunitária Sol',
    hours: 'das 14h às 17h',
    icon: 'box' as const,
  },
]

export function CommunityTodayPage() {
  return (
    <div className="community-today">
      <header className="community-today__heading">
        <div>
          <div className="community-today__brand">
            <span className="community-today__logo">
              <AppIcon name="check" size={22} />
            </span>
            <strong>Resgata</strong>
          </div>
          <h1>{communityMessages.title}</h1>
        </div>
        <button className="community-today__city" type="button">
          <AppIcon name="location" />
          Campinas
        </button>
      </header>

      <div className="community-today__intro">
        <p>{communityMessages.description}</p>
        <SimuladoBadge />
      </div>

      <section className="community-today__list" aria-label="Disponibilidade">
        {availability.map((item) => (
          <article className="community-entry" key={item.entity}>
            <div className="community-entry__heading">
              <h2>{item.entity}</h2>
              <span>{item.distance}</span>
            </div>
            <p>
              <AppIcon name={item.icon} size={24} />
              <span>
                {item.category} · <strong>{item.hours}</strong>
              </span>
            </p>
            <a
              className="community-entry__route"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.entity}, Campinas`)}`}
              rel="noreferrer"
              target="_blank"
            >
              <AppIcon name="route" />
              Como chegar
            </a>
          </article>
        ))}
      </section>

      <section className="community-whatsapp">
        <h2>Receba o aviso no WhatsApp</h2>
        <p>{communityMessages.whatsapp}</p>
        <small>{communityMessages.privacy}</small>
      </section>

      <AppLink className="community-today__login" href="/entrar">
        Entrar na operação
        <AppIcon name="arrow-right" />
      </AppLink>
    </div>
  )
}
