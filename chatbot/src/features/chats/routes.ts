import { Router } from "express";
import { listChats, listMessages } from "../chats/store.js";

const parseIntParam = (value: unknown, fallback: number): number => {
  const n = parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

export const createChatsRouter = (): Router => {
  const router = Router();

  // GET /api/chats?limit=30&offset=0
  router.get("/", async (req, res, next) => {
    try {
      const limit = Math.min(parseIntParam(req.query.limit, 30), 100);
      const offset = parseIntParam(req.query.offset, 0);
      res.json(await listChats(limit, offset));
    } catch (error) {
      next(error);
    }
  });

  // GET /api/chats/:phone/messages?limit=20&offset=0
  router.get("/:phone/messages", async (req, res, next) => {
    try {
      const { phone } = req.params;
      const limit = Math.min(parseIntParam(req.query.limit, 20), 100);
      const offset = parseIntParam(req.query.offset, 0);
      res.json(await listMessages(phone, limit, offset));
    } catch (error) {
      next(error);
    }
  });

  return router;
};
