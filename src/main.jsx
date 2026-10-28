import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

const isZoomShortcut = (event) => (
  (event.ctrlKey || event.metaKey)
  && (['+', '-', '=', '0'].includes(event.key) || ['NumpadAdd', 'NumpadSubtract', 'Numpad0'].includes(event.code))
);

window.addEventListener('wheel', (event) => {
  if (event.ctrlKey || event.metaKey) event.preventDefault();
}, { passive: false });

window.addEventListener('keydown', (event) => {
  if (isZoomShortcut(event)) event.preventDefault();
});

for (const eventName of ['gesturestart', 'gesturechange', 'gestureend']) {
  window.addEventListener(eventName, (event) => event.preventDefault(), { passive: false });
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);