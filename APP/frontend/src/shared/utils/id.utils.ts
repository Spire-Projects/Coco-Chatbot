import { v4 as uuidv4 } from 'uuid';

/**
 * Genera un UUID único
 */
export const generateId = (): string => {
  return uuidv4();
};
