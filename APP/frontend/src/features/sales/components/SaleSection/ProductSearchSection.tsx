// @ts-nocheck
import { memo, useState, useCallback, useEffect } from "react";
import { Badge } from "@/shared/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import SearchInput from "@/shared/components/SearchInput";
import { productService } from "@/shared/services/ProductService";
import type { ProductView } from "@/shared/types/modelTypes/Product";

interface ProductSearchSectionProps {
  onAddProduct: (product: ProductView) => void;
  disabled?: boolean;
}

const ProductSearchSection = memo(({ onAddProduct, disabled = false }: ProductSearchSectionProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProductView[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Buscar productos usando el servicio
  const performSearch = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const trimmedQuery = query.trim();
      const normalizedQuery = trimmedQuery.toLowerCase();

      // Busqueda por texto general + busqueda especifica por IMEI en memoria.
      const [textSearchResponse, imeiSearchResponse] = await Promise.all([
        productService.getAllView(1, 100, trimmedQuery),
        productService.getAllView(1, 500),
      ]);

      const imeiMatches = imeiSearchResponse.items.filter((p: ProductView) =>
        (p.imeis || []).some((imei) => imei.toLowerCase().includes(normalizedQuery))
      );

      const mergedById = new Map<string, ProductView>();
      [...textSearchResponse.items, ...imeiMatches].forEach((product) => {
        mergedById.set(product.id, product);
      });

      const productsWithStock = Array.from(mergedById.values()).filter(
        (p: ProductView) => (p.stock || 0) > 0
      );

      productsWithStock.sort((a: ProductView, b: ProductView) =>
        (a.stock || 0) - (b.stock || 0)
      );

      setSearchResults(productsWithStock);
      setShowResults(productsWithStock.length > 0);
    } catch (error) {
      console.error('Error searching products:', error);
      toast.error('Error al buscar productos');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  // Manejar agregar producto
  const handleAddProduct = useCallback(async (product: ProductView) => {
    try {
      onAddProduct(product);
      
      // Limpiar búsqueda después de agregar
      setSearchQuery("");
      setSearchResults([]);
      setShowResults(false);
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Error al agregar el producto');
    }
  }, [onAddProduct]);

  

  // Obtener precio del producto
  const getProductPrice = (product: ProductView) => {
    return product.price || 0;
  };

  // Obtener stock total del producto
  const getProductStock = (product: ProductView) => {
    return product.stock || 0;
  };

  return (
    <div className="relative w-full p-1">
      {/* Buscador */}
      <div className="relative">
       <SearchInput
       
          value={searchQuery}
          onChange={setSearchQuery}
          
          isLoading={isSearching}
          disabled={disabled}
        />
      </div>

      {/* Popover de resultados - z-index alto para aparecer sobre otros elementos */}
      {showResults && searchResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
          <div className="divide-y">
            {searchResults.map((product) => (
              <div
                key={product.id}
                onClick={() => !disabled && handleAddProduct(product)}
                className="p-3 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Información del producto */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">
                        {product.name}
                      </h4>
                      {product.code && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {product.code}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                      <div>
                        <span className="font-medium">Stock Total:</span>{" "}
                        <span className={getProductStock(product) < 10 ? "text-orange-600 font-medium" : ""}>
                          {getProductStock(product)} und
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Precio:</span> Bs {getProductPrice(product).toFixed(2)}
                      </div>
                      {product.categoryName && (
                        <div className="col-span-2">
                          <span className="font-medium">Categoría:</span> {product.categoryName}
                        </div>
                      )}
                    </div>

                    {/* Alertas */}
                    {getProductStock(product) < 10 && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-orange-600">
                        <AlertCircle className="h-3 w-3" />
                        <span>Stock limitado ({getProductStock(product)} und disponibles)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay resultados */}
      {showResults && searchResults.length === 0 && !isSearching && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
          <div className="text-center text-gray-500">
            <p className="text-sm">No se encontraron productos con stock disponible</p>
          </div>
        </div>
      )}
    </div>
  );
});

ProductSearchSection.displayName = 'ProductSearchSection';

export default ProductSearchSection;