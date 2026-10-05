import { AuthProvider } from './context/auth-context'
import Router from './router/router'

const App = () => {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  )
}

export default App
