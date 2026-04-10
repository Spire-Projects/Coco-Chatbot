// @ts-nocheck
import { memo, useState, useCallback, useEffect, useMemo } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import {
  Trash2, ShoppingCart, ChevronDown, ChevronRight,
  Building2, StickyNote, Package, Loader2, Cable,
} from "lucide-react";
import type { PurchaseView, PurchaseItem, PurchaseAccessoryItem } from "@/shared/types/modelTypes/PurchaseBox";
import { purchaseService } from "@/shared/services/PurchaseService";

interface Props {
  purchases: PurchaseView[];
  loading: boolean;
  searchQuery: string;
  onEdit: (purchase: PurchaseView) => void;
  onDelete: (purchase: PurchaseView) => void;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-BO", { year: "numeric", month: "short", day: "numeric" });

const formatUsd = (n?: number | null) =>
  n != null
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)
    : "—";

const CONDITION_LABEL: Record<string, string> = {
  new: "Nuevo",
  pre_owned: "Pre-owned",
  used: "Usado",
};

const CONDITION_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  new: "default",
  pre_owned: "secondary",
  used: "outline",
};

// ---------------------------------------------------------------------------
// Group items by variant
// ---------------------------------------------------------------------------
interface VariantGroup {
  key: string;
  label: string;
  condition: string;
  items: PurchaseItem[];
}

function groupByVariant(items: PurchaseItem[]): VariantGroup[] {
  const map = new Map<string, VariantGroup>();
  for (const item of items) {
    const key = `${item.variantModelName ?? "?"}-${item.variantStorage ?? ""}-${item.variantColor ?? ""}`;
    const label = [item.variantModelName, item.variantStorage, item.variantColor]
      .filter(Boolean)
      .join(" · ") || "Variante desconocida";
    if (!map.has(key)) {
      map.set(key, { key, label, condition: item.condition, items: [] });
    }
    map.get(key)!.items.push(item);
  }
  return Array.from(map.values());
}

// ---------------------------------------------------------------------------
// Items list per variant group
// ---------------------------------------------------------------------------
interface ItemsListProps {
  purchaseId: string;
}

