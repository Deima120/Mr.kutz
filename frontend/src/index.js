/**
 * Punto de entrada del frontend.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/shared/contexts/AuthContext';
import { SettingsProvider } from '@/shared/contexts/SettingsContext';
import App from './App.js';
import './shared/styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(
    React.StrictMode,
    null,
    React.createElement(
      BrowserRouter,
      null,
      React.createElement(
        AuthProvider,
        null,
        React.createElement(
          SettingsProvider,
          null,
          React.createElement(App)
        )
      )
    )
  )
);
