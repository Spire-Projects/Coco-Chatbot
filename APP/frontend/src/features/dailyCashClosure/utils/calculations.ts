export function calculateClosureSummary(
  totalCashBs: number,
  qrAmountBs: number,
  totalSalesBs: number,
  totalCashArg: number,
  qrAmountArg: number,
  totalSalesArg: number
) {
  const totalClosureBs = totalCashBs + qrAmountBs;
  const totalClosureArg = totalCashArg + qrAmountArg;
  
  const differenceBs = totalClosureBs - totalSalesBs;
  const differenceArg = totalClosureArg - totalSalesArg;

  return {
    totalClosureBs,
    totalClosureArg,
    differenceBs,
    differenceArg,
    isCorrectBs: Math.abs(differenceBs) <= 1,
    isCorrectArg: Math.abs(differenceArg) <= 1,
  };
}

export function formatCurrency(amount: number, currency: 'bs' | 'arg' = 'bs') {
  const formatted = amount.toFixed(2);
  return currency === 'bs' ? `Bs ${formatted}` : `ARS ${formatted}`;
}
