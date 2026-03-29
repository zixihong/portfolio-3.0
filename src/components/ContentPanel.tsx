import { useEffect } from "react"
import type { FigContent } from "../data/projects"

interface Props {
  content: FigContent | null
  onClose: () => void
}

export function ContentPanel({ content, onClose }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  return (
    <div
      className={`fixed top-0 right-0 h-full w-96 max-w-[90vw] bg-black/90 backdrop-blur-md border-l border-white/10 transform transition-transform duration-300 z-40 overflow-y-auto ${
        content ? "translate-x-0" : "translate-x-full"
      }`}
    >
      {content && (
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-white">{content.label}</h2>
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white text-2xl leading-none cursor-pointer"
              aria-label="Close panel"
            >
              x
            </button>
          </div>

          {content.label === "About" ? (
            <div className="space-y-4 text-sm text-white/80 font-mono uppercase">
              <div className="text-base text-white font-semibold">Bryan Hong</div>
              <div>CEO @ <a href="https://www.shofo.ai/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Shofo</a></div>
              <div>I'm passionate about AI research, urban planning, computational biology and chemistry, investing, techno-existentialism, and the people i love.</div>
              <div>I value creativity, curiosity, high agency, and first principles thinking</div>
              <div>My life's mission is to build the <em>perfect</em> city</div>
              <div className="flex gap-3 pt-2">
                <a href="https://www.linkedin.com/in/zixihong/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">linkedin</a>
                <a href="https://x.com/zixihong_" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">X</a>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {content.items.map((item, i) => (
                <div key={i} className="border-b border-white/10 pb-4">
                  <h3 className="text-white font-semibold mb-1">
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-green-400 transition-colors"
                      >
                        {item.title}
                      </a>
                    ) : (
                      item.title
                    )}
                  </h3>
                  <p className="text-white/60 text-sm">{item.description}</p>
                  {item.tags && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-white/10 text-white/70 px-2 py-0.5 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
