import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveView } from '../../store/dataSlice';
import { NAV_GROUPS } from './Navigation';
import { Icon } from '../common/Icons';

/**
 * Sidebar Component
 * 
 * @purpose Main desktop navigation panel supporting grouped categories, collapse/expand toggle, and active route indicators.
 */
export const Sidebar = () => {
  const dispatch = useDispatch();
  const { activeView, sidebarCollapsed } = useSelector((state) => state.data);

  return (
    <aside
      className={`hidden lg:flex flex-col bg-slate-950/80 backdrop-blur-xl border-r border-white/5 transition-all duration-300 ease-in-out shrink-0 select-none z-20 ${sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-white/5">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shrink-0 shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Icon name="dashboard" className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          {!sidebarCollapsed && (
            <div className="truncate">
              <span className="font-bold text-sm bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 block tracking-tight">
                Financial and Time sheet
              </span>
              <span className="text-[10px] uppercase font-semibold text-indigo-400 tracking-wider block">
                Management
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Group Items */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        {NAV_GROUPS.map((group) => (
          <div key={group.id} className="space-y-1">
            {!sidebarCollapsed && (
              <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                {group.label}
              </h4>
            )}
            {group.items.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => dispatch(setActiveView(item.id))}
                  title={sidebarCollapsed ? `${item.label} (${group.label})` : undefined}
                  className={`w-full group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${isActive
                    ? 'bg-indigo-600/20 text-white shadow-sm shadow-indigo-600/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/80'
                    }`}
                >
                  {/* Active Indicator Bar */}
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-500 rounded-r-full shadow-sm shadow-indigo-500" />
                  )}

                  <Icon
                    name={item.icon}
                    className={`w-4 h-4 shrink-0 transition-colors ${isActive
                      ? 'text-indigo-400'
                      : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                  />

                  {!sidebarCollapsed && (
                    <div className="flex-1 flex items-center justify-between truncate text-left">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${isActive
                            ? 'bg-indigo-500/30 text-indigo-200'
                            : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                            }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer / Status Indicator */}
      <div className="p-3 border-t border-white/5 bg-slate-950/40">
        <div
          className={`flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 border border-white/5 ${sidebarCollapsed ? 'justify-center' : ''
            }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
          {!sidebarCollapsed && (
            <div className="truncate text-[11px]">
              <span className="font-semibold text-slate-300 block leading-tight">API Mock Gateway</span>
              <span className="text-slate-400 text-[10px]">Ready for Phase 2</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
