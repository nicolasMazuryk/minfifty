import React, { StrictMode } from 'react'

import { StyledEngineProvider } from '@mui/material/styles'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'

import api from './api'
import configureStore from './redux/store'
import Routes from './routes'

const store = configureStore(api)

const App: React.FC = () => (
  <StrictMode>
    <Provider store={store}>
      <StyledEngineProvider injectFirst>
        <BrowserRouter>
          <Routes />
        </BrowserRouter>
      </StyledEngineProvider>
    </Provider>
  </StrictMode>
)

export default App
