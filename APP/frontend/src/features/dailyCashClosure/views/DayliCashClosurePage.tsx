import { useEffect, useState, useRef } from "react";
import { UserService } from "@/shared/services/UserService";
import type { DailyCashClosure } from "@/shared/types/DailyCashClosure";
import { dailyCashClosureService } from "@/shared/services/DailyCashClosureService";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { FilterTabs } from "@/shared/components/FilterTabs";
import type { FilterOption } from "@/shared/components/FilterTabs";
import { useAuthStore } from "@/shared/store/authStore";
import { useSalesData } from "../hooks/useSalesData";
import { useCashBreakdown } from "../hooks/useCashBreakdown";
import { useArgCashBreakdown } from "../hooks/useArgCashBreakdown";
import { calculateClosureSummary, formatCurrency } from "../utils/calculations";
import { ArcheoStatus } from "../components/ArcheoStatus";
import { CashBreakdownTable } from "../components/CashBreakdownTable";
import { ConfirmArcheoDialog } from "../components/ConfirmArcheoDialog";
import { ClosureHistoryTable } from "../components/ClosureHistoryTable";
import { DataPagination } from "@/shared/components/DataPagination";

export const DailyCashClosuresPage = () => {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<DailyCashClosure[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [qrAmountBsStr, setQrAmountBsStr] = useState('0');
  const [qrAmountArgStr, setQrAmountArgStr] = useState('0');
  const [loading, setLoading] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [userNames, setUserNames] = useState<{ [key: string]: string }>({});
  const [hasEdited, setHasEdited] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [activeCurrency, setActiveCurrency] = useState<'bs' | 'arg'>('bs');
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const evalTimerRef = useRef<number | null>(null);

  const { user } = useAuthStore();
  const { totalSalesBs, totalSalesArg, hasArgSales } = useSalesData(date);
  
  const cashBs = useCashBreakdown();
  const cashArg = useArgCashBreakdown();

  const qrAmountBs = Number(qrAmountBsStr) || 0;
  const qrAmountArg = Number(qrAmountArgStr) || 0;

  const summary = calculateClosureSummary(
    cashBs.calculateTotal(),
    qrAmountBs,
    totalSalesBs,
    cashArg.calculateTotal(),
    qrAmountArg,
    totalSalesArg
  );

  const loadUserName = async (userId: string) => {
    if (userNames[userId]) return userNames[userId];

    try {
      const response = await UserService.getUserById(userId);
      if (response.success && response.user) {
        const name = response.user.fullName || response.user.email || userId;
        setUserNames((prev) => ({ ...prev, [userId]: name }));
        return name;
      }
    } catch (error) {
      console.error('Error loading user name:', error);
    }

    return userId;
  };

  const loadClosures = async () => {
    setLoading(true);
    try {
      const res = await dailyCashClosureService.getAllView(page, itemsPerPage);
      setTotalItems(res.totalItems);
      setItems(res.items);
      setTotalPages(res.totalPages);

      for (const item of res.items) {
        await loadUserName(item.userId);
      }
    } catch (error) {
      console.error('Error loading closures:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = () => {
    setHasEdited(true);
    setIsEvaluating(true);
    if (evalTimerRef.current) {
      window.clearTimeout(evalTimerRef.current);
    }
    evalTimerRef.current = window.setTimeout(() => {
      setIsEvaluating(false);
      evalTimerRef.current = null;
    }, 1000);
  };

  const handleCreate = async () => {
    if (!user) {
      alert('Usuario no autenticado');
      return;
    }

    const isCorrect = summary.isCorrectBs && (hasArgSales ? summary.isCorrectArg : true);

    if (!isCorrect) {
      setShowConfirmDialog(true);
      return;
    }

    await saveArcheo();
  };

  const saveArcheo = async () => {
    if (!user) return;

    const notes = hasArgSales
      ? `BS - QR: ${qrAmountBs}, Efectivo: ${cashBs.calculateTotal()} | ARG - QR: ${qrAmountArg}, Efectivo: ${cashArg.calculateTotal()}`
      : `QR: ${qrAmountBs}, Efectivo: ${cashBs.calculateTotal()}`;

    try {
      await dailyCashClosureService.create({
        userId: user.id,
        date,
        openingAmount: 0,
        closingAmountBs: {
          amountQr: qrAmountBs,
          amountCash: cashBs.calculateTotal(),
        },
        closingAmountArg: {
          amountQr: qrAmountArg,
          amountCash: cashArg.calculateTotal(),
        },
        notes,
        createdBy: user.id,
      });

      cashBs.reset();
      cashArg.reset();
      setQrAmountBsStr('0');
      setQrAmountArgStr('0');
      setShowConfirmDialog(false);
      setHasEdited(false);
      setIsEvaluating(false);
      loadClosures();
    } catch (error) {
      console.error('Error saving arqueo:', error);
      alert('Error al guardar el arqueo. Por favor intente nuevamente.');
    }
  };

  useEffect(() => {
    loadClosures();
  }, [page, itemsPerPage]);

  const currencyTabs: FilterOption[] = [
    { value: 'bs', label: 'Bolivianos', icon: '🇧🇴' },
  ];

  if (hasArgSales) {
    currencyTabs.push({ value: 'arg', label: 'Pesos Argentinos', icon: '🇦🇷' });
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-xl font-semibold">Nuevo Arqueo de Caja Diario</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Usuario (Actual)</Label>
          <Input
            value={user?.fullName || user?.email || 'No autenticado'}
            disabled
            className="bg-gray-50"
          />
        </div>

        <div className="space-y-2">
          <Label>Fecha de Ventas</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {hasArgSales && (
        <FilterTabs
          options={currencyTabs}
          activeFilter={activeCurrency}
          onFilterChange={(value) => setActiveCurrency(value as 'bs' | 'arg')}
          className="mb-4"
        />
      )}

      {activeCurrency === 'bs' && (
        <>
          <ArcheoStatus
            totalSales={totalSalesBs}
            totalClosure={summary.totalClosureBs}
            difference={summary.differenceBs}
            isCorrect={summary.isCorrectBs}
            isEvaluating={isEvaluating}
            hasEdited={hasEdited}
            currency="bs"
          />

          <div className="space-y-2">
            <Label>Monto por QR (BS)</Label>
            <Input
              type="number"
              value={qrAmountBsStr}
              onChange={(e) => {
                setQrAmountBsStr(e.target.value);
                handleInputChange();
              }}
              placeholder="Monto por QR"
            />
          </div>

          <CashBreakdownTable
            denominations={cashBs.denominations}
            quantities={cashBs.quantities}
            onQuantityChange={(i, v) => {
              cashBs.updateQuantity(i, v);
              handleInputChange();
            }}
            currency="bs"
          />

          <div className="text-right space-y-2">
            <p>Total efectivo: <strong>{formatCurrency(cashBs.calculateTotal(), 'bs')}</strong></p>
            <p>Total QR: <strong>{formatCurrency(qrAmountBs, 'bs')}</strong></p>
            <p className="text-lg">Total cierre: <strong>{formatCurrency(summary.totalClosureBs, 'bs')}</strong></p>
            <p className="text-lg font-semibold">Ventas del día: <strong>{formatCurrency(totalSalesBs, 'bs')}</strong></p>
          </div>
        </>
      )}

      {activeCurrency === 'arg' && hasArgSales && (
        <>
          <ArcheoStatus
            totalSales={totalSalesArg}
            totalClosure={summary.totalClosureArg}
            difference={summary.differenceArg}
            isCorrect={summary.isCorrectArg}
            isEvaluating={isEvaluating}
            hasEdited={hasEdited}
            currency="arg"
          />

          <div className="space-y-2">
            <Label>Monto por QR (ARS)</Label>
            <Input
              type="number"
              value={qrAmountArgStr}
              onChange={(e) => {
                setQrAmountArgStr(e.target.value);
                handleInputChange();
              }}
              placeholder="Monto por QR"
            />
          </div>

          <CashBreakdownTable
            denominations={cashArg.denominations}
            quantities={cashArg.quantities}
            onQuantityChange={(i, v) => {
              cashArg.updateQuantity(i, v);
              handleInputChange();
            }}
            currency="arg"
          />

          <div className="text-right space-y-2">
            <p>Total efectivo: <strong>{formatCurrency(cashArg.calculateTotal(), 'arg')}</strong></p>
            <p>Total QR: <strong>{formatCurrency(qrAmountArg, 'arg')}</strong></p>
            <p className="text-lg">Total cierre: <strong>{formatCurrency(summary.totalClosureArg, 'arg')}</strong></p>
            <p className="text-lg font-semibold">Ventas del día: <strong>{formatCurrency(totalSalesArg, 'arg')}</strong></p>
          </div>
        </>
      )}

      <div className="text-right">
        <Button 
          onClick={handleCreate} 
          className={`${
            (summary.isCorrectBs && (!hasArgSales || summary.isCorrectArg))
              ? 'bg-green-600 hover:bg-green-700' 
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {(summary.isCorrectBs && (!hasArgSales || summary.isCorrectArg))
            ? 'Guardar Arqueo' 
            : 'Guardar con Diferencia'}
        </Button>
      </div>

      <ConfirmArcheoDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        onConfirm={saveArcheo}
        totalSales={activeCurrency === 'bs' ? totalSalesBs : totalSalesArg}
        totalClosure={activeCurrency === 'bs' ? summary.totalClosureBs : summary.totalClosureArg}
        difference={activeCurrency === 'bs' ? summary.differenceBs : summary.differenceArg}
        currency={activeCurrency}
      />

      <h3 className="text-xl mt-8 font-semibold">Historial</h3>
      <ClosureHistoryTable items={items} userNames={userNames} loading={loading} />

     <DataPagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={10}
              onPageChange={setPage}
              onItemsPerPageChange={(newSize) => {
                setPage(1);
                setItemsPerPage(newSize);
              }}
              startIndex={items.length ? (page - 1) * itemsPerPage + 1 : 0}
              endIndex={items.length ? (page - 1) * itemsPerPage + items.length : 0}
              itemName="arqueos"
            />
    </div>
  );
};
