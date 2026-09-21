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
        id: 'employees-contractors',
        label: 'Employees & Contractors',
        icon: 'users',
        badge: 'Roster',
        description: 'Manage internal W2 employees and 1099/C2C contractors',
      },
      {
        id: 'clients',
        label: 'Clients',
        icon: 'clients',
        badge: null,
        description: 'Customer accounts, billing terms, and credit parameters',
      },
      {
        id: 'vendors',
        label: 'Vendors',
        icon: 'building',
        badge: 'CRM',
        description: 'Subcontracting firms, agencies, and supplier partners',
      },
      {
        id: 'jobs',
        label: 'Jobs',
        icon: 'jobs',
        badge: 'Open',
        description: 'Client job orders, open requisitions, and bill rate targets',
      },
      {
        id: 'placements',
        label: 'Placements',
        icon: 'placements',
        badge: 'Active',
        description: 'Consultant job assignments, pay/bill margins, and schedules',
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
  for (const group of NAV_GROUPS) {
    const found = group.items.find((item) => item.id === id);
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
