import { 
    Bell, 
    RefreshCw, 
    Play, 
    Square, 
    RotateCcw, 
    Terminal, 
    Globe, 
    Settings, 
    AlertTriangle,
    Send,
    SendHorizontal 

} from "lucide-react"

const icons = {
    "bell": Bell,
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
}

export function getIcon(name, props = {}) {
    const Icon = icons[name]
    if (!Icon) return null
    return <Icon size={16} {...props} />
}