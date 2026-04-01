import React from 'react'
import ReactDOM from 'react-dom'
import App from './App'
import GlobalStyles from '@mui/material/GlobalStyles'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
})

ReactDOM.render(
  <React.StrictMode>
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <GlobalStyles styles={{ body: { margin: 0 } }} />
      <App />
    </ThemeProvider>
  </React.StrictMode>,
  document.getElementById('root')
)