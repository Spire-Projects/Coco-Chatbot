import { useState, useEffect } from "react";
import { reparationService } from "@/shared/services/ReparationService";
import type { ReparationView } from "@/shared/types/modelTypes/Reparation";

export function useReparationData(dateFrom: string, dateTo: string) {
  const [reparations, setReparations] = useState<ReparationView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReparations = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const dateFromFormatted = dateFrom + "T00:00:00.000Z";
        const dateToFormatted = dateTo + "T23:59:59.999Z";

        // Fetch completed reparations
        const completedResult = await reparationService.getAllView(
          1,
          10000,
          undefined,
          dateFromFormatted,
          dateToFormatted,
          { status: "completed" }
        );

        // Fetch delivered reparations
        const deliveredResult = await reparationService.getAllView(
          1,
          10000,
          undefined,
          dateFromFormatted,
          dateToFormatted,
          { status: "delivered" }
        );

        // Combine both sets (no duplicates since different status)
        const allReparations = [
          ...completedResult.items,
          ...deliveredResult.items,
        ];

        setReparations(allReparations);
      } catch (err) {
        console.error("Error al cargar reparaciones:", err);
        setError("Error al cargar los datos de reparaciones");
      } finally {
        setIsLoading(false);
      }
    };

    if (dateFrom && dateTo) {
      loadReparations();
    }
  }, [dateFrom, dateTo]);

  return { reparations, isLoading, error };
}
