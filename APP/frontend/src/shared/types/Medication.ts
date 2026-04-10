export interface Medication {
  id: string; // unique identifier for the medication
  comercialName: string; // comercial name from the manufacter
  tradeName: string; // e.g., "Aspirin 500mg"
  genericName: string; // ID that references GenericNameDoc.id (e.g., "generic-123")
  activeIngredientIds: string[]; // list of ActiveIngredient IDs
  pharmaceuticalFormId: string; // reference to PharmaceuticalFormDoc
  concentration: string; // e.g., "500mg"
  presentation: string; // e.g., "Box of 20 tablets"
  manufacturerId: string; // e.g., "PharmaCorp"
  categoryId: string;            // reference to MedicationCategory
  prescriptionRequired: boolean; // indicates if a prescription is required
  barcode?: string; // optional barcode for scanning
  description?: string; // e.g., "Used for pain relief"
  indications?: string; // e.g., "Headache, Fever"
  warnings?: string; // e.g., "Do not exceed recommended dose"
  sincronized?: boolean; // indicates if the medication is synchronized with the server
  isDeleted?: boolean; // indicates if the medication is deleted
  createdAt?: string; // e.g., "2023-10-01T12:00:00Z"
  createdBy?: string; // e.g., "user123" - ID of the user who created this medication
  updatedAt?: string; // e.g., "2023-10-01T12:00:00Z" - last update timestamp
  updatedBy?: string; // e.g., "user123" - ID of the user who last updated this medication
}

export interface MedicationBatch {
  id: string; // unique identifier for the batch (auto-generated)
  medicationId: string; // foreign key to the medication
  batchId: string; // unique identifier for the batch (user-defined)
  expirationDate: string; // e.g., "2025-12-31"
  quantity: number; // e.g., 100
  purchasePrice: number; // precio de compra del lote (costo)
  sellingPrice: number; // precio de venta al público
  purchaseDate?: string; // fecha de compra/adquisición del lote
  supplier?: string; // proveedor de este lote específico
  sincronized?: boolean; // indicates if the batch is synchronized with the server
  isDeleted?: boolean; // indicates if the batch is deleted
  createdAt?: string; // e.g., "2023-10-01T12:00:00Z"
  createdBy?: string; // e.g., "user123" - ID of the user who created this batch
  updatedAt?: string; // e.g., "2023-10-01T12:00:00Z" - last update timestamp
  updatedBy?: string; // e.g., "user123" - ID of the user who last updated this batch
}  

export interface ActiveIngredient {
  id: string; // unique identifier for the active ingredient
  name: string; // e.g., "Acetylsalicylic Acid"
  aliases?: string[]; // e.g., ["Aspirin", "ASA"]
  createdAt?: string; // e.g., "2023-10-01T12:00:00Z"
  createdBy?: string; // e.g., "user123" - ID of the user who created this ingredient
}

export interface MedicationCategory {
  id: string; // unique identifier for the category
  name: string; // e.g., "Pain Relievers"
  description?: string; // e.g., "Medications used to relieve pain"
  createdAt?: string; // e.g., "2023-10-01T12:00:00Z"
  createdBy?: string; // e.g., "user123" - ID of the user who created this category
}

export interface PharmaceuticalFormDoc {
  id: string; // unique identifier for the pharmaceutical form
  name: string; // e.g., "Tablet", "Syrup"
  aliases?: string[];  // e.g., ["Pill", "Capsule"]
  description?: string; // e.g., "Solid dosage form for oral administration"
  createdAt?: string; // e.g., "2023-10-01T12:00:00Z"
  createdBy?: string; // e.g., "user123" - ID of the user who created this form
  sincronized?: boolean; // indicates if the pharmaceutical form is synchronized with the server
  isDeleted?: boolean; // indicates if the pharmaceutical form is deleted
}



export interface GenericNameDoc { // same than category
  id: string;
  name: string;
  aliases?: string[];
  description?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  sincronized: boolean;
  isDeleted: boolean;
}

// ✅ NUEVAS INTERFACES DE SOPORTE PARA LA SEPARACIÓN DE ENTIDADES

// Interface para datos combinados (usada en la UI cuando necesitamos medicamento + sus batches)
export interface MedicationWithBatches {
  medication: Medication;
  batches: MedicationBatch[];
  totalStock: number; // calculado dinámicamente
  batchCount: number; // calculado dinámicamente
  oldestBatch?: MedicationBatch; // batch más próximo a vencer
}

// Interface para filtros de batches
export interface BatchFilters {
  medicationId?: string;
  expirationDateFrom?: string;
  expirationDateTo?: string;
  purchaseDateFrom?: string;
  purchaseDateTo?: string;
  supplier?: string;
  minQuantity?: number;
  maxQuantity?: number;
  minPurchasePrice?: number;
  maxPurchasePrice?: number;
  status?: 'valid' | 'expiring' | 'expired'; // basado en fecha de vencimiento
  createdBy?: string;
  batchId?: string; // buscar por ID de lote específico
}

// Interface para respuestas paginadas de batches
export interface BatchSearchResult {
  batches: MedicationBatch[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
}

// Interface para estadísticas de batches
export interface BatchStatistics {
  totalBatches: number;
  totalStock: number;
  batchesExpiringSoon: number; // próximos 30 días
  batchesExpired: number;
  averagePurchasePrice: number;
  averageSellingPrice: number;
  uniqueSuppliers: number;
}
