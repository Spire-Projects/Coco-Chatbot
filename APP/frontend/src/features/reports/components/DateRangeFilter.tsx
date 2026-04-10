import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Calendar } from "lucide-react";

interface DateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDateToChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const DateRangeFilter = ({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: DateRangeFilterProps) => {
  return (
    <Card>
      <CardContent className="p-x-4 !p-y-0">
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="flex items-center gap-2 text-sm sm:text-base font-medium text-gray-700">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            {/* shorter label on very small screens, full label from sm and up */}
            <span className="inline sm:hidden">Rango de fechas</span>
            <span className="hidden sm:inline">Rango de fechas para el análisis:</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="space-y-1">
              <Label htmlFor="dateFrom" className="text-xs text-gray-600">
                Desde
              </Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={onDateFromChange}
                className="w-full sm:w-40"
                max={dateTo}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="dateTo" className="text-xs text-gray-600">
                Hasta
              </Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={onDateToChange}
                className="w-full sm:w-40"
                min={dateFrom}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
