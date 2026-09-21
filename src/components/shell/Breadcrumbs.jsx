import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setActiveView } from '../../store/dataSlice';
import { getNavItemById } from './Navigation';
import { Icon } from '../common/Icons';

/**
 * Breadcrumbs Component
 * 
 * @purpose Renders hierarchical breadcrumb trail showing current module location.
 * @usage <Breadcrumbs />
 * @behavior Reflects activeView from Redux, supports clicking on parent trail.
 */
export const Breadcrumbs = () => {
  const dispatch = useDispatch();
  const activeView = useSelector((state) => state.data.activeView);
  const currentNav = getNavItemById(activeView);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-xs text-slate-400 py-2">
      <ol className="flex items-center space-x-2">
        <li>
          <button
            type="button"
            onClick={() => dispatch(setActiveView('dashboard'))}
            className="hover:text-white transition-colors flex items-center gap-1"
          >
            <Icon name="dashboard" className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
        </li>
        {activeView !== 'dashboard' && (
          <>
            <li className="text-slate-600">/</li>
            <li className="text-slate-400">{currentNav.group}</li>
            <li className="text-slate-600">/</li>
            <li className="font-semibold text-white tracking-wide">{currentNav.label}</li>
          </>
        )}
      </ol>
    </nav>
  );
};
