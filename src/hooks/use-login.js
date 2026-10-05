import { useState } from 'react'
import { useAuth } from './use-auth'

export const useLogin = () => {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    setError('')
    setFieldErrors({})

    try {
      await login({ email: email.trim(), password }, remember)
      setPassword('')
    } catch (error) {
      setError(error.message)
      setFieldErrors(error.errors || {})
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    email, setEmail,
    password, setPassword,
    remember, setRemember,
    isSubmitting, error, fieldErrors, handleSubmit,
  }
}
