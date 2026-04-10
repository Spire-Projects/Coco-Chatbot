import { memo, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { Button } from './ui/button';
import type { Currency } from '../types/modelTypes/Currency';

interface CurrencyEditModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currency: Currency | null;
  onSaved?: (updated: Currency) => void;
}

const schema = z.object({
  rate: z
    .number({ invalid_type_error: 'Debe ser un número' })
    .min(0.0001, 'El valor debe ser mayor que 0'),
});

type FormValues = z.infer<typeof schema>;

export const CurrencyEditModal = memo(function CurrencyEditModal({ isOpen, onOpenChange, currency, onSaved }: CurrencyEditModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { rate: currency?.rate ?? 1 },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({ rate: currency?.rate ?? 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currency]);

  const onSubmit = async (values: FormValues) => {
    if (!currency) return;
    setIsSubmitting(true);
    try {
      onSaved?.({ ...currency, rate: values.rate });
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar tipo de cambio</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormItem>
              <FormField
                control={form.control}
                name="rate"
                render={({ field }) => (
                  <>
                    <FormLabel>Equivalencia a Bs (1 USD = ? Bs)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0001"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </>
                )}
              />

              <div className="mt-4 flex justify-end">
                <Button variant="outline" type="button" onClick={() => onOpenChange(false)} className="mr-2">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : 'Guardar'}
                </Button>
              </div>
            </FormItem>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
});

CurrencyEditModal.displayName = 'CurrencyEditModal';

export default CurrencyEditModal;
