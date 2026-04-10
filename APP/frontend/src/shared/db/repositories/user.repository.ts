import type { UserDocument } from '../models/user.model';

export interface IUserRepository {
  create(userData: Omit<UserDocument, 'id'>): Promise<UserDocument>;
  findByEmail(email: string): Promise<UserDocument | null>;
  findById(id: string): Promise<UserDocument | null>;
  findAll(): Promise<UserDocument[]>;
  update(id: string, updateData: Partial<UserDocument>): Promise<UserDocument | null>;
  delete(id: string): Promise<boolean>;
  softDelete(id: string): Promise<boolean>;
  restore(id: string): Promise<boolean>;
  findByRole(role: string): Promise<UserDocument[]>;
  findByText(searchText: string): Promise<UserDocument[]>;
  getStats(): Promise<{
    total: number;
    active: number;
    deleted: number;
    byRole: Record<string, number>;
  }>;
}

export const getUserRepository = (): IUserRepository => {
  throw new Error('PostgREST repository not yet implemented. Migration in progress.');
};
