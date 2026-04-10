export interface ItemsResponse<T> {
    items: T[];
    page: number;
    size: number;
    totalItems: number;
    totalPages: number;
}

export interface IEntity {
    id: string;                // UUID único del entidad
    createdBy: string;         // Usuario que creó el registro
    updatedBy?: string;        // Último usuario que lo modificó
    isDeleted: boolean;        // Borrado lógico
    sincronized: boolean;      // Estado de sincronización
    createdAt: string;         // Fecha de creación (ISO)
    updatedAt?: string;        // Fecha de actualización (ISO)
}

export interface IBaseRequest {
    page: number;              // Página solicitada
    size: number;              // Tamaño de página
    searchQuery?: string;      // Consulta de búsqueda (opcional)
    dateFrom?: string;        // Fecha desde (ISO, opcional)
    dateTo?: string;          // Fecha hasta (ISO, opcional)
}