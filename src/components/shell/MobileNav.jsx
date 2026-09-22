import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveView, setMobileNavOpen } from '../../store/dataSlice';
import { NAV_GROUPS } from './Navigation';
import { Icon } from '../common/Icons';

/**
 * MobileNav Component
 * 
 * @purpose Responsive mobile navigation drawer with backdrop overlay and tap-to-navigate dismiss interaction.
 */
export const MobileNav = () => {
  const dispatch = useDispatch();
  const { activeView, mobileNavOpen } = useSelector((state) => state.data);

  if (!mobileNavOpen) return null;

  const handleNavigate = (viewId) => {
    dispatch(setActiveView(viewId));
    dispatch(setMobileNavOpen(false));
  };

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        onClick={() => dispatch(setMobileNavOpen(false))}
        aria-hidden="true"
      />

      {/* Slide-out Drawer */}
      <div className="relative w-4/5 max-w-xs bg-slate-950 border-r border-white/10 flex flex-col h-full z-10 shadow-2xl animate-slide-in">
        {/* Mobile Drawer Header */}
        <div className="h-16 px-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Icon name="dashboard" className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-sm text-white block">Project Monitor</span>
              <span className="text-[10px] text-indigo-400 font-semibold uppercase">Mobile Nav</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dispatch(setMobileNavOpen(false))}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {NAV_GROUPS.map((group) => (
            <div key={group.id} className="space-y-1">
              <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                {group.label}
              </h4>
              {group.items.map((item) => {
                const isActive =
                  activeView === item.id ||
                  (item.id === 'employees' && activeView === 'employees-contractors') ||
                  (item.id === 'candidates' && (activeView === 'clients' || activeView === 'vendors')) ||
                  (item.id === 'assignments' && activeView === 'jobs');
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        name={item.icon}
                        className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-white/5 text-center text-xs text-slate-500">
          Project Monitor &bull; v2.4.0
        </div>
      </div>
    </div>
  );
};
