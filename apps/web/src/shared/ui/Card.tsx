import type { HTMLAttributes, ReactNode } from 'react'
import { classes } from '../utils/classes'

interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  title?: string
}

export function Card({ children, className, title, ...props }: CardProps) {
  return (
    <section className={classes('card', className)} {...props}>
      {title ? <h2 className="card__title">{title}</h2> : null}
      {children}
    </section>
  )
}

