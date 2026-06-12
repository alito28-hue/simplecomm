export type ScheduleMode = 'AUTOMATIC' | 'CONFIRMATION';
export type ScheduleEndType = 'NONE' | 'MONTHS' | 'INVOICES';
export type ScheduleStatus = 'ACTIVE' | 'PAUSED' | 'FINISHED' | 'CANCELLED';
export type OccurrenceStatus =
  | 'PENDING_CONFIRMATION'
  | 'PROCESSING'
  | 'ISSUED'
  | 'EXPIRED'
  | 'ERROR'
  | 'CANCELLED';

export interface ScheduledInvoice {
  id: string;
  organizationId: string;
  clientId: string | null;
  buyerName: string;
  docType: string;
  docNumber: string;
  description: string;
  amount: number;
  invoiceLetter: 'A' | 'B' | 'C';
  ivaRate: number;
  concept: number;
  recipientEmail: string;
  firstDate: string;
  modelDay: number;
  mode: ScheduleMode;
  endType: ScheduleEndType;
  endValue: number | null;
  processedMonths: number;
  issuedCount: number;
  status: ScheduleStatus;
  nextEffectiveDate: string | null;
}

