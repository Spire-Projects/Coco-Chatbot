// ---------------------------------------------------------------------------
// Core entity — maps to the `clients` table (migration 007)
// ---------------------------------------------------------------------------

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  updatedBy?: string;
  isDeleted: boolean;
}

// View model — no joins required for clients, same shape as base entity
export interface ClientView extends Client {}

// ---------------------------------------------------------------------------
// CRUD DTOs
// ---------------------------------------------------------------------------

export interface CreateClientData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  createdBy: string;
}

export interface UpdateClientData {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  updatedBy: string;
}

export interface ClientFilter {
  dateFrom?: string;
  dateTo?: string;
  [key: string]: unknown;
}