import type { ScreenId } from '../context/VerificationContext';

export const SCREEN_PERMISSIONS: Partial<Record<ScreenId, string[]>> = {
  'treasurer-dashboard': ['finance.read.society'],
  'secretary-dashboard': ['governance.read', 'compliance.read'],
  'chairman-dashboard': ['governance.read'],
  'member-dashboard': ['finance.read.linked'],
  'auditor-dashboard': ['finance.read.audit', 'audit.evidence.read'],
  'observations-actions': ['audit.observations.manage', 'audit.evidence.read'],
  'financial-summary': ['finance.read.society', 'finance.read.audit', 'finance.read.linked'],
  'demand-collections': ['finance.read.society', 'finance.read.audit', 'finance.read.linked'],
  'payments-expenses': ['finance.read.society', 'finance.read.audit', 'finance.read.linked'],
  'party-ledger': ['finance.read.society', 'finance.read.audit', 'finance.read.linked'],
  'bank-reconciliation': ['finance.reconciliation.manage', 'finance.read.society', 'finance.read.audit'],
  'verification-dashboard': ['finance.read.society', 'finance.read.audit'],
  'opening-balances': ['finance.read.society', 'finance.read.audit'],
  'transaction-verification': ['finance.read.society', 'finance.read.audit'],
  'monthly-reconciliation': ['finance.reconciliation.manage', 'finance.read.society', 'finance.read.audit'],
  'annual-financial-review': ['finance.read.society', 'finance.read.audit', 'compliance.read', 'compliance.manage'],
  'year-end-closure': ['finance.read.society', 'finance.read.audit', 'compliance.read', 'compliance.manage'],
  'internal-audit': ['finance.read.society', 'finance.read.audit', 'audit.evidence.read'],
  'statutory-audit-handover': ['finance.read.society', 'finance.read.audit', 'audit.evidence.read', 'compliance.manage'],
  'final-approval-freeze': ['finance.read.society', 'finance.read.audit', 'compliance.manage'],
  'compliance-command-centre': ['compliance.read', 'compliance.manage'],
  'audit-evidence': ['audit.evidence.read', 'finance.read.society', 'finance.read.audit', 'compliance.read', 'compliance.manage'],
  reports: ['finance.read.society', 'finance.read.audit', 'finance.read.linked'],
  'ledger-reports': ['finance.read.society', 'finance.read.audit', 'finance.read.linked'],
  'data-management': ['master.read.society', 'master.draft.manage'],
  'import-wizard': ['finance.import.manage'],
  'data-quality': ['data_quality.read', 'data_quality.resolve'],
  'options-config': ['master.draft.manage', 'society.settings.manage'],
  'data-audit-trail': ['audit.events.read'],
  transactions: ['finance.read.society', 'finance.read.audit', 'finance.transaction.create_draft', 'finance.transaction.edit_draft'],
  'user-access': ['society.roles.manage', 'society.members.manage'],
  settings: ['society.settings.manage'],
};

export const hasScreenPermission = (permissions: string[], screen: ScreenId): boolean => {
  const required = SCREEN_PERMISSIONS[screen];
  return !required || required.some((permission) => permissions.includes(permission));
};
