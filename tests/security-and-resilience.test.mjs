import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const server = readFileSync(new URL("../src/server/app.ts", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const calendar = readFileSync(new URL("../src/googleCalendar.ts", import.meta.url), "utf8");

test("API valida JWT Supabase e não confia em X-User-Email", () => {
  assert.match(server, /admin\.auth\.getUser\(token\)/);
  assert.doesNotMatch(server, /req\.headers\["x-user-email"\]/i);
});

test("captura persiste e envia fragmentos durante a gravação", () => {
  assert.match(app, /saveRecordingChunk\(localChunk\)/);
  assert.match(app, /uploadAudioChunkToStorage/);
  assert.match(app, /mediaRecorder\.start\(10_000\)/);
});

test("OAuth não aceita mensagens de origem arbitrária", () => {
  assert.match(calendar, /event\.origin !== new URL\(apiOrigin\)\.origin/);
  assert.doesNotMatch(server, /postMessage\(payload, "\*"\)/);
});

test("worker durável e API keys estão protegidos", () => {
  assert.match(server, /QSTASH_TOKEN/);
  assert.match(server, /TRANSCRIPTION_WORKER_SECRET/);
  assert.match(server, /createHash\("sha256"\)/);
});
