import type { ICrudBaseRepository } from './interfaces/IRepository';
import type { Reparation, CreateReparationData, UpdateReparationData, ReparationFilter } from '../../types/modelTypes/Reparation';

export interface IReparationRepository extends ICrudBaseRepository<Reparation, CreateReparationData, UpdateReparationData, ReparationFilter> {}

export const getReparationRepository = (): IReparationRepository => {
  throw new Error('PostgREST repository not yet implemented. Migration in progress.');
};


export interface IReparationRepository extends ICrudBaseRepository<Reparation, CreateReparationData, UpdateReparationData, ReparationFilter> {
  
}
