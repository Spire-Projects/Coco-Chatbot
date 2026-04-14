export interface SessionStoreProfile {
  sessionId: string;
  businessName: string;
}

export const sessionProfiles: SessionStoreProfile[] = [
  {
    sessionId: "main",
    businessName: "Coco Chatbot"
  }
];

const profileBySessionId = new Map(sessionProfiles.map((profile) => [profile.sessionId, profile]));

export const getSessionProfileByName = (sessionId: string): SessionStoreProfile | undefined => {
  return profileBySessionId.get(sessionId);
};

export const isKnownSessionName = (sessionId: string): boolean => {
  return profileBySessionId.has(sessionId);
};
