import type { IEntity } from "../UtilTypes";

export interface Manufacturer extends IEntity{
 
  name: string; // e.g., "PharmaCorp"
  country?: string; // e.g., "USA"
  website?: string; // e.g., "https://www.pharmacorp.com"
  contactEmail?: string; // e.g., "test@test.com"
}

export interface CreateManufacturerData {
  name: string;
  country?: string;
  website?: string;
  contactEmail?: string;
  createdBy: string;
}

export interface UpdateManufacturerData {
  name?: string;
  country?: string;
  website?: string;
  contactEmail?: string;
  updatedBy?: string;
}

export interface ManufacturerView extends Manufacturer {
  // Additional fields for view can be added here
}

export interface ManufacturerFilter {
  name?: string; // Filter by manufacturer name
}