import { memo, useState } from "react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { FileText, ChevronDown, ChevronRight } from "lucide-react";

interface SaleNotesProps {
  notes?: string;
  onNotesChange: (notes: string) => void;
  disabled?: boolean;
}

const SaleNotes = memo(
  ({ notes = "", onNotesChange, disabled = false }: SaleNotesProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onNotesChange(e.target.value);
    };

    return (
      <Card className="!gap-0 !py-2">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full h-auto p-4 justify-between hover:bg-gray-50"
              disabled={disabled}
            >
              <div className="flex flex-col gap-1 justify-start">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Comentarios de venta (opcional)
                  </span>
                </div>
                {notes && notes.trim() && (
                  <span className="text-xs text-left text-gray-500 ">
                    ({notes.length} caracteres)
                  </span>
                )}
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 pr-2 pl-2">
              <div className="space-y-2">
                <Label htmlFor="sale-notes" className="sr-only">
                  Notas de la venta
                </Label>
                <Textarea
                  id="sale-notes"
                  value={notes}
                  onChange={handleNotesChange}
                  placeholder="Agregar observaciones o comentarios sobre la venta..."
                  disabled={disabled}
                  className="min-h-[80px] text-sm"
                  maxLength={500}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Observaciones opcionales sobre la venta</span>
                  <span>{notes.length}/500</span>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    );
  }
);

SaleNotes.displayName = "SaleNotes";

export default SaleNotes;
