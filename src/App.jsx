import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllInitialData } from './store/dataSlice';
import { AppShell } from './components/shell/AppShell';
import { LoadingState, ErrorState } from './components/common/FeedbackStates';

// Views
import { DashboardView } from './views/DashboardView';
import { EmployeesContractorsView } from './views/EmployeesContractorsView';
import { CandidatesView } from './views/CandidatesView';
import { AssignmentsView } from './views/JobsView';
import { PlacementsView } from './views/PlacementsView';
import { TimesheetsView } from './views/TimesheetsView';
import { IncomeRevenueView } from './views/IncomeRevenueView';
import { InvoicesView } from './views/InvoicesView';
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
      case 'employees':
      case 'employees-contractors':
        return <EmployeesContractorsView />;
      case 'candidates':
      case 'clients':
      case 'vendors':
        return <CandidatesView />;
      case 'assignments':
      case 'jobs':
        return <AssignmentsView />;
      case 'placements':
        return <PlacementsView />;
      case 'timesheets':
        return <TimesheetsView />;
      case 'income':
        return <IncomeRevenueView />;
      case 'invoices':
        return <InvoicesView />;
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
// testing git 12