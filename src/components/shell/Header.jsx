import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  setSelectedOrgId,
  setMobileNavOpen,
  toggleSidebar,
  addToast,
} from '../../store/dataSlice';
import { Icon } from '../common/Icons';

/**
 * Header Component
 * 
 * @purpose Top enterprise application bar hosting Organization Switcher, Global Search, Notifications, and User Identity.
 */
export const Header = () => {
  const dispatch = useDispatch();
  const { organizations, selectedOrgId, sidebarCollapsed } = useSelector(
    (state) => state.data
  );

  const [showNotifications, setShowNotifications] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);

  const currentOrg = organizations.find((o) => o.id === selectedOrgId) || {
    name: 'Apex Global Solutions Inc.',
    code: 'APEX',
  };

  const handleOrgSwitch = (orgId) => {
    dispatch(setSelectedOrgId(orgId));
    setShowOrgDropdown(false);
    const newOrg = organizations.find((o) => o.id === orgId);
    dispatch(
      addToast({
        title: 'Organization Switched',
        message: `Active tenant context set to ${newOrg?.name || orgId}`,
        type: 'info',
      })
    );
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/70 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 flex items-center justify-between transition-all duration-300">
      {/* Left: Mobile menu toggle & Desktop sidebar toggle & Brand */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger */}
        <button
          type="button"
          onClick={() => dispatch(setMobileNavOpen(true))}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Open mobile navigation"
        >
          <Icon name="menu" className="w-5 h-5" />
        </button>

        {/* Desktop Sidebar Collapse Button */}
        <button
          type="button"
          onClick={() => dispatch(toggleSidebar())}
          className="hidden lg:flex p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon name="menu" className="w-4 h-4" />
        </button>

        {/* Organization Switcher Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowOrgDropdown(!showOrgDropdown)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs font-semibold text-white transition-all shadow-sm"
          >
            <div className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
              {currentOrg.code ? currentOrg.code.substring(0, 2) : 'OR'}
            </div>
            <span className="max-w-[140px] sm:max-w-[200px] truncate">
              {currentOrg.name}
            </span>
            <Icon name="chevronDown" className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {showOrgDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowOrgDropdown(false)}
              />
              <div className="absolute left-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-1.5 z-20">
                <div className="px-3 py-2 text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Select Organization
                </div>
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => handleOrgSwitch(org.id)}
                    className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors ${
                      org.id === selectedOrgId
                        ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="truncate">
                      <div>{org.name}</div>
                      <div className="text-[10px] text-slate-500">{org.code} • {org.currency}</div>
                    </div>
                    {org.id === selectedOrgId && (
                      <Icon name="check" className="w-4 h-4 text-indigo-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right: Notifications & User Profile */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Notifications"
          >
            <Icon name="bell" className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-slate-900 animate-pulse" />
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowNotifications(false)}
              />
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-3 z-20">
                <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-2">
                  <span className="text-xs font-bold text-white">Notifications</span>
                  <span className="text-[10px] font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                    2 New
                  </span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                    <p className="font-semibold text-white">Timesheet Approved</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      David Campbell approved TS-6001 for Sarah Jenkins ($6,600.00).
                    </p>
                    <span className="text-[10px] text-slate-500 mt-1 block">4h ago</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5">
                    <p className="font-semibold text-white">Wire Payment Received</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      FinTech Horizon Corp settled INV-8001 for $28,400.00.
                    </p>
                    <span className="text-[10px] text-slate-500 mt-1 block">1d ago</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Identity Avatar & Role */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-white/5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-indigo-500/20">
            AM
          </div>
          <div className="hidden md:block text-left">
            <div className="text-xs font-semibold text-white leading-tight">Alex Morgan</div>
            <div className="text-[10px] font-medium text-indigo-400">Senior Operations Lead</div>
          </div>
        </div>
      </div>
    </header>
  );
};
