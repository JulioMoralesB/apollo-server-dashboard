import { 
    Bell, 
    BellRing,
    RefreshCw, 
    Play, 
    Square, 
    RotateCcw, 
    Terminal, 
    Globe, 
    Settings, 
    AlertTriangle,
    Send,
    SendHorizontal,
    Pickaxe, 
    Loader,
    CircleAlert,
    PackageOpen,


} from "lucide-react"

const icons = {
    "bell": Bell,
    "bell-ring": BellRing,
    "refresh": RefreshCw,
    "play": Play,
    "stop": Square,
    "restart": RotateCcw,
    "terminal": Terminal,
    "globe": Globe,
    "settings": Settings,
    "alert": AlertTriangle,
    "send": Send,
    "send-horizontal": SendHorizontal,
    "pickaxe": Pickaxe,
    "loader": Loader,
    "error": CircleAlert,
    "empty": PackageOpen,
}

export function getIcon(name, props = {}) {
    const Icon = icons[name]
    if (!Icon) return null
    return <Icon size={16} {...props} />
}