import React from 'react';

/**
 * DashboardLayout Component
 * 
 * Description: The main layout container that wraps the dashboard content.
 * It provides a responsive, premium dark mode aesthetic using Tailwind CSS.
 * 
 * @param {React.ReactNode} children - The content to be rendered within the layout.
 */
const DashboardLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      <header className="bg-slate-900/50 backdrop-blur-md border-b border-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Project Monitor
            </h1>
          </div>
          <nav>
            <ul className="flex space-x-6 text-sm font-medium text-slate-400">
              <li className="text-white">Dashboard</li>
              <li className="hover:text-white cursor-pointer transition-colors">Projects</li>
              <li className="hover:text-white cursor-pointer transition-colors">Team</li>
            </ul>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {children}
      </main>

      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-slate-500 text-sm border-t border-white/5">
        &copy; {new Date().getFullYear()} Project Monitor. All rights reserved.
      </footer>
    </div>
  );
};

export default DashboardLayout;
