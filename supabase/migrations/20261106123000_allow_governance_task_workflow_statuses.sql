-- Allow the full guided governance task lifecycle while retaining legacy status values.
ALTER TABLE public.financial_year_checklist
  DROP CONSTRAINT IF EXISTS financial_year_checklist_status_check;

ALTER TABLE public.financial_year_checklist
  ADD CONSTRAINT financial_year_checklist_status_check
  CHECK (
    status = ANY (ARRAY[
      'Pending',
      'In Progress',
      'Awaiting Approval',
      'Submitted',
      'Returned for Changes',
      'Completed',
      'Exception',
      'Exception Disclosed',
      'Not Applicable'
    ]::text[])
  );
