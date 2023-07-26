import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ExcalidrawImperativeAPI } from 'excalidraw/types'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App appTitle={''} useCustom={function (api: ExcalidrawImperativeAPI | null, customArgs?: any[] | undefined): void {
      throw new Error('Function not implemented.')
    } } />
  </React.StrictMode>,
)
