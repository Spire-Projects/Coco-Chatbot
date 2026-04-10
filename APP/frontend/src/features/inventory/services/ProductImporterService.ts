// @ts-nocheck
import { productService } from '@/shared/services/ProductService';
// import { categoryService } from '@/shared/services/CategoryService';
import { modelService } from '@/shared/services/ModelService';
import type { ParsedProductRow } from '../types/ParsedProductRow';
import type { Category } from '@/shared/types/modelTypes/Category';
import type { Model } from '@/shared/types/modelTypes/Model';

/**
 * Resultado de la importación de una fila
 */
export interface ImportRowResult {
  row: ParsedProductRow;
  success: boolean;
  productId?: string;
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
function validateRow(row: ParsedProductRow): string[] {
  const errors: string[] = [];
  
  // Validar código (OBLIGATORIO)
  if (!row.codigo || row.codigo.trim() === '') {
    errors.push('El código del producto es obligatorio');
  } else if (row.codigo.length < 1) {
    errors.push('El código debe tener al menos 1 carácter');
  } else if (row.codigo.length > 50) {
    errors.push('El código no puede tener más de 50 caracteres');
  }
  
  // Validar nombre (OBLIGATORIO)
  if (!row.nombre || row.nombre.trim() === '') {
    errors.push('El nombre del producto es obligatorio');
  } else if (row.nombre.length < 3) {
    errors.push('El nombre debe tener al menos 3 caracteres');
  } else if (row.nombre.length > 200) {
    errors.push('El nombre no puede tener más de 200 caracteres');
  }
  
  // Validar precio (OPCIONAL, pero debe ser >= 0 si se proporciona)
  if (row.precio !== null && row.precio !== undefined && row.precio < 0) {
    errors.push('El precio no puede ser negativo');
  }
  
  return errors;
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
  throw new Error('La importación con categorías está deshabilitada mientras la migración de CategoryService a PostgREST sigue pendiente.');
}

/**
 * Busca un modelo por nombre, si no existe lo crea
 */
async function findOrCreateModel(
  modelName: string,
  createdBy: string
): Promise<Model> {
  try {
    const normalizedName = modelName.trim();

    const response = await modelService.getAllView(1, 1000);
    const existingModel = response.items.find(
      (m) => m.name.toUpperCase() === normalizedName.toUpperCase()
    );

    if (existingModel) {
      return existingModel;
    }

    const newModel = await modelService.create({
      name: normalizedName,
      createdBy,
    });

    return newModel;
  } catch (error) {
    console.error('Error finding or creating model:', error);
    throw error;
  }
}

function buildSpecsFromRow(row: ParsedProductRow): Record<string, string | number> | undefined {
  const specs: Record<string, string | number> = {};

  if (row.ram) specs.ram = row.ram.trim();
  if (row.rom) specs.rom = row.rom.trim();
  if (row.color) specs.color = row.color.trim();
  if (row.bateria) specs.bateria = row.bateria.trim();
  if (row.pantalla) specs.pantalla = row.pantalla.trim();
  if (row.procesador) specs.procesador = row.procesador.trim();
  if (row.camara) specs.camara = row.camara.trim();
  if (row.sim) specs.sim = row.sim.trim();

  return Object.keys(specs).length > 0 ? specs : undefined;
}

/**
 * Verifica si un código de producto ya existe
 */
async function checkDuplicateCode(codigo: string): Promise<boolean> {
  try {
    const normalizedCode = codigo.trim().toUpperCase();
    
    // Buscar producto existente por código
    const response = await productService.getAllView(1, 10000);
    const existingProduct = response.items.find(
      (p) => p.code.toUpperCase() === normalizedCode
    );
    
    return !!existingProduct;
  } catch (error) {
    console.error('Error checking duplicate code:', error);
    throw error;
  }
}

/**
 * Importa una fila del Excel como producto
 */
async function importRow(
  row: ParsedProductRow,
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
    
    // 2. Verificar código duplicado
    const isDuplicate = await checkDuplicateCode(row.codigo);
    if (isDuplicate) {
      return {
        row,
        success: false,
        error: `El código "${row.codigo}" ya existe en el sistema`,
      };
    }
    
    // 3. Procesar categoría si existe
    let categoryId: string | undefined = undefined;
    if (row.categoria && row.categoria.trim() !== '') {
      const category = await findOrCreateCategory(row.categoria, createdBy);
      categoryId = category.id;
    }

    // 4. Procesar modelo si existe
    let modelId: string | undefined = undefined;
    if (row.modelo && row.modelo.trim() !== '') {
      const model = await findOrCreateModel(row.modelo, createdBy);
      modelId = model.id;
    }

    // 5. Construir especificaciones
    const specs = buildSpecsFromRow(row);
    
    // 6. Preparar datos del producto
    const codigo = row.codigo.trim().toUpperCase();
    const nombre = row.nombre.trim();
    const descripcion = row.descripcion?.trim() || undefined;
    const precio = row.precio ?? undefined;
    
    // 7. Crear el producto
    const product = await productService.create({
      code: codigo,
      name: nombre,
      model: modelId,
      category: categoryId,
      description: descripcion,
      price: precio,
      specs,
      createdBy,
    });
    
    return {
      row,
      success: true,
      productId: product.id,
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
 * Servicio para importar productos desde Excel
 */
class ProductImporterService {
  /**
   * Importa múltiples filas del Excel como productos
   * Procesa de manera secuencial para evitar problemas de concurrencia
   * 
   * @param rows - Array de filas parseadas del Excel
   * @param createdBy - ID del usuario que realiza la importación
   * @param onProgress - Callback opcional para reportar progreso
   * @returns Resultado de la importación con estadísticas
   */
  async importRows(
    rows: ParsedProductRow[],
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

export const productImporterService = new ProductImporterService();
