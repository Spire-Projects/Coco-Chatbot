import type { IEntity } from "../UtilTypes";

export interface Branch extends IEntity {
    name: string;
    location?: string;
}
