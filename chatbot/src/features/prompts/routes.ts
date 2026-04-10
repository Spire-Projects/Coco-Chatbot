import { Router } from "express";
import { isKnownSessionName } from "../../config/sessions.js";
import {
  getGlobalPromptFresh,
  getSessionPromptFresh,
  resolvePromptForSessionFresh,
  updateGlobalPrompt,
  updateSessionPrompt
} from "./service.js";

const MAX_PROMPT_LENGTH = 12000;

const parsePromptContent = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new Error("El campo content debe ser texto");
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new Error("El contenido del prompt no puede estar vacio");
  }

  if (normalized.length > MAX_PROMPT_LENGTH) {
    throw new Error(`El prompt supera el limite de ${MAX_PROMPT_LENGTH} caracteres`);
  }

  return normalized;
};

const assertSessionName = (sessionName: string) => {
  if (!isKnownSessionName(sessionName)) {
    throw new Error(`Sesion no valida: ${sessionName}`);
  }
};

export const createPromptRouter = (): Router => {
  const router = Router();

  router.get("/global", async (_req, res, next) => {
    try {
      res.json(await getGlobalPromptFresh());
    } catch (error) {
      next(error);
    }
  });

  router.put("/global", async (req, res, next) => {
    try {
      const content = parsePromptContent(req.body?.content);
      const updated = await updateGlobalPrompt(content);
      res.json({ message: "Prompt global actualizado", ...updated });
    } catch (error) {
      next(error);
    }
  });

  router.get("/sessions/:sessionName", async (req, res, next) => {
    try {
      const { sessionName } = req.params;
      assertSessionName(sessionName);
      res.json(await getSessionPromptFresh(sessionName));
    } catch (error) {
      next(error);
    }
  });

  router.put("/sessions/:sessionName", async (req, res, next) => {
    try {
      const { sessionName } = req.params;
      assertSessionName(sessionName);
      const content = parsePromptContent(req.body?.content);
      const updated = await updateSessionPrompt(sessionName, content);
      res.json({ message: `Prompt de sesion ${sessionName} actualizado`, ...updated });
    } catch (error) {
      next(error);
    }
  });

  router.get("/resolved/:sessionName", async (req, res, next) => {
    try {
      const { sessionName } = req.params;
      assertSessionName(sessionName);
      res.json(await resolvePromptForSessionFresh(sessionName));
    } catch (error) {
      next(error);
    }
  });

  return router;
};
