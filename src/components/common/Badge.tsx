import React from 'react';
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  XCircle,
  HelpCircle,
  Minus,
} from 'lucide-react';

export type BadgeVariant =
  | 'verified'
  | 'complete'
  | 'reconciled'
  | 'available'
  | 'pending'
  | 'in-progress'
  | 'discrepancy'
  | 'difference'
  | 'failed'
  | 'missing'
  | 'not-started'
  | 'issues'
  | 'na'
  | 'high'
  | 'medium'
  | 'low'
  | 'payment'
  | 'receipt';

interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  className?: string;
  showIcon?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant,
  label,
  className = '',
  showIcon = true,
}) => {
  let displayLabel = label;
  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let IconComponent = HelpCircle;

  switch (variant) {
    case 'verified':
    case 'complete':
    case 'reconciled':
    case 'available':
      styles = 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-600/10';
      IconComponent = CheckCircle;
      if (!displayLabel) {
        displayLabel =
          variant === 'verified'
            ? 'Verified'
            : variant === 'complete'
            ? 'Complete'
            : variant === 'available'
            ? 'Available'
            : 'Reconciled';
      }
      break;

    case 'pending':
    case 'in-progress':
      styles = 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-600/10';
      IconComponent = Clock;
      if (!displayLabel) {
        displayLabel = variant === 'in-progress' ? 'In Progress' : 'Pending';
      }
      break;

    case 'discrepancy':
    case 'difference':
    case 'issues':
      styles = 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-600/10';
      IconComponent = AlertTriangle;
      if (!displayLabel) {
        displayLabel = variant === 'difference' ? 'Difference' : 'Discrepancy';
      }
      break;

    case 'failed':
      styles = 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-600/10';
      IconComponent = XCircle;
      if (!displayLabel) displayLabel = 'Failed';
      break;

    case 'missing':
      styles = 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-600/10';
      IconComponent = AlertTriangle;
      if (!displayLabel) displayLabel = 'Missing';
      break;

    case 'not-started':
      styles = 'bg-slate-100 text-slate-600 border-slate-200';
      IconComponent = Minus;
      if (!displayLabel) displayLabel = 'Not Started';
      break;

    case 'na':
      styles = 'bg-slate-100 text-slate-500 border-slate-200';
      IconComponent = Minus;
      if (!displayLabel) displayLabel = 'N/A';
      break;

    case 'high':
      styles = 'bg-rose-100 text-rose-800 font-semibold border-rose-200';
      IconComponent = AlertTriangle;
      if (!displayLabel) displayLabel = 'High';
      break;

    case 'medium':
      styles = 'bg-amber-100 text-amber-800 font-medium border-amber-200';
      IconComponent = Clock;
      if (!displayLabel) displayLabel = 'Medium';
      break;

    case 'low':
      styles = 'bg-slate-100 text-slate-700 border-slate-200';
      IconComponent = HelpCircle;
      if (!displayLabel) displayLabel = 'Low';
      break;

    case 'payment':
      styles = 'bg-rose-50 text-rose-700 border-rose-200';
      showIcon = false;
      if (!displayLabel) displayLabel = 'Payment';
      break;

    case 'receipt':
      styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      showIcon = false;
      if (!displayLabel) displayLabel = 'Receipt';
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles} ${className}`}
    >
      {showIcon && <IconComponent className="w-3.5 h-3.5 shrink-0" />}
      <span>{displayLabel}</span>
    </span>
  );
};
