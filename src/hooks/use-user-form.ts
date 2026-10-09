import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createUser, findUser, listCoordinations, listRoles, updateUser } from '@/service/users-service.js'
import type { Coordination, FieldErrors, Role, User, UserFormValues } from '@/types/users'

export type UserFormOptions = {
  accessToken: string
  userId?: string
  onSaved: (message: string) => void
  onSessionInvalid: () => void
  onPermissionDenied: () => void
  onCurrentUserUpdated?: (user: User) => void
  currentUserId?: string
}

type QueryResult<T> = {
  scope: string
  attempt: number
  data: T | null
  error: string
}

const emptyValues: UserFormValues = { name: '', email: '', password: '', role: '', coordination_id: '' }

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function validationErrors(error: unknown): FieldErrors {
  if (error instanceof Error && 'errors' in error && error.errors && typeof error.errors === 'object') {
    const errors: FieldErrors = {}
    for (const [field, messages] of Object.entries(error.errors)) {
      const message = Array.isArray(messages) ? messages.find((value) => typeof value === 'string') : messages
      if (typeof message === 'string') errors[field] = message
    }
    return errors
  }
  return {}
}

export function useUserForm(options: UserFormOptions) {
  const { accessToken, userId, currentUserId } = options
  const scope = `${accessToken}:${userId ?? 'new'}`
  const callbacks = useRef(options)
  const activeScope = useRef<string | null>(scope)
  const submitting = useRef(false)
  const [rolesAttempt, setRolesAttempt] = useState(0)
  const [coordinationsAttempt, setCoordinationsAttempt] = useState(0)
  const [userAttempt, setUserAttempt] = useState(0)
  const [rolesResult, setRolesResult] = useState<QueryResult<Role[]>>({ scope: '', attempt: -1, data: null, error: '' })
  const [coordinationsResult, setCoordinationsResult] = useState<QueryResult<Coordination[]>>({ scope: '', attempt: -1, data: null, error: '' })
  const [userResult, setUserResult] = useState<QueryResult<User>>({ scope: '', attempt: -1, data: null, error: '' })
  const [form, setForm] = useState({ scope, values: { ...emptyValues } })
  const [submission, setSubmission] = useState<{ scope: string; pending: boolean; error: string; fieldErrors: FieldErrors }>({ scope, pending: false, error: '', fieldErrors: {} })

  useEffect(() => { callbacks.current = options }, [options])

  useEffect(() => {
    activeScope.current = scope
    submitting.current = false
    return () => { activeScope.current = null }
  }, [scope])

  function handleAuthorization(error: unknown, handlers = callbacks.current) {
    if (!(error instanceof Error) || !('status' in error)) return false
    if (error.status === 401) {
      handlers.onSessionInvalid()
      return true
    }
    if (error.status === 403) {
      handlers.onPermissionDenied()
      return true
    }
    return false
  }

  useEffect(() => {
    let cancelled = false
    Promise.resolve()
      .then(() => listRoles(accessToken))
      .then((data: Role[]) => {
        if (!cancelled) setRolesResult({ scope, attempt: rolesAttempt, data, error: '' })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        handleAuthorization(error)
        setRolesResult({ scope, attempt: rolesAttempt, data: null, error: errorMessage(error, 'Não foi possível carregar os perfis.') })
      })
    return () => { cancelled = true }
  }, [accessToken, scope, rolesAttempt])

  useEffect(() => {
    let cancelled = false
    Promise.resolve()
      .then(() => listCoordinations(accessToken))
      .then((data: Coordination[]) => {
        if (!cancelled) setCoordinationsResult({ scope, attempt: coordinationsAttempt, data, error: '' })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        handleAuthorization(error)
        setCoordinationsResult({ scope, attempt: coordinationsAttempt, data: null, error: errorMessage(error, 'Não foi possível consultar as coordenações.') })
      })
    return () => { cancelled = true }
  }, [accessToken, scope, coordinationsAttempt])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    Promise.resolve()
      .then(() => findUser(accessToken, userId))
      .then((data: User) => {
        if (cancelled) return
        setUserResult({ scope, attempt: userAttempt, data, error: '' })
        setForm({ scope, values: { name: data.name, email: data.email, password: '', role: data.role, coordination_id: data.coordination_id === null ? '' : String(data.coordination_id) } })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        handleAuthorization(error)
        setUserResult({ scope, attempt: userAttempt, data: null, error: errorMessage(error, 'Não foi possível carregar este usuário.') })
      })
    return () => { cancelled = true }
  }, [accessToken, scope, userId, userAttempt])

  const rolesLoading = rolesResult.scope !== scope || rolesResult.attempt !== rolesAttempt
  const coordinationsLoading = coordinationsResult.scope !== scope || coordinationsResult.attempt !== coordinationsAttempt
  const userLoading = Boolean(userId) && (userResult.scope !== scope || userResult.attempt !== userAttempt)
  const roles = !rolesLoading ? rolesResult.data ?? [] : []
  const coordinations = !coordinationsLoading ? coordinationsResult.data ?? [] : []
  const rolesError = !rolesLoading ? rolesResult.error : ''
  const coordinationsError = !coordinationsLoading ? coordinationsResult.error : ''
  const userError = userId && !userLoading ? userResult.error : ''
  const values = form.scope === scope ? form.values : emptyValues
  const currentUser = userResult.scope === scope ? userResult.data : null
  const currentCoordination = currentUser?.coordination ?? null
  const effectiveRole = values.role || currentUser?.role || 'OPERATOR'
  const coordinationDisabled = effectiveRole === 'SUPERUSER'
  const coordinationRequired = effectiveRole === 'OPERATOR' || effectiveRole === 'REVIEWER'
  const isSubmitting = submission.scope === scope && submission.pending
  const canSubmit = !rolesLoading && !rolesError && !coordinationsLoading && !coordinationsError && !userLoading && !userError && !isSubmitting

  const setFieldValue = (field: keyof UserFormValues, value: string) => {
    setForm((previous) => ({
      scope,
      values: {
        ...(previous.scope === scope ? previous.values : emptyValues),
        [field]: value,
        ...(field === 'role' && value === 'SUPERUSER' && { coordination_id: '' }),
      },
    }))
    setSubmission((previous) => {
      if (previous.scope !== scope) return previous
      const fieldErrors = { ...previous.fieldErrors }
      delete fieldErrors[field]
      if (field === 'role') delete fieldErrors.coordination_id
      return { ...previous, fieldErrors }
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit || submitting.current) return
    const operationCallbacks = options

    const fieldErrors: FieldErrors = {}
    if (!values.name.trim()) fieldErrors.name = 'Informe o nome do usuário.'
    if (!values.email.trim()) fieldErrors.email = 'Informe o e-mail do usuário.'
    if (!userId && values.password === '') fieldErrors.password = 'Informe a senha inicial do usuário.'
    if (coordinationRequired && !values.coordination_id) fieldErrors.coordination_id = 'Selecione a coordenação do usuário.'
    const coordinationId = coordinationDisabled || !values.coordination_id ? null : Number(values.coordination_id)
    if (coordinationId !== null && (
      !Number.isInteger(coordinationId) || coordinationId <= 0
      || (!coordinations.some((coordination) => coordination.id === coordinationId) && currentCoordination?.id !== coordinationId)
    )) fieldErrors.coordination_id = 'Selecione uma coordenação disponível.'
    if (Object.keys(fieldErrors).length > 0) {
      setSubmission({ scope, pending: false, error: 'Confira os campos informados e tente novamente.', fieldErrors })
      return
    }

    submitting.current = true
    setSubmission({ scope, pending: true, error: '', fieldErrors: {} })
    try {
      const payload = { name: values.name.trim(), email: values.email, ...(values.role && { role: values.role }), coordination_id: coordinationId }
      const user: User = userId
        ? await updateUser(accessToken, userId, payload)
        : await createUser(accessToken, { ...payload, password: values.password })
      // A completed self-edit must update its original session even after navigation.
      if (userId === currentUserId) operationCallbacks.onCurrentUserUpdated?.(user)
      if (activeScope.current !== scope) return
      operationCallbacks.onSaved(userId ? 'Usuário atualizado com sucesso.' : 'Usuário criado com sucesso.')
    } catch (error) {
      if (activeScope.current !== scope) return
      handleAuthorization(error, operationCallbacks)
      setSubmission({ scope, pending: false, error: errorMessage(error, 'Não foi possível salvar o usuário.'), fieldErrors: validationErrors(error) })
    } finally {
      if (activeScope.current === scope) {
        submitting.current = false
        setSubmission((previous) => previous.scope === scope ? { ...previous, pending: false } : previous)
      }
    }
  }

  return {
    values, setFieldValue, handleSubmit, canSubmit, isSubmitting,
    error: submission.scope === scope ? submission.error : '',
    fieldErrors: submission.scope === scope ? submission.fieldErrors : {},
    roles, rolesLoading, rolesError, retryRoles: () => setRolesAttempt((value) => value + 1),
    coordinations, coordinationsLoading, coordinationsError, retryCoordinations: () => setCoordinationsAttempt((value) => value + 1),
    currentCoordination, coordinationRequired, coordinationDisabled,
    userLoading, userError, retryUser: () => setUserAttempt((value) => value + 1),
  }
}
