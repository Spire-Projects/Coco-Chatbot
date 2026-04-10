import type { Client } from "../Client";
import type { IEntity } from "../UtilTypes";

// Representa un nodo en el patrón de desbloqueo 3x3 (0-8)
// 0 1 2
// 3 4 5
// 6 7 8
export type GraphPattern = number[];

export type StatusReparation = 'repairing' | 'completed' | 'delivered';

export interface Reparation extends IEntity {
    clientId: string;
    model: string;
    description: string;  
    totalCost: number;
    advanceAmount: number;
    pendingAmount: number;
    stateReceived: string[];
    password?: string | GraphPattern;
    status: StatusReparation;
    deliveredAt?: string; // ISO - fecha de entrega del dispositivo
}

/**
 * CRUD interfaces
 */

export interface CreateReparationData {
    clientId: string;
    model: string;
    description: string;  
    totalCost: number;
    advanceAmount: number;
    pendingAmount: number;
    stateReceived: string[];
    password?: string | GraphPattern;
    createdBy: string;
}

export interface UpdateReparationData {
    model?: string;
    description?: string;  
    totalCost?: number;
    advanceAmount?: number;
    pendingAmount?: number;
    stateReceived?: string[];
    password?: string | GraphPattern;
    status?: StatusReparation;
    deliveredAt?: string;
    updatedBy?: string;
}

/**
 * View interfaces
 */
export interface ReparationView extends Reparation {
    clientData?: Client; 
}

/**
 * Filter interfaces
 */
export interface ReparationFilter {
    status?: StatusReparation   
}
