import { readFileSync, writeFileSync } from "fs";
import { compress } from "brotli";

let jsCode = readFileSync("./dist/bundle.js", "utf8");

let htmlBuffer = Buffer.from(jsCode, "utf8");

let compressed = compress(htmlBuffer, {
  mode: 0,
  quality: 11,
  lgwin: 22,
});

let base64Compressed = `export const compressedString=\`${Buffer.from(
  compressed
).toString("base64")}\``;

writeFileSync("../whiteboard/excalidraw.ts", base64Compressed);
