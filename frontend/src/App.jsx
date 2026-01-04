import React from 'react'
import AppRoutes from './routes/AppRoutes'
import { UserProvider } from './context/user.context'
import Notifications from './components/Notifications'

const App = () => {
  return (
    <UserProvider>
      <Notifications />
      <AppRoutes />
    </UserProvider>
  )
}

export default App