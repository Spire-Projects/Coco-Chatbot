import type { ICrudBaseRepository } from '../db/repositories/interfaces/IRepository';
import type { ItemsResponse } from '../types/UtilTypes';

/**
 * Servicio base genérico que encapsula operaciones CRUD comunes
 * @template T - Tipo de entidad base (modelo de BD)
 * @template TView - Tipo de entidad para vista (con campos resueltos)
 * @template TCreate - Tipo para creación (sin campos auto-generados)
 * @template TUpdate - Tipo para actualización (campos opcionales)
 */
export abstract class BaseService<
  T extends { id: string; isDeleted: boolean; createdAt: string },
  TView extends T,
  TCreate,
  TUpdate,
  TFilter
> {
  constructor(
    protected readonly repository: ICrudBaseRepository<T, TCreate, TUpdate, TFilter>
  ) {}

  /**
   * Método abstracto que debe implementar cada servicio específico
   * para transformar el modelo base en el modelo de vista
   */
  protected abstract toView(entity: T): Promise<TView>;

  /**
   * Transforma múltiples entidades a vista
   */
  protected async toViews(entities: T[]): Promise<TView[]> {
    return Promise.all(entities.map(e => this.toView(e)));
  }

  /**
   * Crea una nueva entidad
   */
  async create(data: TCreate): Promise<TView> {
    const created = await this.repository.create(data as any);
    return this.toView(created);
  }

  /**
   * Actualiza una entidad existente
   */
  async update(id: string, data: TUpdate): Promise<TView | null> {
    const updated = await this.repository.update(id, data);
    if (!updated) return null;
    return this.toView(updated);
  }

  /**
   * Elimina (soft delete) una entidad
   */
  async delete(id: string): Promise<boolean> {
    return this.repository.softDelete(id);
  }

  /**
   * Obtiene todas las entidades paginadas (método público para hooks)
   */
  async getAllView(
    page: number,
    size: number,
    searchQuery?: string,
    dateFrom?: string,
    dateTo?: string,
    filter?: TFilter
  ): Promise<ItemsResponse<TView>> {
    const result = await this.repository.getAll(page, size, searchQuery, dateFrom, dateTo, filter);
    const items = await this.toViews(result.items);
    return { ...result, items };
  }

  /**
   * Obtiene todas las entidades paginadas (legacy, usa getAllView)
   * @deprecated Usa getAllView en su lugar
   */
  async getAll(
    page: number,
    size: number,
    searchQuery?: string,
    dateFrom?: string,
    dateTo?: string,
    filter?: TFilter
  ): Promise<ItemsResponse<TView>> {
    return this.getAllView(page, size, searchQuery, dateFrom, dateTo, filter);
  }

  /**
   * Busca una entidad por ID
   */
  async findById(id: string): Promise<TView | null> {
    const entity = await this.repository.findById(id);
    if (!entity) return null;
    return this.toView(entity);
  }
}