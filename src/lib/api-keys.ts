import "server-only";

import { createHash, randomBytes } from "node:crypto";

const KEY_PREFIX = "clg_live_";

/** Generates a new lead-capture API key. The full key is only ever shown once, at creation. */
export function generateApiKey() {
  const secret = randomBytes(24).toString("base64url");
  const fullKey = `${KEY_PREFIX}${secret}`;
  return {
    fullKey,
    keyPrefix: fullKey.slice(0, KEY_PREFIX.length + 6),
    keyHash: hashApiKey(fullKey),
  };
}

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}
