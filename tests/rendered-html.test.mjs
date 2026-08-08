import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Our Library application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Our Library — Dan &amp; Lucia<\/title>/i);
  assert.match(html, /A warm shared digital library for two/i);
  assert.match(html, /Search our library/i);
  assert.match(html, /Continue reading/i);
  assert.match(html, /Your shelves/i);
  assert.match(html, /Our favorites/i);
  assert.match(html, /Dune/);
  assert.match(html, /The Snowman/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|Your site is taking shape/i);
});

test("keeps the signature room and reader interactions in the product", async () => {
  const [app, room, data, layout, hosting] = await Promise.all([
    readFile(new URL("../app/LibraryApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/LibraryRoom.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"),
  ]);

  assert.match(app, /createRoomPlacements/);
  assert.match(app, /room-book-navigation/);
  assert.match(app, /ArrowLeft/);
  assert.match(app, /ArrowRight/);
  assert.match(app, /localStorage\.setItem\("our-library"/);
  assert.match(app, /reader-theme|readerTheme/);
  assert.match(room, /<Canvas/);
  assert.match(room, /function Ladder/);
  assert.match(room, /function Fireplace/);
  assert.match(room, /function ReadingCorner/);
  assert.match(room, /function FireSheet/);
  assert.match(room, /onPointerMove/);
  assert.match(room, /prefers-reduced-motion/);
  assert.match(room, /<Environment/);
  assert.match(data, /The Snowman/);
  assert.match(data, /highShelf/);
  assert.match(data, /export const readerPages/);
  assert.match(layout, /Our Library — Dan & Lucia/);
  assert.match(hosting, /appgprj_6a772b8694b481918c620246e3bf9fe9/);
});
