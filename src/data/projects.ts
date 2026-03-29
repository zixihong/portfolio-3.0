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
    label: "Projects",
    items: [
      {
        title: "Project placeholder",
        description: "Add your projects here.",
        tags: ["placeholder"],
      },
    ],
  },
  {
    id: "fig-2",
    label: "About",
    items: [
      {
        title: "About placeholder",
        description: "Add your bio here.",
      },
    ],
  },
  {
    id: "fig-3",
    label: "Experience",
    items: [
      {
        title: "Experience placeholder",
        description: "Add your experience here.",
      },
    ],
  },
  {
    id: "fig-4",
    label: "Writing",
    items: [
      {
        title: "Writing placeholder",
        description: "Add your blog posts or thoughts here.",
      },
    ],
  },
  {
    id: "fig-5",
    label: "Contact",
    items: [
      {
        title: "Contact placeholder",
        description: "Add your contact info here.",
      },
    ],
  },
]
