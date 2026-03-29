export interface AsciiTreeData {
  cols: number
  rows: number
  chars: string // flat string, row-major
  colors: string[] // hex color per character
  regions: (string | null)[] // region id or null per character
}
