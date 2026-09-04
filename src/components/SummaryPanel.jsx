import "./SummaryPanel.css"

// Returns null when *iso* is missing or unparseable — some upstream fields
// (e.g. FreeGamesNotifier's end_date) can be an empty string in practice.
function formatEta(iso) {
  if (!iso) return null
  const target = new Date(iso)
  if (Number.isNaN(target.getTime())) return null
  const diffDays = Math.round((target.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return "expired"
  if (diffDays === 0) return "today"
  if (diffDays === 1) return "1 day"
  return `${diffDays} days`
}

// Free Games Notifier's SummaryResponse: { service, active_promotions[], last_check_at }
function FreeGamesSummary({ data }) {
  const promos = data.active_promotions ?? []
  return promos.length === 0 ? (
    <p className="summary-empty">No active promotions</p>
  ) : (
    <ul className="summary-list">
      {promos.map((p, i) => {
        const eta = formatEta(p.end_date)
        return (
          <li key={i}>
            <span className="summary-list-title">{p.title}</span>
            <span className="summary-list-meta">{p.store}{eta ? ` · ends in ${eta}` : ""}</span>
          </li>
        )
      })}
    </ul>
  )
}

// CaduTrack's /summary: { expired, expiring_soon, next: { name, expires_at } | null }
function CaduTrackSummary({ data }) {
  return (
    <>
      <div className="summary-stats">
        <div className={`summary-stat ${data.expired > 0 ? "danger" : ""}`}>
          <span className="summary-stat-value">{data.expired}</span>
          <span className="summary-stat-label">Expired</span>
        </div>
        <div className={`summary-stat ${data.expiring_soon > 0 ? "warning" : ""}`}>
          <span className="summary-stat-value">{data.expiring_soon}</span>
          <span className="summary-stat-label">Expiring soon</span>
        </div>
      </div>
      {data.next ? (
        <p className="summary-next">
          Next: <strong>{data.next.name}</strong>
          {formatEta(data.next.expires_at) ? ` · ${formatEta(data.next.expires_at)}` : ""}
        </p>
      ) : (
        <p className="summary-empty">Nothing tracked</p>
      )}
    </>
  )
}

// Renders one service's summary, embedded in its own ActionPanel — dispatches
// on response shape (see backend's summary_dispatcher, which proxies the raw
// upstream JSON through as-is) rather than on service name, so renaming a
// service in the Admin UI doesn't break this.
function SummaryPanel({ summary }) {
  if (!summary) return null

  let body = null
  if (summary.__error) {
    body = <p className="summary-error">{summary.__error}</p>
  } else if (Array.isArray(summary.active_promotions)) {
    body = <FreeGamesSummary data={summary} />
  } else if ("expired" in summary && "expiring_soon" in summary) {
    body = <CaduTrackSummary data={summary} />
  }
  if (!body) return null

  return <div className="summary-panel">{body}</div>
}

export default SummaryPanel
