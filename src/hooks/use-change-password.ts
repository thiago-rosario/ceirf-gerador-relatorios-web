import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from './use-auth'

type PasswordFields = {
  current_password: string
  password: string
  password_confirmation: string
}

type FieldErrors = Partial<Record<keyof PasswordFields, string>>

type Options = {
  isLoggingOut: boolean
  onSuccess: () => void
  onSessionInvalid: () => void
}

const emptyValues: PasswordFields = { current_password: '', password: '', password_confirmation: '' }

export function useChangePassword({ isLoggingOut, onSuccess, onSessionInvalid }: Options) {
  const { changePassword } = useAuth()
  const [values, setValues] = useState(emptyValues)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitting = useRef(false)

  const updateField = (field: keyof PasswordFields, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setFieldErrors((current) => ({ ...current, [field]: undefined }))
    setError('')
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting.current || isLoggingOut) return

    const errors: FieldErrors = {}
    if (!values.current_password) errors.current_password = 'Informe a senha temporária utilizada para entrar.'
    if (values.password.length < 8) errors.password = 'A nova senha deve ter pelo menos 8 caracteres.'
    else if (values.password === values.current_password) errors.password = 'Escolha uma senha diferente da senha temporária.'
    if (!values.password_confirmation) errors.password_confirmation = 'Confirme a nova senha.'
    else if (values.password_confirmation !== values.password) errors.password_confirmation = 'As senhas não conferem.'

    setFieldErrors(errors)
    setError('')
    if (Object.keys(errors).length) {
      setError('Confira os campos destacados para salvar a nova senha.')
      return
    }

    submitting.current = true
    setIsSubmitting(true)
    try {
      if (await changePassword(values)) {
        setValues(emptyValues)
        onSuccess()
      }
    } catch (failure) {
      if (failure instanceof Error && 'status' in failure && failure.status === 401) {
        onSessionInvalid()
        return
      }

      setError(failure instanceof Error ? failure.message : 'Não foi possível alterar a senha. Tente novamente.')
      if (failure instanceof Error && 'errors' in failure) {
        const apiErrors = failure.errors as Record<string, string[]>
        setFieldErrors({
          current_password: apiErrors.current_password?.[0],
          password: apiErrors.password?.[0],
          password_confirmation: apiErrors.password_confirmation?.[0],
        })
      }
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  return { values, updateField, fieldErrors, error, isSubmitting, handleSubmit }
}
