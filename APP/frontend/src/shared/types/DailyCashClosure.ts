import type { IEntity } from "./UtilTypes";

export interface DailyCashClosure extends IEntity {
  userId: string;
  date: string;
  openingAmount: number;
  closingAmountBs: {
    amountQr: number;
    amountCash: number;
  };
  closingAmountArg: {
    amountQr: number;
    amountCash: number;
  };
  notes?: string;
}

export interface CreateDaylyCashClosure{
  userId: string;
  date: string;
  openingAmount: number;
  closingAmountBs: {
    amountQr: number;
    amountCash: number;
  };
  closingAmountArg: {
    amountQr: number;
    amountCash: number;
  };
  notes?: string;
  createdBy: string;
}

export interface UpdateDailyCashClosure{
  closingAmountBs: {
    amountQr: number;
    amountCash: number;
  };
  closingAmountArg: {
    amountQr: number;
    amountCash: number;
  };
  notes?: string;
  updatedBy: string;
}

export interface DailyCashClosureFilter {
  currency?: 'bs' | 'arg';
}

export type Denomination = {
  label: string;
  value: number;
};

export type CashBreakdown = {
  denomination: Denomination;
  quantity: number;
};
