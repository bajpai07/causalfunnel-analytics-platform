export function SessionsTableSkeleton() {
  return (
    <div className="table-wrapper">
      <table className="cf-table">
        <thead>
          <tr>
            <th>Session ID</th>
            <th>First Seen</th>
            <th>Last Seen</th>
            <th>Event Count</th>
            <th>Pages Visited</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, idx) => (
            <tr key={idx}>
              <td>
                <span
                  className="skeleton-text shimmer-wrapper"
                  style={{ width: '120px', backgroundColor: 'rgba(255,255,255,0.05)' }}
                ></span>
              </td>
              <td>
                <span
                  className="skeleton-text shimmer-wrapper"
                  style={{ width: '140px', backgroundColor: 'rgba(255,255,255,0.05)' }}
                ></span>
              </td>
              <td>
                <span
                  className="skeleton-text shimmer-wrapper"
                  style={{ width: '140px', backgroundColor: 'rgba(255,255,255,0.05)' }}
                ></span>
              </td>
              <td>
                <span
                  className="skeleton-text shimmer-wrapper"
                  style={{ width: '40px', borderRadius: '9999px', backgroundColor: 'rgba(255,255,255,0.05)' }}
                ></span>
              </td>
              <td>
                <span
                  className="skeleton-text shimmer-wrapper"
                  style={{ width: '60px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)' }}
                ></span>
              </td>
              <td>
                <span
                  className="skeleton-text shimmer-wrapper"
                  style={{ width: '100px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.05)' }}
                ></span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default SessionsTableSkeleton
