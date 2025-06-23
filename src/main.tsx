import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryProvider } from './components/QueryProvider';
import App from './App.tsx';
import LandingPage from './pages/LandingPage.tsx';
import LoginPage from './pages/LoginPage.tsx';
import SignupPage from './pages/SignupPage.tsx';
import AuthCallbackPage from './pages/AuthCallbackPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import DuelPage from './pages/DuelPage.tsx';
import PracticePage from './pages/PracticePage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import RequireAuth from './components/RequireAuth.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<LandingPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            <Route path="auth/callback" element={<AuthCallbackPage />} />
            <Route path="dashboard" element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            } />
            <Route path="duel/:id" element={
              <RequireAuth>
                <DuelPage />
              </RequireAuth>
            } />
            <Route path="practice" element={
              <RequireAuth>
                <PracticePage />
              </RequireAuth>
            } />
            <Route path="profile" element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            } />
            <Route path="profile/:userId" element={<ProfilePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  </StrictMode>
);