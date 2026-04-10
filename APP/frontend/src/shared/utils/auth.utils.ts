import CryptoJS from 'crypto-js';
import type {  UserDocument } from '../db/models/user.model';
import type { AuthUser } from '../types/User';

// Clave secreta para JWT
const JWT_SECRET = import.meta.env.VITE_JWT_SECRET || 'your-secret-key-change-in-production';

// Hash de contraseña usando crypto-js
export async function hashPassword(password: string): Promise<string> {
  return CryptoJS.SHA256(password + 'salt').toString();
}

// Verificar contraseña
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedPassword = CryptoJS.SHA256(password + 'salt').toString();
  return hashedPassword === hash;
}

// Generar JWT token usando crypto-js (más compatible)
export async function generateToken(user: AuthUser): Promise<string> {
  try {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };
    
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 horas
    };
    
    // Codificar header y payload en base64
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(payload));
    
    // Crear signature
    const dataToSign = `${encodedHeader}.${encodedPayload}`;
    const signature = CryptoJS.HmacSHA256(dataToSign, JWT_SECRET).toString(CryptoJS.enc.Base64url);
    
    return `${dataToSign}.${signature}`;
  } catch (error) {
    console.error('Error generando token:', error);
    throw new Error('Error generando token de autenticación');
  }
}

// Verificar JWT token usando crypto-js
export async function verifyToken(token: string): Promise<AuthUser | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const [encodedHeader, encodedPayload, signature] = parts;
    
    // Verificar signature
    const dataToSign = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = CryptoJS.HmacSHA256(dataToSign, JWT_SECRET).toString(CryptoJS.enc.Base64url);
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Decodificar payload
    const payload = JSON.parse(atob(encodedPayload));
    
    // Verificar expiración
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }
    
    return {
      id: payload.id as string,
      email: payload.email as string,
      role: payload.role as any,
      fullName: '', // Se completará al obtener datos del usuario
      active: true
    };
  } catch (error) {
    console.error('Error verificando token:', error);
    return null;
  }
}

// Convertir UserDocument a AuthUser (sin datos sensibles)
export function userToAuthUser(user: UserDocument): AuthUser {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
    lastSession: user.lastSession
  };
}

// Validar email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validar contraseña
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 6) {
    return { valid: false, message: 'La contraseña debe tener al menos 6 caracteres' };
  }
  
  if (password.length > 50) {
    return { valid: false, message: 'La contraseña no puede tener más de 50 caracteres' };
  }
  
  return { valid: true };
}

// Almacenar token en localStorage
export function storeToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

// Obtener token del localStorage
export function getStoredToken(): string | null {
  return localStorage.getItem('auth_token');
}

// Remover token del localStorage
export function removeStoredToken(): void {
  localStorage.removeItem('auth_token');
}
