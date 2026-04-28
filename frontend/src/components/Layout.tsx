import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutGrid, Users, BarChart2,
  Settings, UserCog, Car, Power, Sun, Moon, CreditCard, X,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../hooks/useToast'
import { useKeyboardScroll } from '../hooks/useKeyboardScroll'
import { ToastContainer } from './Toast'
import type { ReactNode } from 'react'


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


export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggle } = useTheme()
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const isAdmin = user?.role === 'admin'
  useKeyboardScroll()

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

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
          <NavLink to="/subscriber-payment" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <CreditCard size={18} /> Pag. Mensalista
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

      {/* Mobile Hamburger Drawer */}
      {menuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="mobile-menu-panel" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <div className="sidebar-logo-mark" style={{ width: 30, height: 30, borderRadius: 6 }}>
                <Car size={15} />
              </div>
              <div>
                <div className="sidebar-logo-text" style={{ fontSize: 17 }}>PARKSYS</div>
                <div className="sidebar-logo-sub">Gestão de Pátio</div>
              </div>
              <button className="btn btn-ghost btn-icon mobile-menu-close" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">
                <X size={18} />
              </button>
            </div>

            <nav className="mobile-menu-nav">
              <div className="sidebar-section-label">Operação</div>
              <NavLink to="/yard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <LayoutGrid size={18} /> Pátio
              </NavLink>
              <NavLink to="/subscriber-payment" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                <CreditCard size={18} /> Pag. Mensalista
              </NavLink>

              {isAdmin && (
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

            <div className="mobile-menu-footer">
              <button className="nav-item" onClick={toggle} style={{ marginBottom: 8 }}>
                <ThemeIcon size={16} /> {themeLabel}
              </button>
              {confirmLogout ? (
                <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600, marginBottom: 8 }}>Encerrar sessão?</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setConfirmLogout(false)}>Cancelar</button>
                    <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={handleLogout}>Sair</button>
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
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="main-content">
        <header className="mobile-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              className={`btn btn-ghost btn-icon hamburger-btn${menuOpen ? ' open' : ''}`}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              <span className="hamburger-lines">
                <span /><span /><span />
              </span>
            </button>
            <div className="mobile-header-logo">
              <div className="mobile-header-logo-mark"><Car size={16} /></div>
              PARKSYS
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost btn-icon" onClick={toggle} aria-label={themeLabel}>
              <ThemeIcon size={18} />
            </button>
          </div>
        </header>

        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
