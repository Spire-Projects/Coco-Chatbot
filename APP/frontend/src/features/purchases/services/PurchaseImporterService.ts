// @ts-nocheck
import { productService } from '@/shared/services/ProductService';
import { purchaseService } from '@/shared/services/PurchaseService';
import { manufacturerService } from '@/shared/services/ManufacturerService';
// import { categoryService } from '@/shared/services/CategoryService';
import type { ParsedPurchaseRow } from '../types/ParsedPurchaseRow';
import type { Product } from '@/shared/types/modelTypes/Product';
import type { Manufacturer } from '@/shared/types/modelTypes/Manufacturer';
import type { Category } from '@/shared/types/modelTypes/Category';

/**
 * Resultado de la importación de una fila
 */
export interface ImportRowResult {
  row: ParsedPurchaseRow;
  success: boolean;
  productId?: string;
  purchaseId?: string;
  error?: string;
}

/**
 * Resultado completo de la importación
 */
export interface ImportResult {
  totalRows: number;
  successfulImports: number;
  failedImports: number;
  results: ImportRowResult[];
}

/**
 * Valida una fila parseada del Excel
 * Retorna array de errores (vacío si es válida)
 */
function validateRow(row: ParsedPurchaseRow): string[] {
  const errors: string[] = [];
  const imeisCount = row.imeis?.length ?? 0;
  
  // Validar código (OBLIGATORIO)
  if (!row.codigo || row.codigo.trim() === '') {
    errors.push('El código del producto es obligatorio');
  }
  
  // Validar cantidad comprada (OBLIGATORIO), salvo que venga derivada por IMEIs.
  if (
    (row.cantidadComprada === null || row.cantidadComprada === undefined || row.cantidadComprada <= 0) &&
    imeisCount === 0
  ) {
    errors.push('La cantidad comprada debe ser mayor a 0 o derivarse de IMEIs');
  }
  
  // Validar precio unitario (OBLIGATORIO)
  if (row.precioUnitario === null || row.precioUnitario === undefined || row.precioUnitario <= 0) {
    errors.push('El precio unitario debe ser mayor a 0');
  }
  
  // Si hay IMEIs y cantidad explicita, ambas deben coincidir.
  if (imeisCount > 0 && row.cantidadComprada != null && row.cantidadComprada !== imeisCount) {
    errors.push(`La cantidad comprada (${row.cantidadComprada}) debe coincidir con la cantidad de IMEIs (${imeisCount})`);
  }
  
  return errors;
}

/**
 * Genera un número de recibo único
 * Formato: 4 letras + 4 números (ej: ABCD1234)
 */
