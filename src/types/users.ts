export type User = {
  id: string
  name: string
  email: string
  role: string
  coordination_id: number | null
  coordination: Coordination | null
  is_active: boolean
  created_at: string
  must_change_password?: boolean
  updated_at?: string
}

export type UserFormValues = {
  name: string
  email: string
  password: string
  role: string
  coordination_id: string
}

export type Role = {
  id: number
  code: string
  name: string
  role: string
}

export type Coordination = {
  id: number
  code: string
  name: string
}

export type FieldErrors = Record<string, string>
