import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Plus, AlertCircle, ToggleLeft, ToggleRight, X, ChevronRight, UserX, UserCheck } from 'lucide-react'
import { getUsers, createUser, updateUser } from '../api/users'
import { Modal } from '../components/Modal'
import { useToast } from '../hooks/useToast'
import { useAuth } from '../contexts/AuthContext'
import type { User } from '../types'

interface CreateForm {
  username: string
  email: string
  password: string
  role: string
}

// ──────────────────────────────────────────────────────────────────────────────
// Detail panel (mobile)
// ──────────────────────────────────────────────────────────────────────────────

function UserDetailPanel({
  user: u,
  me,
  onClose,
  onToggleActive,
  onToggleRole,
  isTogglingActive,
  isTogglingRole,
}: {
  user: User
  me: User | null | undefined
  onClose: () => void
  onToggleActive: () => void
  onToggleRole: () => void
  isTogglingActive: boolean
  isTogglingRole: boolean
}) {
  const isSelf = u.id === me?.id

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 90, display: 'flex', justifyContent: 'flex-end' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border-light)', width: '100%', maxWidth: 440, height: '100%', overflowY: 'auto', padding: 24, animation: 'modal-up 0.3s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--amber-bg)', border: '2px solid var(--amber-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Barlow Condensed', fontWeight: 900, fontSize: 18, color: 'var(--amber)',
              flexShrink: 0,
            }}>
              {u.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontFamily: 'Barlow Condensed', fontSize: 26, fontWeight: 900, letterSpacing: '0.02em', lineHeight: 1.1 }}>
                {u.username}
                {isSelf && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8, fontFamily: 'DM Sans', fontWeight: 400 }}>
                    (você)
                  </span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2, wordBreak: 'break-all' }}>{u.email}</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Info cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <div className="card" style={{ padding: 12 }}>
            <div className="stat-label">Perfil</div>
            <div style={{ marginTop: 8 }}>
              <span className={`badge badge-${u.role}`}>
                {u.role === 'admin' ? 'Admin' : 'Operador'}
              </span>
            </div>
          </div>
          <div className="card" style={{ padding: 12 }}>
            <div className="stat-label">Status</div>
            <div style={{ marginTop: 8 }}>
              <span className={`badge ${u.is_active ? 'badge-active' : 'badge-suspended'}`}>
                {u.is_active ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
          <div className="card" style={{ padding: 12, gridColumn: '1 / -1' }}>
            <div className="stat-label">Cadastrado em</div>
            <div style={{ fontSize: 14, marginTop: 6 }}>
              {new Date(u.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          {isSelf ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
              Você não pode modificar sua própria conta
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                className="btn btn-secondary w-full"
                onClick={onToggleRole}
                disabled={isTogglingRole}
              >
                {isTogglingRole
                  ? <><div className="spinner" style={{ width: 15, height: 15 }} /> Alterando…</>
                  : `Tornar ${u.role === 'admin' ? 'Operador' : 'Administrador'}`
                }
              </button>
              {u.is_active ? (
                <button
                  className="btn btn-secondary w-full"
                  style={{ color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)' }}
                  onClick={onToggleActive}
                  disabled={isTogglingActive}
                >
                  {isTogglingActive
                    ? <><div className="spinner" style={{ width: 15, height: 15 }} /> Desativando…</>
                    : <><UserX size={15} /> Desativar usuário</>
                  }
                </button>
              ) : (
                <button
                  className="btn btn-primary w-full"
                  onClick={onToggleActive}
                  disabled={isTogglingActive}
                >
                  {isTogglingActive
                    ? <><div className="spinner" style={{ width: 15, height: 15 }} /> Ativando…</>
                    : <><UserCheck size={15} /> Ativar usuário</>
                  }
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────────────────────

export default function Users() {
  const { toast } = useToast()
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: getUsers,
  })

  const detailUser = detailId !== null ? (users.find((u) => u.id === detailId) ?? null) : null

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>()

  const createMut = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast('Usuário criado', 'success')
      setCreateOpen(false)
      reset()
    },
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateUser(id, { is_active }),
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast(`${u.username} ${u.is_active ? 'ativado' : 'desativado'}`, 'info')
    },
  })

  const toggleRole = useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      updateUser(id, { role }),
    onSuccess: (u) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast(`${u.username} agora é ${u.role}`, 'info')
    },
  })

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Usuários</div>
          <div className="page-subtitle">{users.length} cadastrados</div>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus size={16} /> Novo Usuário
        </button>
      </div>

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /> Carregando…</div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Usuário</th>
                <th className="col-desktop">E-mail</th>
                <th>Perfil</th>
                <th>Status</th>
                <th className="col-desktop">Criado em</th>
                <th className="col-desktop"></th>
                <th className="col-desktop"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setDetailId(u.id)}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--amber-bg)', border: '1px solid var(--amber-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: 12, color: 'var(--amber)',
                        flexShrink: 0,
                      }}>
                        {u.username.slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600 }}>
                        {u.username}
                        {u.id === me?.id && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>(você)</span>}
                      </span>
                    </div>
                  </td>
                  <td className="col-desktop" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{u.email}</td>
                  <td>
                    <span className={`badge badge-${u.role}`}>
                      {u.role === 'admin' ? 'Admin' : 'Operador'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-active' : 'badge-suspended'}`}>
                      {u.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="col-desktop" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  {/* Coluna do toggle — só no desktop */}
                  <td className="col-desktop">
                    {u.id !== me?.id && (
                      <button
                        className="btn btn-ghost btn-icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleActive.mutate({ id: u.id, is_active: !u.is_active })
                        }}
                        title={u.is_active ? 'Desativar' : 'Ativar'}
                        style={{ padding: 6 }}
                      >
                        {u.is_active
                          ? <ToggleRight size={28} color="var(--green)" />
                          : <ToggleLeft size={28} color="var(--text-dim)" />
                        }
                      </button>
                    )}
                  </td>
                  {/* Chevron como button — garante toque confiável em iOS (só no desktop) */}
                  <td className="col-desktop" style={{ padding: '0 8px' }}>
                    <button
                      className="btn btn-ghost btn-icon"
                      onClick={(e) => { e.stopPropagation(); setDetailId(u.id) }}
                      style={{ padding: 6 }}
                      aria-label={`Ver detalhes de ${u.username}`}
                    >
                      <ChevronRight size={16} color="var(--text-dim)" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); reset() }} title="Novo Usuário">
        <form onSubmit={handleSubmit((d) => createMut.mutate(d))}>
          <div className="form-group">
            <label className="form-label">Nome de usuário *</label>
            <input className={`form-input ${errors.username ? 'error' : ''}`}
              autoCapitalize="none"
              placeholder="min. 3 caracteres"
              {...register('username', {
                required: 'Obrigatório',
                minLength: { value: 3, message: 'Mínimo 3 caracteres' },
                maxLength: { value: 50, message: 'Máximo 50 caracteres' },
                pattern: { value: /^[a-zA-Z0-9_]+$/, message: 'Use apenas letras, números e _' },
              })} />
            {errors.username && <span className="form-error"><AlertCircle size={12} />{errors.username.message}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">E-mail *</label>
            <input type="email" className={`form-input ${errors.email ? 'error' : ''}`}
              {...register('email', {
                required: 'Obrigatório',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'E-mail inválido' },
                maxLength: { value: 255, message: 'Máximo 255 caracteres' },
              })} />
            {errors.email && <span className="form-error"><AlertCircle size={12} />{errors.email.message}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Senha *</label>
            <input type="password" className={`form-input ${errors.password ? 'error' : ''}`}
              {...register('password', {
                required: 'Obrigatório',
                minLength: { value: 8, message: 'Mínimo 8 caracteres' },
                maxLength: { value: 128, message: 'Senha muito longa' },
              })} />
            {errors.password && <span className="form-error"><AlertCircle size={12} />{errors.password.message}</span>}
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Perfil</label>
            <div className="select-wrapper">
              <select className="form-select" defaultValue="operator" {...register('role')}>
                <option value="operator">Operador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={createMut.isPending}>
            {createMut.isPending ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Criando…</> : 'Criar Usuário'}
          </button>
        </form>
      </Modal>

      {detailUser && (
        <UserDetailPanel
          user={detailUser}
          me={me}
          onClose={() => setDetailId(null)}
          onToggleActive={() => toggleActive.mutate({ id: detailUser.id, is_active: !detailUser.is_active })}
          onToggleRole={() => toggleRole.mutate({ id: detailUser.id, role: detailUser.role === 'admin' ? 'operator' : 'admin' })}
          isTogglingActive={toggleActive.isPending}
          isTogglingRole={toggleRole.isPending}
        />
      )}
    </div>
  )
}
