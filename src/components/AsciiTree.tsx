import { useState, useMemo, useCallback } from "react"
import type { AsciiTreeData } from "../data/ascii-tree"
import { figContents } from "../data/projects"
import { ContentPanel } from "./ContentPanel"

// Boost color brightness for better contrast on dark backgrounds
function boostColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const boost = (v: number) => Math.min(255, Math.round(v * factor))
  return `#${boost(r).toString(16).padStart(2, '0')}${boost(g).toString(16).padStart(2, '0')}${boost(b).toString(16).padStart(2, '0')}`
}


interface Span {
  text: string
  color: string
  region: string | null
}

function groupCharsIntoSpans(data: AsciiTreeData): Span[][] {
  const rows: Span[][] = []
  for (let r = 0; r < data.rows; r++) {
    const row: Span[] = []
    let i = r * data.cols
    let currentSpan: Span = {
      text: data.chars[i],
      color: data.colors[i],
      region: data.regions[i],
    }
    for (let c = 1; c < data.cols; c++) {
      i = r * data.cols + c
      const color = data.colors[i]
      const region = data.regions[i]
      if (color === currentSpan.color && region === currentSpan.region) {
        currentSpan.text += data.chars[i]
      } else {
        row.push(currentSpan)
        currentSpan = { text: data.chars[i], color, region }
      }
    }
    row.push(currentSpan)
    rows.push(row)
  }
  return rows
}

// Build a map of region -> repeating label text for character replacement
function buildRegionTextMap(): Record<string, string> {
  const map: Record<string, string> = {}
  for (const fig of figContents) {
    // Repeat the label to create a long string we can slice from
    const label = fig.label.toUpperCase()
    map[fig.id] = (label + " ").repeat(500)
  }
  return map
}

// Track character offset per region so the label tiles across the whole fig
function buildRegionCounters(): Record<string, number> {
  const counters: Record<string, number> = {}
  for (const fig of figContents) {
    counters[fig.id] = 0
  }
  return counters
}

export function AsciiTree({ data }: { data: AsciiTreeData }) {
  const [activeRegion, setActiveRegion] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)

  const spanRows = useMemo(() => groupCharsIntoSpans(data), [data])
  const regionTextMap = useMemo(() => buildRegionTextMap(), [])

  const handleClick = useCallback((region: string | null) => {
    if (region) {
      const fig = figContents.find((f) => f.id === region)
      if (fig?.label === "About") {
        window.location.href = "/about"
        return
      }
      setSelectedRegion((prev) => (prev === region ? null : region))
    }
  }, [])

  const selectedContent = figContents.find((f) => f.id === selectedRegion)

  // Reset counters each render so text tiles consistently
  const counters = buildRegionCounters()

  function getDisplayText(span: Span): string {
    const isActive = span.region && (activeRegion === span.region || selectedRegion === span.region)
    if (!isActive || !span.region) return span.text

    const labelText = regionTextMap[span.region]
    if (!labelText) return span.text

    const offset = counters[span.region] || 0
    counters[span.region] = offset + span.text.length
    return labelText.slice(offset, offset + span.text.length)
  }

  return (
    <div className="relative flex items-center justify-center h-screen overflow-hidden">
      <div
        className="ascii-tree-wrapper transition-all duration-300 relative z-10"
        style={{
          transform: selectedRegion ? "translateX(-10%)" : "none",
        }}
      >
        <pre
          className="leading-none select-none"
          style={{ fontSize: "min(1vw, 1vh)", lineHeight: "1.15" }}
        >
          {spanRows.map((row, ri) => (
            <div key={ri}>
              {row.map((span, si) => {
                const isActive = span.region && (activeRegion === span.region || selectedRegion === span.region)
                return (
                  <span
                    key={si}
                    className={span.region ? "cursor-pointer" : undefined}
                    style={{
                      color: isActive ? "#ffffff" : boostColor(span.color, 1.4),
                      transition: "color 0.15s ease",
                    }}
                    onMouseEnter={
                      span.region
                        ? () => setActiveRegion(span.region)
                        : undefined
                    }
                    onMouseLeave={
                      span.region ? () => setActiveRegion(null) : undefined
                    }
                    onClick={
                      span.region
                        ? () => handleClick(span.region)
                        : undefined
                    }
                  >
                    {getDisplayText(span)}
                  </span>
                )
              })}
            </div>
          ))}
        </pre>

        <div className="fixed top-16 left-1/2 -translate-x-1/2 text-white text-sm font-mono z-50 pointer-events-none uppercase">
          <div className="relative border border-white px-4 py-2">
            <span className="absolute -top-[0.7em] -left-[0.5em] bg-black px-[3px] leading-none text-sm">┌</span>
            <span className="absolute -top-[0.7em] -right-[0.5em] bg-black px-[3px] leading-none text-sm">┐</span>
            <span className="absolute -bottom-[0.7em] -left-[0.5em] bg-black px-[3px] leading-none text-sm">└</span>
            <span className="absolute -bottom-[0.7em] -right-[0.5em] bg-black px-[3px] leading-none text-sm">┘</span>
            {activeRegion
              ? (figContents.find((f) => f.id === activeRegion)?.label || activeRegion)
              : "Bryan Hong"}
          </div>
        </div>

      </div>

      {/* Sylvia Plath quote - bottom */}
      <div className="fixed bottom-5 right-5 text-white/40 font-mono z-50 max-w-md text-right select-text uppercase text-xs">
        <a href="https://www.goodreads.com/quotes/7511-i-saw-my-life-branching-out-before-me-like-the" target="_blank" rel="noopener noreferrer" className="hover:text-white/70 transition-colors">I SAW MY LIFE BRANCHING OUT BEFORE ME LIKE THE GREEN FIG TREE IN THE STORY. FROM THE TIP OF EVERY BRANCH, LIKE A FAT PURPLE FIG, A WONDERFUL FUTURE BECKONED AND WINKED. — SYLVIA PLATH</a>
      </div>

      <ContentPanel
        content={selectedContent || null}
        onClose={() => setSelectedRegion(null)}
      />
    </div>
  )
}