function generateReceiptNumber(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  
  let receipt = '';
  
  // 4 letras aleatorias
  for (let i = 0; i < 4; i++) {
    receipt += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  
  // 4 números aleatorios
  for (let i = 0; i < 4; i++) {
    receipt += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  return receipt;
}

/**
 * Busca una categoría por nombre, si no existe la crea
 */
async function findOrCreateCategory(
  categoryName: string,
  createdBy: string
): Promise<Category> {
  void categoryName;
  void createdBy;
  throw new Error('La importación de compras con categorías está deshabilitada mientras la migración de CategoryService a PostgREST sigue pendiente.');
}

/**
 * Busca un proveedor por nombre, si no existe lo crea
 */
async function findOrCreateSupplier(
  supplierName: string,
  createdBy: string
): Promise<Manufacturer> {
  try {
    const normalizedName = supplierName.trim();
    
    // Buscar proveedor existente
    const response = await manufacturerService.getAllView(1, 1000);
    const existingSupplier = response.items.find(
      (s) => s.name.toUpperCase() === normalizedName.toUpperCase()
    );
    
    if (existingSupplier) {
      return existingSupplier;
    }
    
    // Crear nuevo proveedor
    const newSupplier = await manufacturerService.create({
      name: normalizedName,
      createdBy,
    });
    
    return newSupplier;
  } catch (error) {
    console.error('Error finding or creating supplier:', error);
    throw error;
  }
}

/**
 * Busca un producto por código, si no existe lo crea
 */
async function findOrCreateProduct(
  codigo: string,
  productName: string | null | undefined,
  categoryId: string | undefined,
  createdBy: string
): Promise<Product> {
  try {
    const normalizedCode = codigo.trim().toUpperCase();
    
    // Buscar producto existente por código
    const response = await productService.getAllView(1, 1000);
    const existingProduct = response.items.find(
      (p) => p.code.toUpperCase() === normalizedCode
    );
    
    if (existingProduct) {
      return existingProduct;
    }
    
    // Crear nuevo producto
    const newProduct = await productService.create({
      code: normalizedCode,
      name: productName?.trim() || normalizedCode,
      category: categoryId,
      createdBy,
    });
    
    return newProduct;
  } catch (error) {
    console.error('Error finding or creating product:', error);
    throw error;
  }
}

/**
 * Importa una fila del Excel como compra
 */
async function importRow(
  row: ParsedPurchaseRow,
  createdBy: string
): Promise<ImportRowResult> {
  try {
    // 1. Validar la fila
    const validationErrors = validateRow(row);
    if (validationErrors.length > 0) {
      return {
        row,
        success: false,
        error: validationErrors.join(', '),
      };
    }
    
    // 2. Procesar categoría si existe
    let categoryId: string | undefined = undefined;
    if (row.categoria && row.categoria.trim() !== '') {
      const category = await findOrCreateCategory(row.categoria, createdBy);
      categoryId = category.id;
    }
    
    // 3. Encontrar o crear el producto
    const product = await findOrCreateProduct(
      row.codigo,
      row.producto,
      categoryId,
      createdBy
    );
    
    // 3.1. Actualizar el precio de venta del producto si se proporcionó en el Excel
    if (row.precioVenta !== null && row.precioVenta !== undefined && row.precioVenta > 0) {
      try {
        await productService.update(product.id, {
          price: row.precioVenta,
          updatedBy: createdBy,
        });
      } catch (error) {
        console.error('Error updating product price:', error);
        // No fallar la importación si no se puede actualizar el precio
      }
    }
    
    // 4. Procesar proveedor si existe
    let supplierId: string | undefined = undefined;
    if (row.proveedor && row.proveedor.trim() !== '') {
      const supplier = await findOrCreateSupplier(row.proveedor, createdBy);
      supplierId = supplier.id;
    }
    
    // 5. Preparar datos de la compra
    const imeis = row.imeis ?? [];
    const quantityPurchased = imeis.length > 0 ? imeis.length : row.cantidadComprada!;
    const purchaseDate = row.fechaCompra
      ? new Date(row.fechaCompra).toISOString()
      : new Date().toISOString();
    const receiptNumber = row.numeroComprobante?.trim() || generateReceiptNumber();
    const unitCost = row.precioUnitario!;
    const totalCost = row.precioTotal || (quantityPurchased * unitCost);
    const profitMarginPercentage = row.margenGanancia ?? 0;
    const notes = row.notas?.trim() || undefined;
    
    // 6. Crear la compra
    const purchase = await purchaseService.create({
      productId: product.id,
      purchaseDate,
      receiptNumber,
      quantity: quantityPurchased,
      unitCost,
      totalCost,
      supplierId,
      profitMarginPercentage,
      notes,
      imeis,
      createdBy,
    });
    
    return {
      row,
      success: true,
      productId: product.id,
      purchaseId: purchase.id,
    };
  } catch (error) {
    console.error('Error importing row:', error);
    return {
      row,
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Servicio para importar compras desde Excel
 */
class PurchaseImporterService {
  /**
   * Importa múltiples filas del Excel como compras
   * Procesa de manera secuencial para evitar problemas de concurrencia
   */
  async importRows(
    rows: ParsedPurchaseRow[],
    createdBy: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<ImportResult> {
    const results: ImportRowResult[] = [];
    let successfulImports = 0;
    let failedImports = 0;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      // Notificar progreso
      if (onProgress) {
        onProgress(i + 1, rows.length);
      }
      
      // Importar fila
      const result = await importRow(row, createdBy);
      results.push(result);
      
      if (result.success) {
        successfulImports++;
      } else {
        failedImports++;
      }
    }
    
    return {
      totalRows: rows.length,
      successfulImports,
      failedImports,
      results,
    };
  }
}

export const purchaseImporterService = new PurchaseImporterService();
