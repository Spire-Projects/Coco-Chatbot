import {
  Card,
  CardContent,
} from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { FinancialSummary } from "./types/Types";
import { SalesAndReparationsReport } from "./financial/SalesAndReparationsReport";
import { SalesAndPurchasesReport } from "./financial/SalesAndPurchasesReport";

interface FinancialOverviewProps {
  isLoading: boolean;
  summary: FinancialSummary;
  dateFrom: string;
  dateTo: string;
}

export const FinancialOverview = ({
  isLoading,
  summary,
  dateFrom,
  dateTo,
}: FinancialOverviewProps) => {
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <Skeleton className="h-96 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SalesAndReparationsReport
        summary={summary}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />
      
      <SalesAndPurchasesReport
        summary={summary}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />
    </div>
  );
};
