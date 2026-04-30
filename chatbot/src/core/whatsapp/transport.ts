/**
 * Abstracción del transporte de WhatsApp.
 *
 * Permite intercambiar el proveedor (Baileys, Meta Cloud API) sin tocar
 * la lógica de negocio. Para cambiar de proveedor:
 *   1. Implementar IWhatsAppTransport en un nuevo archivo bajo transports/
 *   2. Cambiar WHATSAPP_PROVIDER en el .env
 *   3. Registrar el nuevo proveedor en app.ts
 */

export interface IncomingMessage {
  from: string;
  text: string;
  messageId: string;
}

export type IncomingMessageHandler = (msg: IncomingMessage) => Promise<void>;

export type ConnectionStatus = "starting" | "waiting_qr" | "connected" | "reconnecting";

export interface ConnectionState {
  status: ConnectionStatus;
  qrRaw: string | null;
}

export interface IWhatsAppTransport {
  /** Envía un mensaje de texto plano al destinatario indicado */
  sendTextMessage(to: string, text: string): Promise<void>;

  /** Marca un mensaje como leído (doble tick azul) */
  markMessageAsRead(messageId: string): Promise<void>;

  /**
   * Inicia el transporte y registra el handler de mensajes entrantes.
   * En Baileys: abre el socket y muestra el QR.
   * En Meta:    espera mensajes via webhook HTTP.
   */
  connect(onMessage: IncomingMessageHandler): Promise<void>;

  /** Cierra la conexión limpiamente */
  disconnect(): Promise<void>;

  /** Retorna el estado actual de conexión */
  getConnectionState(): ConnectionState;

  /**
   * Registra un callback que se invoca cada vez que el estado cambia.
   * Retorna una función para cancelar la suscripción.
   */
  onConnectionStateChange(cb: (state: ConnectionState) => void): () => void;
}
