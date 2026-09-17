import { NavLink } from 'react-router-dom'

const ICON_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
}

const TABS = [
  {
    to: '/',
    end: true,
    label: 'Recipes',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M4 5.5C4 4.67 4.67 4 5.5 4H12v16H5.5C4.67 20 4 19.33 4 18.5z" />
        <path d="M20 5.5C20 4.67 19.33 4 18.5 4H12v16h6.5c.83 0 1.5-.67 1.5-1.5z" />
      </svg>
    ),
  },
  {
    to: '/batches/new',
    label: 'Log batch',
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    to: '/serve',
    label: 'Serve',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M4 11h16c0 4.5-3.58 8-8 8s-8-3.5-8-8Z" />
        <path d="M9 7c-.8-.8-.8-1.6 0-2.4M15 7c.8-.8.8-1.6 0-2.4" />
      </svg>
    ),
  },
  {
    to: '/freezer',
    label: 'Freezer',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11" />
      </svg>
    ),
  },
  {
    to: '/history',
    label: 'History',
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} className="bottom-nav-tab">
          {tab.icon}
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
