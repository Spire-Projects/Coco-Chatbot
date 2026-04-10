// Types for Create operations (omit generated fields)
export interface CreateActiveIngredientData {
  name: string;
  aliases?: string[];
  createdBy?: string;
}

export interface CreateMedicationCategoryData {
  name: string;
  description?: string;
  createdBy?: string;
}

export interface CreatePharmaceuticalFormData {
  name: string;
  aliases?: string[];
  description?: string;
  createdBy?: string;
}

export interface CreateManufacturerData {
  name: string;
  country?: string;
  website?: string;
  contactEmail?: string;
  createdBy?: string;
}

export interface CreateMedicationData {
  comercialName: string;
  tradeName: string;
  genericName: string;
  activeIngredientIds: string[];
  pharmaceuticalFormId: string;
  concentration: string;
  presentation: string;
  manufacturerId: string;
  categoryId: string;
  prescriptionRequired: boolean;
  barcode?: string;
  description?: string;
  indications?: string;
  warnings?: string;
  createdBy?: string;
}

export interface CreateMedicationBatchData {
  medicationId: string; // FK al medicamento
  batchId: string; // User-defined
  expirationDate: string;
  quantity: number;
  purchasePrice: number;
  sellingPrice: number;
  purchaseDate?: string;
  supplier?: string;
  createdBy?: string;
}

// Types for Update operations (partial data)
export interface UpdateActiveIngredientData {
  name?: string;
  aliases?: string[];
  updatedBy?: string;
}

export interface UpdateMedicationCategoryData {
  name?: string;
  description?: string;
  updatedBy?: string;
}

export interface UpdatePharmaceuticalFormData {
  name?: string;
  aliases?: string[];
  description?: string;
  updatedBy?: string;
}

export interface UpdateManufacturerData {
  name?: string;
  country?: string;
  website?: string;
  contactEmail?: string;
  updatedBy?: string;
}

export interface UpdateMedicationData {
  tradeName?: string;
  genericName?: string;
  activeIngredientIds?: string[];
  pharmaceuticalFormId?: string;
  concentration?: string;
  presentation?: string;
  manufacturerId?: string;
  categoryId?: string;
  barcode?: string;
  description?: string;
  indications?: string;
  warnings?: string;
  updatedBy?: string;
}

export interface UpdateMedicationBatchData {
  batchId?: string;
  expirationDate?: string;
  quantity?: number;
  purchasePrice?: number;
  sellingPrice?: number;
  purchaseDate?: string;
  supplier?: string;
  updatedBy?: string;
}

export interface CreateGenericNameData {
  name: string;
  aliases?: string[];
  description?: string;
  createdBy: string;
}

export interface UpdateGenericNameData {
  name?: string;
  aliases?: string[];
  description?: string;
  updatedBy?: string;
}
