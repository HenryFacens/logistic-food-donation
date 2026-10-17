import type { SVGProps } from 'react'

export type AppIconName =
  | 'admin'
  | 'arrow-left'
  | 'arrow-right'
  | 'box'
  | 'camera'
  | 'chart'
  | 'check'
  | 'clock'
  | 'coupon'
  | 'dashboard'
  | 'donation'
  | 'flag'
  | 'home'
  | 'image'
  | 'leaf'
  | 'location'
  | 'minus'
  | 'moon'
  | 'navigation'
  | 'offline'
  | 'package'
  | 'partner'
  | 'pin'
  | 'plus'
  | 'refresh'
  | 'route'
  | 'scan'
  | 'sort'
  | 'star'
  | 'sun'
  | 'truck'
  | 'user'
  | 'warning'
  | 'wifi'

const paths: Record<AppIconName, string> = {
  admin: 'M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Zm0 4v10m-4-5h8',
  'arrow-left': 'm15 18-6-6 6-6',
  'arrow-right': 'm9 18 6-6-6-6',
  box: 'm3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4m-9 4v10',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4V8Zm8 2.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
  chart: 'M4 20V10m6 10V4m6 16v-8m6 8H2',
  check: 'm5 12 4 4L19 6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2',
  coupon: 'M4 7a2 2 0 0 0 2-2h12v4a3 3 0 0 0 0 6v4H6a2 2 0 0 0-2-2V7Zm8-2v14',
  dashboard: 'M4 4h6v7H4V4Zm10 0h6v4h-6V4ZM4 15h6v5H4v-5Zm10-3h6v8h-6v-8Z',
  donation: 'M12 21s-8-4.7-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.3-8 11-8 11Z',
  flag: 'M5 21V4m0 0h11.5l-2 4 2 4H5',
  home: 'm3 11 9-8 9 8v10h-6v-6H9v6H3V11Z',
  image: 'M4 5h16v14H4V5Zm0 11 5-5 4 4 2-2 5 5M15 9h.01',
  leaf: 'M5 19c0-9 5-14 14-14 0 9-5 14-14 14Zm0 0 8-8',
  location: 'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  minus: 'M5 12h14',
  moon: 'M20 15.2A8 8 0 1 1 8.8 4 6.5 6.5 0 0 0 20 15.2Z',
  navigation: 'm3 11 18-8-8 18-2-8-8-2Z',
  offline: 'm3 3 18 18M8.5 8.5A9 9 0 0 1 21 9m-18 0a15 15 0 0 1 2.2-1.6m5.3 5.3A5 5 0 0 1 15 14m-8 0a8 8 0 0 1 1.2-.8M12 18h.01',
  package: 'M12 3 4 7v10l8 4 8-4V7l-8-4Zm-8 4 8 4 8-4m-8 4v10M8 5l8 4',
  partner: 'M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 2a3 3 0 1 0 0-6m-8 7c-4 0-6 2-6 5v2h12v-2c0-3-2-5-6-5Zm8 0c3 0 5 1.8 5 4.5V21h-4',
  pin: 'M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  plus: 'M12 5v14M5 12h14',
  refresh: 'M20 6v5h-5M4 18v-5h5m10-2a7 7 0 0 0-12-4l-3 4m1 2a7 7 0 0 0 12 4l3-4',
  route: 'M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.5 14.5l7-5',
  scan: 'M8 4H5a1 1 0 0 0-1 1v3m12-4h3a1 1 0 0 1 1 1v3M8 20H5a1 1 0 0 1-1-1v-3m12 4h3a1 1 0 0 0 1-1v-3M7 12h10',
  sort: 'M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3',
  star: 'm12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7L12 3Z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  truck: 'M2 6h12v10H2V6Zm12 4h4.5l3.5 3.5V16h-8M6.5 19.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9v-2a7 7 0 0 1 14 0v2',
  warning: 'M12 3 2 21h20L12 3Zm0 6v5m0 3h.01',
  wifi: 'M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01',
}

interface AppIconProps extends SVGProps<SVGSVGElement> {
  name: AppIconName
  size?: number
}

export function AppIcon({ name, size = 20, ...props }: AppIconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      <path
        d={paths[name]}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}
