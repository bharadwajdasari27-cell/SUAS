/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthScreens from './components/AuthScreens';
import CompleteProfile from './components/CompleteProfile';
import Dashboard from './components/Dashboard';

function AppContent() {
  const { currentUser, loading, profileCompleted } = useAuth();

  // Root authentication loading states
  if (loading) {
    return (
      <div id="loader_root" className="min-h-screen bg-slate-50 flex flex-col justify-center items-center gap-3">
        <div id="loader_symbol_spin" className="relative flex h-10 w-10">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-10 w-10 bg-indigo-600 shadow-lg shadow-indigo-200"></span>
        </div>
        <p className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase">
          Verifying Identity Session...
        </p>
      </div>
    );
  }

  // Not signed-in view
  if (!currentUser) {
    return <AuthScreens />;
  }

  // Signed in but incomplete public profile document model
  if (!profileCompleted) {
    return <CompleteProfile />;
  }

  // Secure resource granted
  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
