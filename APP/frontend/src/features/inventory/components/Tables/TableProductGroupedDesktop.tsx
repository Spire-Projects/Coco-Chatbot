import { memo, useState } from "react";
import { ChevronDown, ChevronRight, Eye, Package, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
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
    <Badge variant="outline" className="border-green-500 text-green-600">
      {stock} disp.
    </Badge>
  );
};

const TableProductGroupedDesktop = memo(
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
        <Card className="hidden md:block">
          <CardHeader>
            <CardTitle>Productos por modelo</CardTitle>
            <CardDescription>
              {groups.length} modelo{groups.length !== 1 ? "s" : ""} — haz clic en una fila para
              ver sus variantes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                <span className="ml-3 text-gray-600">Cargando productos...</span>
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No hay productos</p>
                <p className="text-sm">
                  {searchQuery
                    ? "No se encontraron productos con ese criterio"
                    : "Comienza registrando tu primer producto"}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Marca / Familia</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Variantes</TableHead>
                    <TableHead>Stock total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group) => {
                    const isOpen = expandedIds.has(group.modelId);
                    return (
                      <>
                        {/* ── Group header row ── */}
                        <TableRow
                          key={`group-${group.modelId}`}
                          className="cursor-pointer hover:bg-muted/60 bg-muted/20"
                          onClick={() => toggle(group.modelId)}
                        >
                          <TableCell className="pr-0">
                            {isOpen ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>

                          <TableCell>
                            <p className="font-medium leading-tight">
                              {group.brandName ?? (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </p>
                            {group.familyName && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {group.familyName}
                              </p>
                            )}
                          </TableCell>

                          <TableCell>
                            <Badge variant="outline" className="font-semibold">
                              {group.modelName}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            {group.categoryName ? (
                              <Badge variant="secondary">{group.categoryName}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>

                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {group.variants.length} variante
                              {group.variants.length !== 1 ? "s" : ""}
                            </span>
                          </TableCell>

                          <TableCell>{getStockBadge(group.totalStock)}</TableCell>
                        </TableRow>

                        {/* ── Variant rows (expanded) ── */}
                        {isOpen &&
                          group.variants.map((variant) => (
                            <TableRow
                              key={`variant-${variant.id}`}
                              className="bg-background hover:bg-muted/30"
                            >
                              {/* indent */}
                              <TableCell />

                              {/* Variant attributes */}
                              <TableCell colSpan={2}>
                                <div className="flex flex-wrap gap-1 pl-4 border-l-2 border-muted-foreground/20">
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
                                    <span className="text-muted-foreground text-xs pl-1">Base</span>
                                  )}
                                </div>
                              </TableCell>

                              {/* Category (empty in variant row) */}
                              <TableCell />

                              {/* Price */}
                              <TableCell>
                                <span className="font-semibold text-green-600 text-sm">
                                  ${variant.salePriceUsd.toFixed(2)}
                                </span>
                                {variant.wholesalePriceUsd != null && (
                                  <p className="text-xs text-muted-foreground">
                                    May: ${variant.wholesalePriceUsd.toFixed(2)}
                                  </p>
                                )}
                              </TableCell>

                              {/* Stock */}
                              <TableCell>{getStockBadge(variant.stock)}</TableCell>

                              {/* Actions */}
                              <TableCell className="text-right" colSpan={1}>
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedProduct(variant);
                                      setIsDetailsOpen(true);
                                    }}
                                    title="Ver detalles"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onEdit(variant)}
                                    title="Editar"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onDelete(variant)}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

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

TableProductGroupedDesktop.displayName = "TableProductGroupedDesktop";

export default TableProductGroupedDesktop;
