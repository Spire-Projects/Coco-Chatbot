import { memo, useState } from "react";
import { ChevronDown, ChevronRight, Eye, Package, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import type { ProductView } from "@/shared/types/modelTypes/Product";
import { groupProductsByModel } from "@/features/inventory/utils/groupProducts";
import { ProductDetailsModal } from "../ProductDetailsModal";

interface Props {
  products: ProductView[];
  loading: boolean;
  searchQuery: string;
  onEdit: (product: ProductView) => void;
  onDelete: (product: ProductView) => void;
}

const getStockBadge = (stock: number) => {
  if (stock === 0)
    return <Badge variant="destructive">Sin stock</Badge>;
  return (
    <Badge variant="outline" className="border-green-500 text-green-600 shrink-0">
      {stock} disp.
    </Badge>
  );
};

const TableProductGroupedMobile = memo(
  ({ products, loading, searchQuery, onEdit, onDelete }: Props) => {
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [selectedProduct, setSelectedProduct] = useState<ProductView | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const groups = groupProductsByModel(products);

    const toggle = (modelId: string) => {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(modelId)) next.delete(modelId);
        else next.add(modelId);
        return next;
      });
    };

    return (
      <>
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="ml-3 text-gray-600">Cargando productos...</span>
            </div>
          ) : groups.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-700">No hay productos</p>
                <p className="text-sm text-gray-500">
                  {searchQuery
                    ? "No se encontraron productos"
                    : "Comienza registrando tu primer producto"}
                </p>
              </CardContent>
            </Card>
          ) : (
            groups.map((group) => {
              const isOpen = expandedIds.has(group.modelId);
              return (
                <Card key={`group-${group.modelId}`} className="overflow-hidden">
                  {/* ── Group header ── */}
                  <CardHeader
                    className="pb-2 cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => toggle(group.modelId)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {group.brandName && (
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
                            {group.brandName}
                            {group.familyName && (
                              <span className="normal-case"> · {group.familyName}</span>
                            )}
                          </p>
                        )}
                        <CardTitle className="text-base leading-tight">{group.modelName}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {group.categoryName && (
                            <Badge variant="secondary" className="text-xs">
                              {group.categoryName}
                            </Badge>
                          )}
                          <CardDescription className="text-xs">
                            {group.variants.length} variante
                            {group.variants.length !== 1 ? "s" : ""}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {getStockBadge(group.totalStock)}
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {/* ── Variants list (expanded) ── */}
                  {isOpen && (
                    <CardContent className="pt-0 pb-2 space-y-2">
                      <div className="border-t border-muted pt-2 space-y-2">
                        {group.variants.map((variant) => (
                          <div
                            key={`variant-${variant.id}`}
                            className="flex items-start justify-between gap-2 pl-3 border-l-2 border-muted-foreground/20 py-1"
                          >
                            {/* Left: variant chips + price */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex flex-wrap gap-1">
                                {variant.storage && (
                                  <Badge variant="secondary" className="text-xs font-normal">
                                    {variant.storage}
                                  </Badge>
                                )}
                                {variant.color && (
                                  <Badge variant="secondary" className="text-xs font-normal">
                                    {variant.color}
                                  </Badge>
                                )}
                                {variant.simType && (
                                  <Badge variant="outline" className="text-xs font-normal">
                                    {variant.simType}
                                  </Badge>
                                )}
                                {!variant.storage && !variant.color && !variant.simType && (
                                  <span className="text-muted-foreground text-xs">Base</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-semibold text-green-600">
                                  ${variant.salePriceUsd.toFixed(2)}
                                </span>
                                {variant.wholesalePriceUsd != null && (
                                  <span className="text-muted-foreground">
                                    May: ${variant.wholesalePriceUsd.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Right: stock + actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              {getStockBadge(variant.stock)}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  setSelectedProduct(variant);
                                  setIsDetailsOpen(true);
                                }}
                                title="Ver detalles"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onEdit(variant)}
                                title="Editar"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => onDelete(variant)}
                                title="Eliminar"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })
          )}
        </div>

        <ProductDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedProduct(null);
          }}
          product={selectedProduct}
          onEdit={onEdit}
        />
      </>
    );
  }
);

TableProductGroupedMobile.displayName = "TableProductGroupedMobile";

export default TableProductGroupedMobile;
