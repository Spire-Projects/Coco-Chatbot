export interface SalesAgentConfig {
  label: string;
  phone: string;
  shift: string;
}

export interface SessionStoreProfile {
  sessionId: string;
  authDirName: string;
  sessionPhone: string;
  storeLocation: string;
  mapsUrl?: string;
  businessHours: string;
  agents: SalesAgentConfig[];
}

export const sessionProfiles: SessionStoreProfile[] = [
  {
    sessionId: "palma-real",
    authDirName: "68609050",
    sessionPhone: "68609050",
    storeLocation:
      "Cochabamba, Av America entre Av Santa Cruz y Av Villarroel, edificio Palma Real.",
    mapsUrl: "https://url-shortener.me/HSSG",
    businessHours: "Lunes a viernes 9:00am a 8:00pm y sabado 9:00am a 7:00pm.",
    agents: [
      { label: "Agente 1", phone: "78726765", shift: "9:00am a 2:30pm" },
      { label: "Agente 2", phone: "69715924", shift: "2:30pm a 8:00pm" },
      { label: "Agente 3", phone: "76983049", shift: "2:30pm a 8:00pm" }
    ]
  },
  {
    sessionId: "paseo-aranjuez",
    authDirName: "78327156",
    sessionPhone: "78327156",
    storeLocation:
      "Cochabamba, Av America, Comercial Paseo Aranjuez Piso 2, al frente de Tigo.",
    mapsUrl: "https://url-shortener.me/HSSL",
    businessHours:
      "Lunes a sabado 10:00am a 10:00pm, domingo y feriados 11:00am a 9:00pm.",
    agents: [
      { label: "Agente 1", phone: "76218307", shift: "10:00am a 4:00pm" },
      { label: "Agente 2", phone: "77596615", shift: "4:00pm a 10:00pm" },
      { label: "Agente 3", phone: "76297894", shift: "4:00pm a 10:00pm" }
    ]
  },
  {
    sessionId: "tarija",
    authDirName: "64708999",
    sessionPhone: "64708999",
    storeLocation:
      "Tarija, Calle Colon casi Calle Madrid, a media cuadra de la plaza Sucre.",
    businessHours:
      "Lunes a sabado 9:30am a 1:30pm y 3:30pm a 8:30pm.",
    agents: [
      { label: "Agente 1", phone: "64708999", shift: "Horario general de tienda" }
    ]
  }
];

const profileBySessionId = new Map(sessionProfiles.map((profile) => [profile.sessionId, profile]));

export const getSessionProfileByName = (sessionId: string): SessionStoreProfile | undefined => {
  return profileBySessionId.get(sessionId);
};

export const isKnownSessionName = (sessionId: string): boolean => {
  return profileBySessionId.has(sessionId);
};

export const resolveSessionSelector = (selector: string): SessionStoreProfile | undefined => {
  return sessionProfiles.find(
    (profile) => profile.sessionId === selector || profile.authDirName === selector
  );
};
