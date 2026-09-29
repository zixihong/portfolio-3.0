import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs"
import { createServer } from "node:http"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { buildRegionMap, type AsciiConfig } from "inklet"
import type { AsciiTreeData } from "../src/data/ascii-tree"

const output = resolve("src/data/ascii-config.json")
const tree: AsciiTreeData = JSON.parse(readFileSync(resolve("src/data/ascii-tree.json"), "utf8"))
const palette = [...new Set(tree.colors)]
const indices = new Map(palette.map((color, index) => [color, index]))
const config: AsciiConfig = existsSync(output)
  ? JSON.parse(readFileSync(output, "utf8"))
  : { data: { cols: tree.cols, rows: tree.rows, chars: tree.chars, palette,
      colorIndices: tree.colors.map(color => indices.get(color)!) }, regionConfig: { regions: [] } }
const { regionMap } = buildRegionMap(config.data, config.regionConfig)
const initialRegions = config.regionConfig.regions.map(region => ({
  id: region.id, label: region.label,
  cells: regionMap.flatMap((id, index) => id === region.id
    ? [`${Math.floor(index / config.data.cols)},${index % config.data.cols}`] : []),
}))
// Inklet 0.1.2 has no initial-region option. Reuse its editor with saved-state initialization.
const packageRoot = resolve(dirname(fileURLToPath(import.meta.resolve("inklet"))), "../..")
const template = readFileSync(resolve(packageRoot, "src/editor/template.html"), "utf8")
const marker = "  // --- Init ---\n  renderRegionList();"
if (!template.includes(marker)) throw new Error("Inklet editor template changed; update the saved-region adapter.")
const json = (value: unknown) => JSON.stringify(value).replaceAll("<", "\\u003c")
const html = template.replace("</head>", `<script>window.__ASCII_DATA__=${json(config.data)};window.__OUTPUT_DIR__=${json(dirname(output))};window.__CAN_REGENERATE__=false;</script></head>`)
  .replace(marker, `
  for (const saved of ${json(initialRegions)}) {
    const region = createRegion(saved.label);
    for (const key of saved.cells) {
      region.cells.add(key);
      cellRegionMap[key] = region.id;
    }
  }
  applyAllOverlays();
  renderRegionList();`)

createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(html)
  } else if (req.method === "POST" && req.url === "/api/save") {
    try {
      let body = ""
      for await (const chunk of req) body += chunk
      const { regionConfig } = JSON.parse(body)
      buildRegionMap(config.data, regionConfig)
      if (existsSync(output)) copyFileSync(output, `${output}.bak`)
      writeFileSync(output, JSON.stringify({ data: config.data, regionConfig }, null, 2))
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ ok: true, path: output }))
    } catch (error) {
      res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ ok: false, error: String(error) }))
    }
  } else res.writeHead(404).end()
}).listen(58221, "127.0.0.1", () => {
  console.log("Fig editor: http://127.0.0.1:58221 — saved regions loaded. Select a region to repaint it, then Save to project.")
})
