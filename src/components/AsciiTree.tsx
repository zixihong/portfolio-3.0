import { useState, useMemo, useCallback } from "react"
import type { AsciiTreeData } from "../data/ascii-tree"
import { figContents } from "../data/projects"
import { ContentPanel } from "./ContentPanel"

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
    <div className="relative flex items-center justify-center min-h-screen">
      <div
        className="ascii-tree-wrapper transition-all duration-300"
        style={{
          transform: selectedRegion ? "translateX(-10%)" : "translateX(0)",
        }}
      >
        <pre
          className="leading-none select-none"
          style={{ fontSize: "min(0.55vw, 8px)", lineHeight: "1.15" }}
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
                      color: isActive ? "#ffffff" : span.color,
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

        {activeRegion && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-mono z-50 pointer-events-none">
            {figContents.find((f) => f.id === activeRegion)?.label ||
              activeRegion}
          </div>
        )}
      </div>

      <ContentPanel
        content={selectedContent || null}
        onClose={() => setSelectedRegion(null)}
      />
    </div>
  )
}
