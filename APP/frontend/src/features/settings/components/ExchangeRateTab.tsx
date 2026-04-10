import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { DollarSign, RefreshCw } from "lucide-react";

import { currencyService } from "@/shared/services/CurrencyService";
import { useExchangeRateStore } from "@/shared/store/exchangeRateStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/shared/components/ui/form";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const rateSchema = z.object({
  rate: z.coerce.number({ invalid_type_error: "Debe ser un número" }).positive("Debe ser mayor a 0"),
});

type RateFormData = z.infer<typeof rateSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ExchangeRateTab() {
  const queryClient = useQueryClient();
  const { setRate } = useExchangeRateStore();

  // ── Fetch current rate ───────────────────────────────────────────────────

  const { data: current, isLoading } = useQuery({
    queryKey: ["exchange-rate-current"],
    queryFn:  () => currencyService.getCurrent(),
  });

  // ── Form ─────────────────────────────────────────────────────────────────

  const form = useForm<RateFormData>({
    resolver: zodResolver(rateSchema),
    defaultValues: { rate: 0 },
  });

  // ── Mutation ─────────────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: (data: RateFormData) => currencyService.setCurrent(data.rate),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["exchange-rate-current"] });
      // Sync global store immediately so Header and sales components update
      setRate(saved.rate);
      toast.success("Tipo de cambio actualizado");
      form.reset({ rate: 0 });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Error al actualizar el tipo de cambio");
    },
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-lg">
      {/* Current rate card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Tipo de Cambio Actual
          </CardTitle>
          <CardDescription>
            Tasa de conversión USD → Bolivianos vigente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
              <span>Cargando...</span>
            </div>
          ) : current ? (
            <div className="flex items-center justify-center">
              <div className="rounded-xl bg-green-50 border border-green-200 px-10 py-6 text-center">
                <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">
                  Tasa actual
                </p>
                <p className="text-4xl font-bold text-green-800">
                  {current.rate.toFixed(2)}
                </p>
                <p className="text-sm text-green-600 mt-1">Bs por 1 USD</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 text-gray-500 gap-2">
              <DollarSign className="h-10 w-10 text-gray-300" />
              <p className="font-medium">No hay tipo de cambio configurado</p>
              <p className="text-sm">Configura la primera tasa a continuación</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            Actualizar Tipo de Cambio
          </CardTitle>
          <CardDescription>
            Al guardar, la nueva tasa reemplazará a la actual como vigente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((d) => updateMutation.mutate(d))}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equivalencia (Bs por 1 USD)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="6.96"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={updateMutation.isPending} className="w-full">
                {updateMutation.isPending ? "Guardando..." : "Establecer como actual"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
