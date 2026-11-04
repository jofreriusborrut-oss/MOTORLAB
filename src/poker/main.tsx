import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PokerApp } from './ui/PokerApp';
import './ui/poker.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PokerApp />
  </StrictMode>,
);
