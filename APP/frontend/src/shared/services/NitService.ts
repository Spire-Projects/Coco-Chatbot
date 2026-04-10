import type { NIT, CreateNitData } from '../types/Nit';
import type { ItemsResponse } from '../types/UtilTypes';
import { getNitRepository } from '../db/repositories/nit.repository';

const getRepo = () => getNitRepository();

// ─── CRUD ────────────────────────────────────────────────────────────────────

export const createNit = async (data: CreateNitData): Promise<NIT> => {
  const existing = await getRepo().findByNumberNit(data.numberNit);
  if (existing) throw new Error('Ya existe un NIT con este número');
  return getRepo().create(data);
};

export const getNitById = async (id: string): Promise<NIT | null> => {
  return getRepo().findById(id);
};

export const updateNit = async (
  id: string,
  data: { numberNit?: string; socialReason?: string },
): Promise<NIT | null> => {
  return getRepo().update(id, data);
};

export const deleteNit = async (id: string): Promise<boolean> => {
  return getRepo().softDelete(id);
};

// ─── QUERIES ──────────────────────────────────────────────────────────────────

export const getAllNits = async (): Promise<NIT[]> => {
  return getRepo().getActiveNits();
};

export const getAllNitsPaginated = async (
  page = 1,
  size = 20,
  searchQuery?: string,
): Promise<ItemsResponse<NIT>> => {
  return getRepo().getAll(page, size, searchQuery);
};

export const searchNits = async (searchText: string): Promise<NIT[]> => {
  const result = await getRepo().getAll(1, 50, searchText);
  return result.items;
};

// ─── VALIDATION (pure functions, no DB) ──────────────────────────────────────

export const validateNitNumber = (numberNit: string): boolean => {
  const clean = numberNit.replace(/[^\d]/g, '');
  return clean.length >= 7 && clean.length <= 15;
};

export const validateSocialReason = (socialReason: string): boolean => {
  return socialReason.trim().length >= 3;
};

export const formatNitInfo = (nit: NIT): string =>
  nit.socialReason ? `${nit.numberNit} - ${nit.socialReason}` : nit.numberNit;
