import "./SummaryPanel.css"

// Parses "YYYY-MM-DD" as local midnight instead of UTC midnight (the default
// behavior of `new Date(str)` for date-only ISO strings) — CaduTrack sends a
// bare calendar date with no timezone attached, so it should mean the same
// day for every viewer rather than shifting with their UTC offset.
function parseDateOnly(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str)
  if (!m) return new Date(str)
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function startOfLocalDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// Returns null when *iso* is missing or unparseable — some upstream fields
// (e.g. FreeGamesNotifier's end_date) can be an empty string in practice.
// Compares by local calendar day rather than raw elapsed hours, so a date
// that's tomorrow doesn't read as "today" just because the viewer is in a
// timezone behind UTC and UTC has already rolled over.
function formatEta(iso) {
  if (!iso) return null
  const target = parseDateOnly(iso)
  if (Number.isNaN(target.getTime())) return null
  const diffDays = Math.round(
    (startOfLocalDay(target) - startOfLocalDay(new Date())) / (1000 * 60 * 60 * 24)
  )
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

// CaduTrack's /summary: { expired, expiring_soon, next: { name, expires_at }[] }
// `next` holds every item tied for the most urgent expiration date, not just one.
function CaduTrackSummary({ data }) {
  const next = data.next ?? []
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
      {next.length === 0 ? (
        <p className="summary-empty">Nothing tracked</p>
      ) : (
        <>
          <p className="summary-next-label">Next</p>
          <ul className="summary-list">
            {next.map((item, i) => {
              const eta = formatEta(item.expires_at)
              return (
                <li key={i}>
                  <span className="summary-list-title">{item.name}</span>
                  {eta && <span className="summary-list-meta">{eta}</span>}
                </li>
              )
            })}
          </ul>
        </>
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
