import sharp from "sharp"
import { writeFileSync } from "fs"
import { resolve } from "path"

// Maximum detail ramp
const RAMP = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. "
const COLS = 280
const CHAR_ASPECT = 1.8
const SOURCE = resolve(import.meta.dirname, "../src/assets/fig-tree2.png")
const OUTPUT = resolve(import.meta.dirname, "../src/data/ascii-tree.json")

function isFigColor(r: number, g: number, b: number): boolean {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b

  // Figs are purple: blue >= red, both > green
  // This excludes brown branches (r > g > b) and green leaves (g dominant)
  const isPurplish = b >= r * 0.85 && g < Math.max(r, b)

  // Accept wide luminance range (very dark centers to lighter edges)
  if (lum > 10 && lum < 160 && isPurplish) {
    return true
  }
  return false
}

function isBackground(r: number, g: number, b: number, a: number): boolean {
  if (a < 30) return true
  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  return lum > 210
}

interface Point {
  idx: number
  row: number
  col: number
}

// Manual split line for the two left figs (user-defined via split tool)
const MANUAL_SPLIT = {
  p1: { row: 48, col: 114 },
  p2: { row: 56, col: 121 },
}

function sideOfLine(row: number, col: number): number {
  const { p1, p2 } = MANUAL_SPLIT
  // Cross product to determine which side of the line a point is on
  return (p2.col - p1.col) * (row - p1.row) - (p2.row - p1.row) * (col - p1.col)
}

function trySplitCluster(points: Point[]): Point[][] {
  if (points.length < 500) return [points]

  const gap = 3
  const group1: Point[] = []
  const group2: Point[] = []

  for (const p of points) {
    const side = sideOfLine(p.row, p.col)
    if (side < -gap) group1.push(p)
    else if (side > gap) group2.push(p)
    // points near the line are dropped (the gap)
  }

  if (group1.length < 50 || group2.length < 50) {
    console.log(`  Cluster ${points.length} cells: manual split too uneven (${group1.length}/${group2.length}), keeping as one`)
    return [points]
  }

  console.log(`  Split cluster ${points.length} -> ${group1.length} + ${group2.length} (manual line)`)
  return [group1, group2]
}

