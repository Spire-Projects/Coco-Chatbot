import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Pencil, Trash2, Package, Eye } from "lucide-react";
import type { ProductView } from "@/shared/types/modelTypes/Product";
import { memo, useState } from "react";
import { ProductDetailsModal } from "../ProductDetailsModal";

interface Props {
	products: ProductView[];
	loading: boolean;
	searchQuery: string;
	onEdit: (product: ProductView) => void;
	onDelete: (product: ProductView) => void;
}

const TableProductMobile = memo(({ products, loading, searchQuery, onEdit, onDelete }: Props) => {
	const [selectedProduct, setSelectedProduct] = useState<ProductView | null>(null);
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);

	return (
		<>
			<div className="md:hidden space-y-3">
				{loading ? (
					<div className="flex items-center justify-center py-8">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
						<span className="ml-3 text-gray-600">Cargando productos...</span>
					</div>
				) : products.length === 0 ? (
					<Card>
						<CardContent className="text-center py-8">
							<Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
							<p className="text-lg font-medium text-gray-700">No hay productos</p>
							<p className="text-sm text-gray-500">
								{searchQuery ? "No se encontraron productos" : "Comienza registrando tu primer producto"}
							</p>
						</CardContent>
					</Card>
				) : (
					products.map((product) => (
						<Card key={product.id} className="hover:shadow-md transition-shadow">
							<CardHeader className="pb-2">
								<div className="flex items-start justify-between gap-2">
									<div className="flex-1 min-w-0">
										{/* Brand line */}
										{product.brandName && (
											<p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
												{product.brandName}
												{product.familyName && <span className="normal-case"> · {product.familyName}</span>}
											</p>
										)}
										{/* Model */}
										<CardTitle className="text-base leading-tight">{product.modelName}</CardTitle>
										{/* Category */}
										{product.categoryName && (
											<CardDescription className="mt-0.5">
												<Badge variant="secondary" className="text-xs">{product.categoryName}</Badge>
											</CardDescription>
										)}
									</div>
									{/* Stock badge */}
									{product.stock === 0
										? <Badge variant="destructive">Sin stock</Badge>
										: <Badge variant="outline" className="border-green-500 text-green-600 shrink-0">{product.stock} disp.</Badge>}
								</div>
							</CardHeader>

							<CardContent className="space-y-2 pt-0">
								{/* Variant chips */}
								{(product.storage || product.color || product.simType) && (
									<div className="flex flex-wrap gap-1">
										{product.storage && <Badge variant="secondary" className="text-xs font-normal">{product.storage}</Badge>}
										{product.color   && <Badge variant="secondary" className="text-xs font-normal">{product.color}</Badge>}
										{product.simType && <Badge variant="outline"   className="text-xs font-normal">{product.simType}</Badge>}
									</div>
								)}

								{/* Prices */}
								<div className="flex items-center justify-between text-sm">
									<span className="text-muted-foreground">Venta:</span>
									<span className="font-semibold text-green-600">${product.salePriceUsd.toFixed(2)}</span>
								</div>
								{product.wholesalePriceUsd != null && (
									<div className="flex items-center justify-between text-sm">
										<span className="text-muted-foreground">Mayorista:</span>
										<span className="text-muted-foreground">${product.wholesalePriceUsd.toFixed(2)}</span>
									</div>
								)}

								{/* Actions */}
								<div className="flex gap-2 pt-1">
									<Button
										variant="outline" size="sm" className="flex-1"
										onClick={() => { setSelectedProduct(product); setIsDetailsOpen(true); }}
									>
										<Eye className="h-4 w-4 mr-1" /> Ver
									</Button>
									<Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(product)}>
										<Pencil className="h-4 w-4 mr-1" /> Editar
									</Button>
									<Button
										variant="outline" size="sm"
										onClick={() => onDelete(product)}
										className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</CardContent>
						</Card>
					))
				)}
			</div>

			<ProductDetailsModal
				isOpen={isDetailsOpen}
				onClose={() => { setIsDetailsOpen(false); setSelectedProduct(null); }}
				product={selectedProduct}
				onEdit={onEdit}
			/>
		</>
	);
});

TableProductMobile.displayName = 'TableProductMobile';

export default TableProductMobile;
