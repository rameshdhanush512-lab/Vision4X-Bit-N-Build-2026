// Simple structured logger — no external deps needed
const timestamp = () => new Date().toISOString();

export const logger = {
  info: (msg: string, meta?: unknown) =>
    console.log(JSON.stringify({ level: 'INFO', ts: timestamp(), msg, ...(meta ? { meta } : {}) })),
  warn: (msg: string, meta?: unknown) =>
    console.warn(JSON.stringify({ level: 'WARN', ts: timestamp(), msg, ...(meta ? { meta } : {}) })),
  error: (msg: string, meta?: unknown) =>
    console.error(JSON.stringify({ level: 'ERROR', ts: timestamp(), msg, ...(meta ? { meta } : {}) })),
  debug: (msg: string, meta?: unknown) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(JSON.stringify({ level: 'DEBUG', ts: timestamp(), msg, ...(meta ? { meta } : {}) }));
    }
  },
};
