import pino from "pino";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { env } from "../config/env.js";

const logsDir = join(process.cwd(), "logs");
mkdirSync(logsDir, { recursive: true });

const fileStream = pino.destination({
  dest: join(logsDir, "activity.log"),
  sync: false
});

export const logger = pino(
  {
    level: env.LOG_LEVEL,
    timestamp: pino.stdTimeFunctions.isoTime,
    base: undefined
  },
  pino.multistream([{ stream: process.stdout }, { stream: fileStream }])
);
