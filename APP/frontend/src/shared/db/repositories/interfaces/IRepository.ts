import type { ItemsResponse } from '../../../types/UtilTypes';

type RepositorySubscription = { unsubscribe: () => void };
type RepositoryObservable<T> = {
  subscribe: (observer: {
    next: (value: T) => void;
    error?: (err: unknown) => void;
  }) => RepositorySubscription;
};

export interface ICrudBaseRepository<T, TCreate, TUpdate, TFilter> {
  create(data: TCreate): Promise<T>;
  update(id: string, updateData: TUpdate): Promise<T | null>;
  softDelete(id: string): Promise<boolean>;
  getAll(page: number, size: number, searchQuery?: string, dateFrom?: string, dateTo?: string, filter?: TFilter): Promise<ItemsResponse<T>>;
  findById(id: string): Promise<T | null>;
  listen$?(page: number, size: number, searchQuery?: string, dateFrom?: string, dateTo?: string, filter?: TFilter): RepositoryObservable<T[]>;
  lisntenById$?(id: string): RepositoryObservable<T | null>;
}
