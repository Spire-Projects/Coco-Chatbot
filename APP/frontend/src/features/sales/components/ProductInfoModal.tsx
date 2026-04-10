
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import { productService } from "@/shared/services/ProductService";
import type { ProductView } from "@/shared/types/modelTypes/Product";

interface ProductInfoModalProps {
    productId: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const ProductInfoModal: React.FC<ProductInfoModalProps> = ({ productId, open, onOpenChange }) => {
    const [product, setProduct] = useState<ProductView | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        const fetchProduct = async () => {
            try {
                const fetchedProduct = await productService.findById(productId);
                setProduct(fetchedProduct || null);
            } catch (error) {
                setProduct(null);
                console.error("Error fetching product:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [productId, open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Detalles del Producto</DialogTitle>
                    <DialogDescription>
                        Información detallada del producto seleccionado.
                    </DialogDescription>
                </DialogHeader>
                {loading ? (
                    <div className="py-8 text-center text-gray-400">Cargando...</div>
                ) : product ? (
                    <div className="space-y-4">
                        <div>
                            <span className="font-semibold">Nombre:</span> {product.name}
                        </div>
                        <div>
                            <span className="font-semibold">Código:</span> <Badge variant="outline">{product.code}</Badge>
                        </div>
                        <div>
                            <span className="font-semibold">Categoría:</span> {product.categoryName || "Sin categoría"}
                        </div>
                        <div>
                            <span className="font-semibold">Stock:</span> {typeof product.stock === "number" ? product.stock : "-"}
                        </div>
                        {product.description && (
                            <div>
                                <span className="font-semibold">Descripción:</span> {product.description}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-8 text-center text-red-400">No se encontró información del producto.</div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default ProductInfoModal;