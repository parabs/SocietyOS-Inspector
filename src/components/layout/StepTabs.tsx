import React from 'react';
import { useVerification, ScreenId } from '../../context/VerificationContext';

interface StepTabsProps {
  activeStep: 1 | 2 | 3;
}

export const StepTabs: React.FC<StepTabsProps> = ({ activeStep }) => {
  const { setCurrentScreen } = useVerification();

  const steps = [
    {
      num: 1,
      title: 'Opening Balance Verification',
      subtitle: 'Verify opening balances for all accounts',
      screen: 'opening-balances' as ScreenId,
    },
    {
      num: 2,
      title: 'Transaction Verification',
      subtitle: 'Inspect vouchers, receipts and bills',
      screen: 'transaction-verification' as ScreenId,
    },
    {
      num: 3,
      title: 'Account-wise Monthly Reconciliation',
      subtitle: 'Verify monthly movements and closing balances',
      screen: 'monthly-reconciliation' as ScreenId,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
      {steps.map((step) => {
        const isActive = activeStep === step.num;
        return (
          <button
            key={step.num}
            onClick={() => setCurrentScreen(step.screen)}
            className={`flex items-center gap-3.5 px-4 py-3 rounded-lg border text-left transition-all duration-150 cursor-pointer ${
              isActive
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:bg-slate-50'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-colors ${
                isActive
                  ? 'bg-white text-blue-600'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {step.num}
            </div>
            <div className="min-w-0">
              <div
                className={`font-semibold text-sm leading-tight truncate ${
                  isActive ? 'text-white' : 'text-slate-900'
                }`}
              >
                {step.title}
              </div>
              <div
                className={`text-xs leading-tight truncate mt-0.5 ${
                  isActive ? 'text-blue-100' : 'text-slate-500'
                }`}
              >
                {step.subtitle}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
