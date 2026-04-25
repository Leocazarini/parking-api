import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutGrid, Users, BarChart2,
  Settings, UserCog, Car, Power, Sun, Moon,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/useToast'
import { ToastContainer } from './Toast'
import type { ReactNode } from 'react'

interface NavItem {
  to: string
  icon: ReactNode
  label: string
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/yard',        icon: <LayoutGrid size={18} />, label: 'Pátio' },
  { to: '/subscribers', icon: <Users size={18} />,     label: 'Mensalistas', adminOnly: true },
  { to: '/financial',   icon: <BarChart2 size={18} />, label: 'Financeiro',  adminOnly: true },
  { to: '/users',       icon: <UserCog size={18} />,   label: 'Usuários',    adminOnly: true },
  { to: '/settings',    icon: <Settings size={18} />,  label: 'Config.',     adminOnly: true },
]

function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    (localStorage.getItem('theme') as 'dark' | 'light') ?? 'dark'
  )

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  return { theme, toggle }
}

function BottomNavItems() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const items = NAV_ITEMS.filter((i) => !i.adminOnly || isAdmin)
  return (
    <>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()
  const [confirmLogout, setConfirmLogout] = useState(false)

  const handleLogout = async () => {
    await logout()
    toast('Sessão encerrada', 'info')
    navigate('/login')
  }

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? '??'
  const ThemeIcon = theme === 'dark' ? Sun : Moon
  const themeLabel = theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'

  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark"><Car size={20} /></div>
          <div>
            <div className="sidebar-logo-text">PARKSYS</div>
            <div className="sidebar-logo-sub">Gestão de Pátio</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Operação</div>
          <NavLink to="/yard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutGrid size={18} /> Pátio
          </NavLink>

          {user?.role === 'admin' && (
            <>
              <div className="sidebar-section-label" style={{ marginTop: 8 }}>Administração</div>
              <NavLink to="/subscribers" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Users size={18} /> Mensalistas
              </NavLink>
              <NavLink to="/financial" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <BarChart2 size={18} /> Financeiro
              </NavLink>
              <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <UserCog size={18} /> Usuários
              </NavLink>
              <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <Settings size={18} /> Configurações
              </NavLink>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <button
            className="nav-item"
            onClick={toggle}
            title={themeLabel}
            style={{ marginBottom: 6 }}
          >
            <ThemeIcon size={16} />
            {themeLabel}
          </button>

          {confirmLogout ? (
            <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600, marginBottom: 8 }}>Encerrar sessão?</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setConfirmLogout(false)}>
                  Cancelar
                </button>
                <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={handleLogout}>
                  Sair
                </button>
              </div>
            </div>
          ) : (
            <div className="user-chip" onClick={() => setConfirmLogout(true)} title="Sair">
              <div className="user-avatar">{initials}</div>
              <div className="user-info">
                <div className="user-name">{user?.username}</div>
                <div className="user-role">{user?.role}</div>
              </div>
              <Power size={14} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="main-content">
        <header className="mobile-header">
          <div className="mobile-header-logo">
            <div className="mobile-header-logo-mark"><Car size={16} /></div>
            PARKSYS
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost btn-icon" onClick={toggle} aria-label={themeLabel}>
              <ThemeIcon size={18} />
            </button>
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => setConfirmLogout((v) => !v)}
              aria-label="Sair"
              style={confirmLogout ? { color: 'var(--red)' } : undefined}
            >
              <Power size={18} />
            </button>
          </div>
        </header>

        {confirmLogout && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 10, padding: '10px 16px',
            background: 'var(--red-bg)', borderBottom: '1px solid var(--red-border)',
          }}
            className="mobile-logout-bar"
          >
            <span style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>Encerrar sessão?</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setConfirmLogout(false)}>Cancelar</button>
              <button className="btn btn-danger btn-sm" onClick={handleLogout}>Sair</button>
            </div>
          </div>
        )}

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </div>

      {/* Bottom nav mobile */}
      <nav className="bottom-nav">
        <div className="bottom-nav-items">
          <BottomNavItems />
        </div>
      </nav>

      <ToastContainer />
    </div>
  )
}
