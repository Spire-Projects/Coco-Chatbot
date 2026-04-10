import { Router } from "express";
import { getSessionProfileByName, isKnownSessionName, sessionProfiles } from "../../config/sessions.js";
import {
  getSessionRuntimeState,
  listSessionRuntimeStates,
  subscribeSessionEvents,
  type SessionRuntimePublicState
} from "./runtime.js";

const assertSessionName = (sessionName: string) => {
  if (!isKnownSessionName(sessionName)) {
    throw new Error(`Sesion no valida: ${sessionName}`);
  }
};

const toSessionPayload = (runtimeState: SessionRuntimePublicState) => {
  const profile = getSessionProfileByName(runtimeState.sessionId);
  if (!profile) {
    throw new Error(`Perfil de sesion no encontrado: ${runtimeState.sessionId}`);
  }

  return {
    sessionId: profile.sessionId,
    authDirName: profile.authDirName,
    sessionPhone: profile.sessionPhone,
    storeLocation: profile.storeLocation,
    mapsUrl: profile.mapsUrl,
    businessHours: profile.businessHours,
    agents: profile.agents,
    connection: runtimeState
  };
};

export const createSessionRouter = (): Router => {
  const router = Router();

  router.get("/", (_req, res) => {
    const states = listSessionRuntimeStates();
    const sessions = states.map(toSessionPayload);

    res.json({
      total: sessions.length,
      sessionIds: sessionProfiles.map((profile) => profile.sessionId),
      sessions
    });
  });

  router.get("/:sessionName", (req, res, next) => {
    try {
      const { sessionName } = req.params;
      assertSessionName(sessionName);

      res.json(toSessionPayload(getSessionRuntimeState(sessionName)));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:sessionName/connection", (req, res, next) => {
    try {
      const { sessionName } = req.params;
      assertSessionName(sessionName);
      res.json(getSessionRuntimeState(sessionName));
    } catch (error) {
      next(error);
    }
  });

  router.get("/:sessionName/events", (req, res, next) => {
    try {
      const { sessionName } = req.params;
      assertSessionName(sessionName);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const send = (event: string, payload: unknown) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      };

      send("session_state", getSessionRuntimeState(sessionName));

      const unsubscribe = subscribeSessionEvents(sessionName, (state) => {
        send("session_state", state);
        if (state.hasQr && state.qrRaw) {
          send("session_qr", { sessionId: state.sessionId, qrRaw: state.qrRaw, qrUpdatedAt: state.qrUpdatedAt });
        }
      });

      const heartbeat = setInterval(() => {
        send("heartbeat", { at: new Date().toISOString() });
      }, 15000);

      req.on("close", () => {
        clearInterval(heartbeat);
        unsubscribe();
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
