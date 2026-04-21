import * as LucideIcons from "lucide-react"

// Names that don't directly match a Lucide icon (kebab-case → PascalCase would fail)
const ALIASES = {
    "dashboard":  "LayoutDashboard",
    "github":     "FolderGit2",
    "bar-chart":  "BarChart2",
    "error":      "CircleAlert",
    "empty":      "PackageOpen",
    "refresh":    "RefreshCw",
    "stop":       "Square",
    "restart":    "RotateCcw",
    "alert":      "AlertTriangle",
}

function toPascalCase(str) {
    return str.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("")
}

export function getIcon(name, props = {}) {
    if (!name) return null
    const pascalName = ALIASES[name] ?? toPascalCase(name)
    const Icon = LucideIcons[pascalName]
    if (!Icon) return null
    return <Icon size={16} {...props} />
}