async function generateAscii() {
  const image = sharp(SOURCE)
  const metadata = await image.metadata()
  const width = metadata.width!
  const height = metadata.height!

  const cellWidth = width / COLS
  const cellHeight = cellWidth * CHAR_ASPECT
  const rows = Math.floor(height / cellHeight)

  console.log(`Image: ${width}x${height} -> ASCII: ${COLS}x${rows} (${COLS * rows} chars)`)

  const cropW = Math.floor(width * 0.92)
  const cropH = Math.floor(height * 0.92)
  const { data, info } = await image
    .extract({ left: 0, top: 0, width: cropW, height: cropH })
    .resize(COLS, rows, { fit: "fill" })
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true })

  const chars: string[] = []
  const colors: string[] = []
  const rawRegions: boolean[] = []

  for (let i = 0; i < info.width * info.height; i++) {
    const offset = i * 4
    const r = data[offset]
    const g = data[offset + 1]
    const b = data[offset + 2]
    const a = data[offset + 3]

    if (isBackground(r, g, b, a)) {
      chars.push(" ")
      colors.push("#000000")
      rawRegions.push(false)
      continue
    }

    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    const charIndex = Math.floor((lum / 255) * (RAMP.length - 1))
    chars.push(RAMP[charIndex])

    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
    colors.push(hex)

    rawRegions.push(isFigColor(r, g, b))
  }

  // Flood-fill to identify connected fig regions
  const regionMap: (string | null)[] = new Array(COLS * rows).fill(null)
  const visited = new Set<number>()
  let figIndex = 0
  const MIN_FIG_SIZE = 50

  for (let i = 0; i < COLS * rows; i++) {
    if (rawRegions[i] && !visited.has(i)) {
      const queue = [i]
      const cluster: number[] = []
      visited.add(i)

      while (queue.length > 0) {
        const idx = queue.shift()!
        cluster.push(idx)
        const row = Math.floor(idx / COLS)
        const col = idx % COLS

        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue
            const nr = row + dr
            const nc = col + dc
            if (nr < 0 || nr >= rows || nc < 0 || nc >= COLS) continue
            const ni = nr * COLS + nc
            if (!visited.has(ni) && rawRegions[ni]) {
              visited.add(ni)
              queue.push(ni)
            }
          }
        }
      }

      if (cluster.length >= MIN_FIG_SIZE) {
        const clusterPoints = cluster.map((idx) => ({
          idx,
          row: Math.floor(idx / COLS),
          col: idx % COLS,
        }))

        // Split large clusters that are likely two merged figs
        // Use k-means with k=2 and check if the split makes sense
        const subclusters = trySplitCluster(clusterPoints)

        for (const sub of subclusters) {
          if (sub.length < MIN_FIG_SIZE) continue
          let minR = Infinity, maxR = 0, minC = Infinity, maxC = 0
          for (const p of sub) {
            minR = Math.min(minR, p.row)
            maxR = Math.max(maxR, p.row)
            minC = Math.min(minC, p.col)
            maxC = Math.max(maxC, p.col)
          }
          const bboxH = maxR - minR + 1
          const bboxW = maxC - minC + 1
          const realH = bboxH * CHAR_ASPECT
          const aspect = Math.max(realH, bboxW) / Math.min(realH, bboxW)

          console.log(`  Cluster: ${sub.length} cells, bbox ${bboxW}x${bboxH}, aspect ${aspect.toFixed(1)}`)

          if (aspect < 2.1) {
            figIndex++
            const regionId = `fig-${figIndex}`
            for (const p of sub) {
              regionMap[p.idx] = regionId
            }
            console.log(`    -> fig-${figIndex}`)
          } else {
            console.log(`    -> skipped (too elongated)`)
          }
        }
      }
    }
  }

  console.log(`Total fig regions found: ${figIndex}`)

  // Fill holes inside each fig region — any non-background pixel
  // within a region's bounding box that is surrounded by that region
  for (let fig = 1; fig <= figIndex; fig++) {
    const regionId = `fig-${fig}`
    let minR = Infinity, maxR = 0, minC = Infinity, maxC = 0
    for (let i = 0; i < COLS * rows; i++) {
      if (regionMap[i] === regionId) {
        const row = Math.floor(i / COLS)
        const col = i % COLS
        minR = Math.min(minR, row)
        maxR = Math.max(maxR, row)
        minC = Math.min(minC, col)
        maxC = Math.max(maxC, col)
      }
    }

    // Check if a pixel is near another region (don't fill near boundaries)
    const nearOtherRegion = (row: number, col: number): boolean => {
      const margin = 3
      for (let dr = -margin; dr <= margin; dr++) {
        for (let dc = -margin; dc <= margin; dc++) {
          const nr = row + dr, nc = col + dc
          if (nr < 0 || nr >= rows || nc < 0 || nc >= COLS) continue
          const ni = nr * COLS + nc
          if (regionMap[ni] !== null && regionMap[ni] !== regionId) return true
        }
      }
      return false
    }

    // Fill holes by scanning both horizontally and vertically,
    // then repeat to catch concave gaps
    let filled = 0
    for (let pass = 0; pass < 3; pass++) {
      // Horizontal fill
      for (let r = minR; r <= maxR; r++) {
        let left = -1, right = -1
        for (let c = minC; c <= maxC; c++) {
          const i = r * COLS + c
          if (regionMap[i] === regionId) {
            if (left === -1) left = c
            right = c
          }
        }
        if (left === -1) continue
        for (let c = left; c <= right; c++) {
          const i = r * COLS + c
          if (regionMap[i] === null && chars[i] !== " " && !nearOtherRegion(r, c)) {
            regionMap[i] = regionId
            filled++
          }
        }
      }
      // Vertical fill
      for (let c = minC; c <= maxC; c++) {
        let top = -1, bottom = -1
        for (let r = minR; r <= maxR; r++) {
          const i = r * COLS + c
          if (regionMap[i] === regionId) {
            if (top === -1) top = r
            bottom = r
          }
        }
        if (top === -1) continue
        for (let r = top; r <= bottom; r++) {
          const i = r * COLS + c
          if (regionMap[i] === null && chars[i] !== " " && !nearOtherRegion(r, c)) {
            regionMap[i] = regionId
            filled++
          }
        }
      }
    }
    if (filled > 0) console.log(`  Filled ${filled} holes in ${regionId}`)
  }

  const result = {
    cols: COLS,
    rows,
    chars: chars.join(""),
    colors,
    regions: regionMap,
  }

  writeFileSync(OUTPUT, JSON.stringify(result))
  const sizeMB = (JSON.stringify(result).length / 1024 / 1024).toFixed(2)
  console.log(`Written to ${OUTPUT} (${chars.length} chars, ${sizeMB} MB)`)
}

generateAscii().catch(console.error)
