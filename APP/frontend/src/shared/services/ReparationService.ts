import { BaseService } from './BaseService';
import type { Reparation, ReparationView, CreateReparationData, UpdateReparationData, ReparationFilter } from '../types/modelTypes/Reparation';
import { getReparationRepository } from '../db/repositories/reparation.repository';
import { getClientRepository } from '../db/repositories/client.repository';
import { createLazyService } from './lazyService';

class ReparationService extends BaseService<Reparation, ReparationView, CreateReparationData, UpdateReparationData, ReparationFilter> {
  constructor() {
    super(getReparationRepository());
  }

  protected async toView(entity: Reparation): Promise<ReparationView> {
    let clientData;

    if (entity.clientId) {
      try {
        const clientRepo = getClientRepository();
        clientData = await clientRepo.findById(entity.clientId);
      } catch (error) {
        console.error('Error resolving client data:', error);
      }
    }

    return {
      ...entity,
      clientData: clientData || undefined
    };
  }
}

export const reparationService = createLazyService(() => new ReparationService());
