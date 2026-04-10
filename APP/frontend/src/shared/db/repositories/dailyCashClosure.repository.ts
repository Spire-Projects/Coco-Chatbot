import type { ICrudBaseRepository } from './interfaces/IRepository';
import type { DailyCashClosure, CreateDaylyCashClosure, UpdateDailyCashClosure, DailyCashClosureFilter } from '@/shared/types/DailyCashClosure';

export interface IDailyCashClosureRepository extends ICrudBaseRepository<DailyCashClosure, CreateDaylyCashClosure, UpdateDailyCashClosure, DailyCashClosureFilter> {}

export const getDailyCashClosureRepository = (): IDailyCashClosureRepository => {
  throw new Error('PostgREST repository not yet implemented. Migration in progress.');
};


export interface IDailyCashClosureRepository extends ICrudBaseRepository<DailyCashClosure, CreateDaylyCashClosure, UpdateDailyCashClosure, DailyCashClosureFilter> {}
