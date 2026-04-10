import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
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

const getStockBadge = (stock: number) => {
	if (stock === 0) {
		return <Badge variant="destructive">Sin stock</Badge>;
	}
	return <Badge variant="outline" className="border-green-500 text-green-600">{stock} disp.</Badge>;
};

const TableProductDesktop = memo(({ products, loading, searchQuery, onEdit, onDelete }: Props) => {
	const [selectedProduct, setSelectedProduct] = useState<ProductView | null>(null);
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);
	return (
		<>
			<Card className="hidden md:block">
				<CardHeader>
					<CardTitle>Variantes de producto</CardTitle>
					<CardDescription>Administra las variantes de tu inventario</CardDescription>
				</CardHeader>
				<CardContent>
					{loading ? (
						<div className="flex items-center justify-center py-8">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
							<span className="ml-3 text-gray-600">Cargando productos...</span>
						</div>
					) : products.length === 0 ? (
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
									<TableHead>Marca / Familia</TableHead>
									<TableHead>Modelo</TableHead>
									<TableHead>Variante</TableHead>
									<TableHead>Categoría</TableHead>
									<TableHead>Precio venta</TableHead>
									<TableHead>Mayorista</TableHead>
									<TableHead>Stock</TableHead>
									<TableHead className="text-right">Acciones</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{products.map((product) => (
									<TableRow key={product.id} className="hover:bg-muted/50">
										{/* Marca / Familia */}
										<TableCell>
											<p className="font-medium leading-tight">{product.brandName ?? <span className="text-muted-foreground text-xs">—</span>}</p>
											{product.familyName && (
												<p className="text-xs text-muted-foreground mt-0.5">{product.familyName}</p>
											)}
										</TableCell>

										{/* Modelo */}
										<TableCell>
											{product.modelName
												? <Badge variant="outline">{product.modelName}</Badge>
												: <span className="text-muted-foreground text-xs">—</span>}
										</TableCell>

										{/* Variante: storage · color · simType */}
										<TableCell>
											<div className="flex flex-wrap gap-1">
												{product.storage  && <Badge variant="secondary" className="text-xs font-normal">{product.storage}</Badge>}
												{product.color    && <Badge variant="secondary" className="text-xs font-normal">{product.color}</Badge>}
												{product.simType  && <Badge variant="outline"   className="text-xs font-normal">{product.simType}</Badge>}
												{!product.storage && !product.color && !product.simType && (
													<span className="text-muted-foreground text-xs">Base</span>
												)}
											</div>
										</TableCell>

										{/* Categoría */}
										<TableCell>
											{product.categoryName
												? <Badge variant="secondary">{product.categoryName}</Badge>
												: <span className="text-muted-foreground text-xs">—</span>}
										</TableCell>

										{/* Precio venta */}
										<TableCell>
											<span className="font-semibold text-green-600">
												${product.salePriceUsd.toFixed(2)}
											</span>
										</TableCell>

										{/* Precio mayorista */}
										<TableCell>
											{product.wholesalePriceUsd != null
												? <span className="text-muted-foreground text-sm">${product.wholesalePriceUsd.toFixed(2)}</span>
												: <span className="text-muted-foreground text-xs">—</span>}
										</TableCell>

										{/* Stock */}
										<TableCell>{getStockBadge(product.stock)}</TableCell>

										{/* Acciones */}
										<TableCell className="text-right">
											<div className="flex items-center justify-end gap-1">
												<Button
													variant="ghost"
													size="sm"
													onClick={() => { setSelectedProduct(product); setIsDetailsOpen(true); }}
													title="Ver detalles"
												>
													<Eye className="h-4 w-4" />
												</Button>
												<Button variant="ghost" size="sm" onClick={() => onEdit(product)} title="Editar">
													<Pencil className="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => onDelete(product)}
													className="text-destructive hover:text-destructive hover:bg-destructive/10"
													title="Eliminar"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<ProductDetailsModal
				isOpen={isDetailsOpen}
				onClose={() => { setIsDetailsOpen(false); setSelectedProduct(null); }}
				product={selectedProduct}
				onEdit={onEdit}
			/>
		</>
	);
});

TableProductDesktop.displayName = 'TableProductDesktop';

export default TableProductDesktop;
