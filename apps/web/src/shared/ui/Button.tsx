import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { classes } from '../utils/classes'
import { AppIcon, type AppIconName } from './AppIcon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: AppIconName
  variant?: 'ghost' | 'primary' | 'secondary'
  children: ReactNode
}

export function Button({
  children,
  className,
  icon,
  type = 'button',
  variant = 'secondary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={classes('button', `button--${variant}`, className)}
      type={type}
      {...props}
    >
      {icon ? <AppIcon name={icon} /> : null}
      <span>{children}</span>
    </button>
  )
}

