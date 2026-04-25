import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Plus, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react'
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

export default function Users() {
  const { toast } = useToast()
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: getUsers,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>()

  const createMut = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast('Usuário criado', 'success')
      setCreateOpen(false)
      reset()
    },
    onError: (err: unknown) => {
      const msg = (() => {
        if (err && typeof err === 'object' && 'response' in err) {
          const r = (err as { response: { data?: { detail?: string } } }).response
          return r.data?.detail ?? 'Erro ao criar usuário.'
        }
        return 'Erro de conexão.'
      })()
      toast(msg, 'error')
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
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Status</th>
                <th>Criado em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
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
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{u.email}</td>
                  <td>
                    <button
                      className={`badge badge-${u.role}`}
                      style={{ cursor: u.id !== me?.id ? 'pointer' : 'default', border: 'none' }}
                      onClick={() => {
                        if (u.id === me?.id) return
                        toggleRole.mutate({ id: u.id, role: u.role === 'admin' ? 'operator' : 'admin' })
                      }}
                      title={u.id !== me?.id ? 'Clique para alternar perfil' : undefined}
                    >
                      {u.role === 'admin' ? 'Admin' : 'Operador'}
                    </button>
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-active' : 'badge-suspended'}`}>
                      {u.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {new Date(u.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td>
                    {u.id !== me?.id && (
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => toggleActive.mutate({ id: u.id, is_active: !u.is_active })}
                        title={u.is_active ? 'Desativar' : 'Ativar'}
                      >
                        {u.is_active
                          ? <ToggleRight size={18} color="var(--green)" />
                          : <ToggleLeft size={18} color="var(--text-dim)" />
                        }
                      </button>
                    )}
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
              {...register('username', { required: 'Obrigatório' })} />
            {errors.username && <span className="form-error"><AlertCircle size={12} />{errors.username.message}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">E-mail *</label>
            <input type="email" className={`form-input ${errors.email ? 'error' : ''}`}
              {...register('email', { required: 'Obrigatório' })} />
            {errors.email && <span className="form-error"><AlertCircle size={12} />{errors.email.message}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Senha *</label>
            <input type="password" className={`form-input ${errors.password ? 'error' : ''}`}
              {...register('password', { required: 'Obrigatório', minLength: { value: 8, message: 'Mínimo 8 caracteres' } })} />
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
    </div>
  )
}
