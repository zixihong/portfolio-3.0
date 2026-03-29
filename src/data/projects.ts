export interface ContentItem {
  title: string
  description: string
  url?: string
  tags?: string[]
}

export interface FigContent {
  id: string
  label: string
  items: ContentItem[]
}

// Each fig on the branch maps to a content section
// Update these with your real content
export const figContents: FigContent[] = [
  {
    id: "fig-1",
    label: "Building",
    items: [
      {
        title: "Building placeholder",
        description: "Add your projects here.",
      },
    ],
  },
  {
    id: "fig-2",
    label: "Writing",
    items: [
      {
        title: "Writing placeholder",
        description: "Add your blog posts or thoughts here.",
      },
    ],
  },
  {
    id: "fig-3",
    label: "About",
    items: [
      {
        title: "About placeholder",
        description: "Add your bio here.",
      },
    ],
  },
  {
    id: "fig-4",
    label: "Researching",
    items: [
      {
        title: "Researching placeholder",
        description: "Add your research here.",
      },
    ],
  },
  {
    id: "fig-5",
    label: "Investing",
    items: [
      {
        title: "Investing placeholder",
        description: "Add your investments here.",
      },
    ],
  },
]
