import { request } from './api-client.js'
import { isUserId } from './users-access.js'

const invalidResponse = () => new Error('O servidor retornou uma resposta inválida. Tente novamente.')
const isNonEmptyString = (value) => typeof value === 'string' && value.length > 0
const isReferenceOption = (option) => (
  Number.isInteger(option?.id) && option.id > 0
  && isNonEmptyString(option.code)
  && isNonEmptyString(option.name)
)

const validateUser = (user, { requirePasswordState = false, id } = {}) => {
  if (!isUserId(user?.id)
    || !isNonEmptyString(user.name)
    || !isNonEmptyString(user.email)
    || !isNonEmptyString(user.role)
    || !(user.coordination_id === null || (Number.isInteger(user.coordination_id) && user.coordination_id > 0))
    || (user.coordination_id === null
      ? user.coordination !== null
      : !isReferenceOption(user.coordination) || user.coordination.id !== user.coordination_id)
    || typeof user.is_active !== 'boolean'
    || !isNonEmptyString(user.created_at)
    || (requirePasswordState && typeof user.must_change_password !== 'boolean')
    || (user.must_change_password !== undefined && typeof user.must_change_password !== 'boolean')
    || (id !== undefined && user.id !== id)) {
    throw invalidResponse()
  }

  return user
}

const userPath = (id) => {
  if (!isUserId(id)) throw new Error('O identificador do usuário é inválido.')
  return `/users/${id}`
}

/** @param {string} accessToken
 * @param {{ filter?: string, orderBy?: 'ASC' | 'DESC' }} [options]
 * @returns {Promise<import('../types/users').User[]>} */
export const listUsers = async (accessToken, { filter = '', orderBy = 'DESC' } = {}) => {
  const params = new URLSearchParams({ filter, order_by: orderBy })
  const data = await request(`/users?${params}`, { accessToken })

  if (!Array.isArray(data?.users)) throw invalidResponse()
  return data.users.map((user) => validateUser(user, { requirePasswordState: true }))
}

/** @returns {Promise<import('../types/users').User>} */
export const findUser = async (accessToken, id) => (
  validateUser(await request(userPath(id), { accessToken }), { requirePasswordState: true, id })
)

/** @param {string} accessToken
 * @param {{ name: string, email: string, password: string, role?: string, coordination_id?: number | null }} values
 * @returns {Promise<import('../types/users').User>} */
export const createUser = async (accessToken, values) => {
  const body = {
    name: values.name,
    email: values.email.trim().toLowerCase(),
    password: values.password,
    ...(values.role && { role: values.role }),
    ...(values.coordination_id !== undefined && { coordination_id: values.coordination_id }),
  }
  return validateUser(await request('/users', { method: 'POST', accessToken, body }))
}

/** @param {string} accessToken
 * @param {string} id
 * @param {{ name?: string, email?: string, role?: string, coordination_id?: number | null }} values
 * @returns {Promise<import('../types/users').User>} */
export const updateUser = async (accessToken, id, values) => {
  const body = {
    ...(values.name !== undefined && { name: values.name }),
    ...(values.email !== undefined && { email: values.email.trim().toLowerCase() }),
    ...(values.role !== undefined && { role: values.role }),
    ...(values.coordination_id !== undefined && { coordination_id: values.coordination_id }),
  }
  return validateUser(await request(userPath(id), { method: 'PATCH', accessToken, body }), { id })
}

/** @returns {Promise<Pick<import('../types/users').User, 'id' | 'name' | 'email' | 'is_active'>>} */
export const deactivateUser = async (accessToken, id) => {
  const user = await request(`${userPath(id)}/deactivate`, { method: 'PATCH', accessToken })

  if (user?.id !== id || !isNonEmptyString(user.name) || !isNonEmptyString(user.email) || user.is_active !== false) {
    throw invalidResponse()
  }
  return user
}

/** @returns {Promise<{ id: string, must_change_password: true }>} */
export const resetUserPassword = async (accessToken, id) => {
  userPath(id)
  const data = await request(`/auth/reset-password/${id}`, { method: 'POST', accessToken })

  if (data?.id !== id || data.must_change_password !== true) throw invalidResponse()
  return data
}

const validateOptions = (data, key, validateOption) => {
  const options = data?.[key]
  if (!Array.isArray(options) || !options.every(validateOption)) throw invalidResponse()
  return options
}

/** @returns {Promise<import('../types/users').Role[]>} */
export const listRoles = async (accessToken) => (
  validateOptions(await request('/roles', { accessToken }), 'roles', (role) => (
    isReferenceOption(role) && isNonEmptyString(role.role)
  ))
)

/** @returns {Promise<import('../types/users').Coordination[]>} */
export const listCoordinations = async (accessToken) => (
  validateOptions(await request('/coordinations', { accessToken }), 'coordinations', isReferenceOption)
)
