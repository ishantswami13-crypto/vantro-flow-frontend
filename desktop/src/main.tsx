import React from 'react';
import ReactDOM from 'react-dom/client';
import { initClient, track } from './api';
import { App } from './App';
import './styles.css';

window.addEventListener('error', () => track('client.app_crashed', { reason: 'error' }));
window.addEventListener('unhandledrejection', () => track('client.app_crashed', { reason: 'unhandled_rejection' }));

void initClient().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
});
