// ─── LOGGER YAPILANDIRMASI ───────────────────────────────────────────────────
// Winston ile merkezi log yönetimi.
// Development: renkli console çıktısı
// Production: JSON formatında dosyaya yazma

import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, json } = winston.format;

// ─── Geliştirici dostu console formatı ──────────────────────────────────────
const devFormat = printf(({ level, message, timestamp: ts, ...meta }) => {
  const metaStr = Object.keys(meta).length ? `\n  ${JSON.stringify(meta, null, 2)}` : '';
  return `[${ts}] ${level}: ${message}${metaStr}`;
});

// ─── Production'da dosyaya yaz, development'ta sadece console ───────────────
const isProd = process.env.NODE_ENV === 'production';

const fileTransports = isProd
  ? [
      new winston.transports.File({
        filename: path.join('logs', 'error.log'),
        level: 'error',
        maxsize: 10 * 1024 * 1024,
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join('logs', 'combined.log'),
        maxsize: 10 * 1024 * 1024,
        maxFiles: 10,
      }),
    ]
  : [];

export const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',

  format: isProd
    ? combine(timestamp(), json())
    : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), devFormat),

  transports: [
    new winston.transports.Console(),
    ...fileTransports,
  ],

  // Yakalanmamış hataları logla ama uygulamayı öldürme
  exitOnError: false,
});

// ─── Kolaylık metodları ───────────────────────────────────────────────────────
export const agentLogger = {
  start: (agentType: string, storyId: string) =>
    logger.info(`[AGENT:START] ${agentType}`, { storyId }),

  complete: (agentType: string, storyId: string, url: string) =>
    logger.info(`[AGENT:DONE] ${agentType}`, { storyId, url }),

  fail: (agentType: string, storyId: string, error: string) =>
    logger.error(`[AGENT:FAIL] ${agentType}`, { storyId, error }),
};