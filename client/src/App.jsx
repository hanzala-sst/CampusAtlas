import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LibraryPage from './pages/LibraryPage';
import UploadPage from './pages/UploadPage';
import AskDocPage from './pages/AskDocPage';
import ContributionsPage from './pages/ContributionsPage';
import ModeratorPage from './pages/ModeratorPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LibraryPage />} />
            <Route path="/library" element={<Navigate to="/" replace />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/ask" element={<AskDocPage />} />
            <Route path="/contributions" element={<ContributionsPage />} />
            <Route path="/moderator" element={<ModeratorPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
