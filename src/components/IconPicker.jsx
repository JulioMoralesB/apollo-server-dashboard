import { useState, useMemo, useEffect, useRef } from "react"
import * as LucideIcons from "lucide-react"
import "./IconPicker.css"

function toKebabCase(pascal) {
    return pascal.replace(/([A-Z])/g, (_, l, i) => i === 0 ? l.toLowerCase() : `-${l.toLowerCase()}`)
}

const SHOW_ALL_THRESHOLD = 300

// Each icon comes as two exports: Foo and FooIcon. Keep only the base name.
// LucideProvider is the only non-icon uppercase export — exclude it.
const ALL_ICONS = Object.keys(LucideIcons)
    .filter(name => /^[A-Z]/.test(name) && !name.endsWith("Icon") && name !== "LucideProvider")
    .map(pascal => ({ pascal, kebab: toKebabCase(pascal) }))
    .sort((a, b) => a.kebab.localeCompare(b.kebab))

function IconPicker({ value, onChange, onClose }) {
    const [search, setSearch] = useState("")
    const searchRef = useRef(null)

    useEffect(() => {
        searchRef.current?.focus()
    }, [])

    useEffect(() => {
        const handleKey = (e) => {
            if (e.key === "Escape") onClose()
        }
        window.addEventListener("keydown", handleKey)
        return () => window.removeEventListener("keydown", handleKey)
    }, [onClose])

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim()
        if (!q) return ALL_ICONS.slice(0, SHOW_ALL_THRESHOLD)
        return ALL_ICONS.filter(({ kebab }) => kebab.includes(q))
    }, [search])

    function handleSelect(kebab) {
        onChange(kebab)
        onClose()
    }

    return (
        <div className="icon-picker-backdrop" onClick={onClose}>
            <div className="icon-picker" onClick={e => e.stopPropagation()}>
                <div className="icon-picker-header">
                    <input
                        ref={searchRef}
                        className="icon-picker-search"
                        placeholder="Search icons…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    <button type="button" className="icon-picker-close" onClick={onClose}>✕</button>
                </div>
                <div className="icon-picker-count">
                    {search.trim()
                        ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`
                        : `Showing ${SHOW_ALL_THRESHOLD} of ${ALL_ICONS.length} — search to filter`}
                </div>
                <div className="icon-picker-grid">
                    {filtered.map(({ pascal, kebab }) => {
                        const Icon = LucideIcons[pascal]
                        return (
                            <button
                                key={pascal}
                                type="button"
                                className={`icon-picker-item${value === kebab ? " selected" : ""}`}
                                onClick={() => handleSelect(kebab)}
                                title={kebab}
                            >
                                <Icon size={18} />
                                <span>{kebab}</span>
                            </button>
                        )
                    })}
                    {filtered.length === 0 && (
                        <p className="icon-picker-empty">No icons match "{search}"</p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default IconPicker
