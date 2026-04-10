// DB: nits row (migration 013)
export interface NIT {
  id: string;
  numberNit: string;
  socialReason?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
  isDeleted: boolean;
}

export interface CreateNitData {
  numberNit: string;
  socialReason?: string;
  createdBy?: string;
}

export interface UpdateNitData {
  numberNit?: string;
  socialReason?: string;
}

export interface NitFilter {
  search?: string;
  isDeleted?: boolean;
}
