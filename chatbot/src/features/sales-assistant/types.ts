export type SalesIntent = "query" | "comparison";

/**
 * Empresa del directorio. Cada campo corresponde a una columna del Google Sheets:
 * A=departamento  B=municipio      C=nombre
 * D=actividadPrincipal             E=tipoEmpresa
 * F=gerente       G=direccion      H=email    I=telefono
 * J-M=actividades secundarias 2-5
 */
export interface CatalogItem {
  departamento: string;       // Col A
  municipio: string;          // Col B
  nombre: string;             // Col C
  actividadPrincipal: string; // Col D
  tipoEmpresa: string;        // Col E  (SRL, Unipersonal, SA…)
  gerente: string;            // Col F
  direccion: string;          // Col G
  email: string;              // Col H
  telefono: string;           // Col I
  /** D + J + K + L + M unidos para búsqueda por rubro */
  actividades: string[];
}

export interface ConversationTurn {
  role: "user" | "assistant";
  text: string;
  at: number;
}

export interface ConversationMemory {
  jid: string;
  createdAt: number;
  lastActivityAt: number;
  turns: ConversationTurn[];
  productsMentioned: string[];
  lastIntent: SalesIntent;
  /** Último rubro/área buscado — persiste entre turnos */
  lastRubro: string;
  /** Última ubicación (departamento/ciudad) mencionada — persiste entre turnos */
  lastUbicacion: string;
}
