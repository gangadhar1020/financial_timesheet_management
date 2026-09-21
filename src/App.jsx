import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllInitialData } from './store/dataSlice';
import { AppShell } from './components/shell/AppShell';
import { LoadingState, ErrorState } from './components/common/FeedbackStates';

// Views
import { DashboardView } from './views/DashboardView';
import { EmployeesContractorsView } from './views/EmployeesContractorsView';
import { ClientsView } from './views/ClientsView';
import { VendorsView } from './views/VendorsView';
import { JobsView } from './views/JobsView';
import { PlacementsView } from './views/PlacementsView';
import { TimesheetsView } from './views/TimesheetsView';
import { IncomeRevenueView } from './views/IncomeRevenueView';
import { AccountsReceivableView } from './views/AccountsReceivableView';
import { AccountsPayableView } from './views/AccountsPayableView';
import { ImportsView } from './views/ImportsView';
import { ReportsView } from './views/ReportsView';
import { AuditLogsView } from './views/AuditLogsView';
import { SettingsView } from './views/SettingsView';

function App() {
  const dispatch = useDispatch();
  const { status, error, activeView } = useSelector((state) => state.data);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchAllInitialData());
    }
  }, [status, dispatch]);

  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'employees-contractors':
        return <EmployeesContractorsView />;
      case 'clients':
        return <ClientsView />;
      case 'vendors':
        return <VendorsView />;
      case 'jobs':
        return <JobsView />;
      case 'placements':
        return <PlacementsView />;
      case 'timesheets':
        return <TimesheetsView />;
      case 'income':
        return <IncomeRevenueView />;
      case 'ar':
        return <AccountsReceivableView />;
      case 'ap':
        return <AccountsPayableView />;
      case 'imports':
        return <ImportsView />;
      case 'reports':
        return <ReportsView />;
      case 'audit':
        return <AuditLogsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <LoadingState message="Initializing Enterprise Application Foundation & Data Repositories..." />
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <ErrorState
          title="Foundation Initialization Error"
          message={error}
          onRetry={() => dispatch(fetchAllInitialData())}
        />
      </div>
    );
  }

  return (
    <AppShell>
      {renderActiveView()}
    </AppShell>
  );
}

export default App;
