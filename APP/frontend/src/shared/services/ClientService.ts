import type { Client, ClientView, ClientFilter, CreateClientData, UpdateClientData } from '../types/Client';
import { getClientRepository } from '../db/repositories/client.repository';
import { BaseService } from './BaseService';
import { createLazyService } from './lazyService';

class ClientService extends BaseService<
  Client,
  ClientView,
  CreateClientData,
  UpdateClientData,
  ClientFilter
> {
  constructor() {
    super(getClientRepository());
  }

  protected async toView(entity: Client): Promise<ClientView> {
    return entity;
  }
}

export const clientService = createLazyService(() => new ClientService());