const ItemsList = memo(({ purchaseId }: ItemsListProps) => {
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [accessoryItems, setAccessoryItems] = useState<PurchaseAccessoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      purchaseService.getItems(purchaseId),
      purchaseService.getAccessoryItems(purchaseId),
    ])
      .then(([deviceItems, accessoryLines]) => {
        setItems(deviceItems);
        setAccessoryItems(accessoryLines);
      })
      .catch(() => setError("No se pudieron cargar los equipos"))
      .finally(() => setLoading(false));
  }, [purchaseId]);

  const groups = useMemo(() => groupByVariant(items), [items]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando equipos...
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-500 py-2">{error}</p>;
  }

  if (items.length === 0 && accessoryItems.length === 0) {
    return <p className="text-sm text-gray-400 italic py-2">Sin items registrados en esta compra.</p>;
  }

  return (
    <div className="space-y-4">
      {groups.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Equipos ingresados
          </p>
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.key} className="rounded-md border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100">
                  <Package className="h-4 w-4 text-blue-500 shrink-0" />
                  <span className="text-sm font-medium text-gray-800 flex-1">{group.label}</span>
                  <Badge variant={CONDITION_VARIANT[group.condition] ?? "outline"} className="text-xs">
                    {CONDITION_LABEL[group.condition] ?? group.condition}
                  </Badge>
                  <span className="text-xs text-gray-500">{group.items.length} unid.</span>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-8 text-center py-2">#</TableHead>
                        <TableHead className="py-2">IMEI</TableHead>
                        <TableHead className="py-2 text-right">Precio compra</TableHead>
                        {group.condition !== "new" && (
                          <>
                            <TableHead className="py-2 text-right">Precio venta</TableHead>
                            <TableHead className="py-2 text-right">Bateria</TableHead>
                            <TableHead className="py-2">OS</TableHead>
                            <TableHead className="py-2">Notas tecnicas</TableHead>
                          </>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((item, idx) => (
                        <TableRow key={item.id} className="text-sm">
                          <TableCell className="text-center text-gray-400 font-mono">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {item.imei ?? <span className="text-gray-400">—</span>}
                          </TableCell>
                          <TableCell className="text-right">{formatUsd(item.purchasePriceUsd)}</TableCell>
                          {group.condition !== "new" && (
                            <>
                              <TableCell className="text-right">{formatUsd(item.salePriceUsd)}</TableCell>
                              <TableCell className="text-right">
                                {item.batteryPercentage != null ? (
                                  <span className={item.batteryPercentage < 80 ? "text-orange-500" : "text-green-600"}>
                                    {item.batteryPercentage}%
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </TableCell>
                              <TableCell>{item.osVersion ?? <span className="text-gray-400">—</span>}</TableCell>
                              <TableCell className="max-w-xs truncate text-gray-600">
                                {item.technicalNotes ?? <span className="text-gray-400">—</span>}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {accessoryItems.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Accesorios comprados
          </p>
          <div className="rounded-md border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100">
              <Cable className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-sm font-medium text-gray-800 flex-1">Lineas de accesorios</span>
              <span className="text-xs text-gray-500">
                {accessoryItems.reduce((sum, item) => sum + item.quantity, 0)} unid.
              </span>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="py-2">Accesorio</TableHead>
                    <TableHead className="py-2 text-right">Cantidad</TableHead>
                    <TableHead className="py-2 text-right">Costo unit.</TableHead>
                    <TableHead className="py-2 text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accessoryItems.map((item) => (
                    <TableRow key={item.id} className="text-sm">
                      <TableCell>
                        <div className="font-medium text-gray-800">{item.accessoryName ?? 'Accesorio'}</div>
                        <div className="text-xs text-gray-500">
                          {item.accessoryVariantDescription ?? 'Sin variante'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatUsd(item.unitPriceUsd)}</TableCell>
                      <TableCell className="text-right font-medium">{formatUsd(item.lineTotalUsd)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
ItemsList.displayName = "ItemsList";

// ---------------------------------------------------------------------------
// Detail panel (meta info + items)
// ---------------------------------------------------------------------------
interface DetailProps {
  purchase: PurchaseView;
  onDelete: (p: PurchaseView) => void;
}

const PurchaseDetail = memo(({ purchase: p, onDelete }: DetailProps) => (
  <div className="space-y-4">
    {/* Meta info */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
      <div className="flex items-start gap-2">
        <Building2 className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Sucursal</p>
          <p className="text-gray-800 font-medium">
            {p.branchName ?? p.resolvedBranchName ?? <span className="text-gray-400">—</span>}
          </p>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <StickyNote className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Notas</p>
          <p className="text-gray-700 break-words">
            {p.notes ?? <span className="text-gray-400 italic">Sin notas</span>}
          </p>
        </div>
      </div>
    </div>

    <Separator />
    <ItemsList purchaseId={p.id} />

    {/* Actions */}
    <div className="flex justify-end gap-2 pt-1 border-t border-gray-200">
      <Button
        variant="outline" size="sm"
        className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
        onClick={() => onDelete(p)}
      >
        <Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar
      </Button>
    </div>
  </div>
));
PurchaseDetail.displayName = "PurchaseDetail";

// ---------------------------------------------------------------------------
// Mobile card
// ---------------------------------------------------------------------------
interface CardItemProps extends DetailProps {
  expanded: boolean;
  onToggle: () => void;
}

const PurchaseMobileCard = memo(({ purchase: p, expanded, onToggle, onDelete }: CardItemProps) => (
  <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
    <button
      type="button"
      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      onClick={onToggle}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
        <PurchaseDetail purchase={p} onDelete={onDelete} />
          <Badge variant="secondary" className="text-xs">{p.itemCount} unid.</Badge>
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {p.supplierName ?? p.resolvedSupplierName ?? "Sin proveedor"} · {formatUsd(p.totalUsd)}
        </p>
      </div>
      {expanded
        ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
    </button>
    
  </div>
));
PurchaseMobileCard.displayName = "PurchaseMobileCard";

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
const TablePurchaseComponent = ({ purchases, loading, searchQuery, onEdit, onDelete }: Props) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleRow = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const emptyState = (
    <div className="text-center py-10 text-gray-500">
      <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-300" />
      <p className="text-base font-medium">Sin compras registradas</p>
      <p className="text-sm mt-1">
        {searchQuery
          ? "Sin resultados para esa busqueda"
          : "Registra la primera compra usando el boton de arriba"}
      </p>
    </div>
  );

  const loadingState = (
    <div className="flex items-center justify-center py-10">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      <span className="ml-3 text-gray-600">Cargando...</span>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compras registradas</CardTitle>
        <CardDescription>Haz click en una fila para ver equipos y detalles</CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        {loading ? loadingState : purchases.length === 0 ? emptyState : (
          <>
            {/* Mobile (< sm) */}
            <div className="flex flex-col gap-3 sm:hidden">
              {purchases.map((p) => (
                <PurchaseMobileCard
                  key={p.id}
                  purchase={p}
                  expanded={expandedId === p.id}
                  onToggle={() => toggleRow(p.id)}
                  onDelete={onDelete}
                />
              ))}
            </div>

            {/* Table (sm+) */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-6" />
                    <TableHead>Fecha</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead className="text-right">Unidades</TableHead>
                    <TableHead className="text-right">Total USD</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((p) => {
                    const isExpanded = expandedId === p.id;
                    return (
                      <>
                        <TableRow
                          key={p.id}
                          className="cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => toggleRow(p.id)}
                        >
                          <TableCell className="pr-0">
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4 text-gray-400" />
                              : <ChevronRight className="h-4 w-4 text-gray-400" />}
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            {formatDate(p.purchasedAt)}
                          </TableCell>
                          <TableCell className="text-gray-700">
                            {p.supplierName ?? p.resolvedSupplierName ?? (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{p.itemCount}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatUsd(p.totalUsd)}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost" size="icon"
                                onClick={() => onDelete(p)} title="Eliminar"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow key={`${p.id}-detail`} className="bg-gray-50/80 hover:bg-gray-50/80">
                            <TableCell colSpan={6} className="py-4 px-6">
                              <PurchaseDetail purchase={p} onDelete={onDelete} />
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

TablePurchaseComponent.displayName = "TablePurchase";
export default memo(TablePurchaseComponent);
