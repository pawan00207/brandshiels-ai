import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header.tsx';
import { LandingPage } from './pages/LandingPage.tsx';
import { WorkbenchPage } from './pages/WorkbenchPage.tsx';
import { ReviewQueuePage } from './pages/ReviewQueuePage.tsx';
import { BrandKnowledgePage } from './pages/BrandKnowledgePage.tsx';
import { GovernanceIntelligencePage } from './pages/GovernanceIntelligencePage.tsx';
import { EvaluationPage } from './pages/EvaluationPage.tsx';
import { SettingsPage } from './pages/SettingsPage.tsx';
import { AboutPage } from './pages/AboutPage.tsx';
import { storage } from './db/storage.ts';
import { UserProfile } from './types/index.ts';
import { DEMO_USERS } from './data/seed-data.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => storage.getCurrentUser() || DEMO_USERS[0]);

  useEffect(() => {
    storage.init().then(() => {
      const user = storage.getCurrentUser();
      if (user) {
        setCurrentUser(user);
      }
    });
  }, []);

  const handleUserChange = (newUser: UserProfile) => {
    setCurrentUser(newUser);
  };

  return (
    <BrowserRouter>
      {/* Skip to Content for Accessibility (WCAG 2.2 AA) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-[#B8975A] focus:px-4 focus:py-2 focus:text-xs focus:font-semibold focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>

      <div className="flex min-h-screen flex-col bg-[#FAF8F5] text-stone-900 transition-colors dark:bg-[#0E0E10] dark:text-stone-100">
        <Header currentUser={currentUser} onUserChange={handleUserChange} />

        <main id="main-content" className="flex-1">
          <Routes>
            <Route
              path="/"
              element={<LandingPage currentUser={currentUser} onUserChange={handleUserChange} />}
            />
            <Route path="/workbench" element={<WorkbenchPage currentUser={currentUser} />} />
            <Route path="/queue" element={<ReviewQueuePage currentUser={currentUser} />} />
            <Route path="/knowledge" element={<BrandKnowledgePage currentUser={currentUser} />} />
            <Route
              path="/intelligence"
              element={<GovernanceIntelligencePage currentUser={currentUser} />}
            />
            <Route path="/evaluation" element={<EvaluationPage currentUser={currentUser} />} />
            <Route path="/settings" element={<SettingsPage currentUser={currentUser} />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
