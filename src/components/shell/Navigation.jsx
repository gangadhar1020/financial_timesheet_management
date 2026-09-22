/**
 * Navigation Registry & Metadata
 * 
 * Defines all 13 core navigation destinations, grouped into logical enterprise operational categories:
 * - Overview
 * - Workforce & CRM
 * - Operations
 * - Financials
 * - Governance & Tools
 */

export const NAV_GROUPS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'dashboard',
        badge: null,
        description: 'Executive KPIs, active projects & operational summaries',
      },
    ],
  },
  {
    id: 'workforce',
    label: 'Workforce & CRM',
    items: [
      {
        id: 'employees',
        label: 'Employees',
        icon: 'users',
        badge: 'Roster',
        description: 'Manage internal W2 employee roster, compensation, and profiles',
      },
      {
        id: 'candidates',
        label: 'Candidates',
        icon: 'candidates',
        badge: 'CRM',
        description: 'Customer client accounts and vendor partner registry',
      },
      {
        id: 'assignments',
        label: 'Assignments',
        icon: 'assignments',
        badge: 'Open',
        description: 'Client assignments, open requisitions, and bill rate targets',
      },
      {
        id: 'placements',
        label: 'Placements',
        icon: 'placements',
        badge: 'Active',
        description: 'Consultant client placements, pay/bill margins, and schedules',
      },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      {
        id: 'timesheets',
        label: 'Timesheets',
        icon: 'timesheets',
        badge: 'Pending',
        description: 'Weekly consultant timecards, approvals, and billable hours',
      },
      {
        id: 'imports',
        label: 'Imports',
        icon: 'imports',
        badge: 'CSV',
        description: 'Batch data ingestion, roster synchronization, and logs',
      },
    ],
  },
  {
    id: 'financials',
    label: 'Financials',
    items: [
      {
        id: 'income',
        label: 'Income / Revenue',
        icon: 'income',
        badge: null,
        description: 'Recognized billing revenue, gross profit, and margins',
      },
      {
        id: 'invoices',
        label: 'Invoices',
        icon: 'invoices',
        badge: 'Billing',
        description: 'Customer invoices, billing generation from recognized income, and payment tracking',
      },
      {
        id: 'ar',
        label: 'Accounts Receivable (AR)',
        icon: 'ar',
        badge: 'Aging',
        description: 'Customer invoices, payment collections, and overdue aging',
      },
      {
        id: 'ap',
        label: 'Accounts Payable (AP)',
        icon: 'ap',
        badge: null,
        description: 'Contractor bills, vendor disbursements, and payment runs',
      },
    ],
  },
  {
    id: 'governance',
    label: 'Governance & Tools',
    items: [
      {
        id: 'reports',
        label: 'Reports',
        icon: 'reports',
        badge: 'BI',
        description: 'Executive reporting, margin analysis, and DSO metrics',
      },
      {
        id: 'audit',
        label: 'Audit Logs',
        icon: 'audit',
        badge: 'Sec',
        description: 'System event logs, rate changes, and compliance audit trail',
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: 'settings',
        badge: null,
        description: 'Multi-tenant settings, fiscal calendar, and organization setup',
      },
    ],
  },
];

export const getNavItemById = (id) => {
  const normalizedId =
    id === 'employees-contractors'
      ? 'employees'
      : id === 'clients' || id === 'vendors'
      ? 'candidates'
      : id === 'jobs'
      ? 'assignments'
      : id;
  for (const group of NAV_GROUPS) {
    const found = group.items.find((item) => item.id === normalizedId);
    if (found) return { ...found, group: group.label };
  }
  return {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    group: 'Overview',
    description: 'Executive KPIs, active projects & operational summaries',
  };
};
