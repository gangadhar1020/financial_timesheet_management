import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { PageHeader } from '../components/shell/PageHeader';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { FormField, TextInput, SelectInput } from '../components/common/FormField';
import { addToast } from '../store/dataSlice';

/**
 * SettingsView Component
 * 
 * @purpose Application & tenant configuration view managing organization defaults, fiscal settings, and API status.
 */
export const SettingsView = () => {
  const dispatch = useDispatch();
  const { configuration, organizations, selectedOrgId } = useSelector((state) => state.data);

  const activeOrg = organizations.find((o) => o.id === selectedOrgId) || organizations[0] || {};

  const handleSave = () => {
    dispatch(
      addToast({
        title: 'Settings Saved',
        message: 'Tenant preferences updated successfully.',
        type: 'success',
      })
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Application & Organization Settings"
        subtitle="Manage multi-tenant organization profiles, fiscal year calendars, billing currencies, and integration parameters."
        badge="Configuration"
        actions={
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
          >
            Save Preferences
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organization Profile */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding="md" className="space-y-4">
            <h3 className="text-sm font-bold text-white pb-2 border-b border-white/5">
              Active Organization Profile ({activeOrg.name})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Organization Name">
                <TextInput value={activeOrg.name} readOnly disabled />
              </FormField>
              <FormField label="Tenant Code">
                <TextInput value={activeOrg.code} readOnly disabled />
              </FormField>
              <FormField label="Tax Identification (EIN)">
                <TextInput value={activeOrg.taxId} readOnly disabled />
              </FormField>
              <FormField label="Primary Contact Email">
                <TextInput value={activeOrg.contactEmail} readOnly disabled />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Billing Headquarters">
                  <TextInput value={activeOrg.address} readOnly disabled />
                </FormField>
              </div>
            </div>
          </Card>

          <Card padding="md" className="space-y-4">
            <h3 className="text-sm font-bold text-white pb-2 border-b border-white/5">
              Financial & Invoicing Defaults
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="System Currency">
                <SelectInput
                  value={configuration?.currency?.code || 'USD'}
                  options={['USD ($)', 'EUR (€)', 'GBP (£)', 'CAD ($)']}
                />
              </FormField>
              <FormField label="Fiscal Year Start">
                <SelectInput
                  value={activeOrg.fiscalYearStart || 'January'}
                  options={['January', 'April', 'July', 'October']}
                />
              </FormField>
              <FormField label="Standard Payment Terms">
                <SelectInput
                  value={configuration?.defaultPaymentTerms || 'Net 30'}
                  options={['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt']}
                />
              </FormField>
              <FormField label="Timesheet Week Starts On">
                <SelectInput
                  value={configuration?.fiscalCalendar?.weekStart || 'Monday'}
                  options={['Monday', 'Sunday']}
                />
              </FormField>
            </div>
          </Card>
        </div>

        {/* System Diagnostics & Phase 2 Gateway Status */}
        <div className="space-y-6">
          <Card padding="md" className="space-y-3">
            <h3 className="text-sm font-bold text-white pb-2 border-b border-white/5">
              System Architecture Status
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Core Engine</span>
                <span className="font-semibold text-white">Vite React 19 (JS)</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Styling Engine</span>
                <span className="font-semibold text-white">Tailwind CSS v4</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">State Management</span>
                <span className="font-semibold text-white">Redux Toolkit</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Data Architecture</span>
                <Badge status="12 Entities Asynchronous" variant="success" size="sm" />
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-slate-400">Optimistic Concurrency</span>
                <span className="font-semibold text-white">Supported (version keys)</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400">Phase 2 API Readiness</span>
                <Badge status="100% Ready" variant="purple" size="sm" />
              </div>
            </div>
          </Card>

          <Card padding="md" className="space-y-2 bg-indigo-950/20 border-indigo-500/20">
            <h4 className="text-xs font-bold text-indigo-300">Phase 2 Architecture Ready</h4>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              All async thunks in <code>src/store/dataSlice.js</code> are designed to swap out <code>/data/*.json</code> with real REST or GraphQL endpoints without changing UI component contracts.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
