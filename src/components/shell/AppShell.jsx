import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Breadcrumbs } from './Breadcrumbs';
import { ToastContainer } from '../common/Feedback';

/**
 * AppShell Component
 * 
 * @purpose Master container implementing the responsive shell layout: Sidebar, Top Header, Mobile Navigation Drawer, Breadcrumbs, and Toast Container.
 * @inputs
 *   - children: ReactNode (The active view content)
 */
export const AppShell = ({ children }) => {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden selection:bg-indigo-500/30 selection:text-white">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Navigation Drawer */}
      <MobileNav />

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header />

        {/* Scrollable Main Canvas */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto">
          {/* Breadcrumb Navigation Trail */}
          <div className="mb-4">
            <Breadcrumbs />
          </div>

          {/* Active View Container */}
          <div className="pb-12 animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Global Floating Toast Notifications */}
      <ToastContainer />
    </div>
  );
};
