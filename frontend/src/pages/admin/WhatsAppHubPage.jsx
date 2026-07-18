import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { admin } from '../../api'
import '../../styles/admin-medialist.css'

function MemberCover({ url }) {
  const [error, setError] = useState(false)
  if (url && !error) {
    return <img className="ml-cover" src={url} alt="DP" onError={() => setError(true)} />
  }
  return (
    <div className="ml-cover" style={{ background: 'rgba(37, 211, 102, 0.1)', color: '#25D366' }}>
      <i className="bi bi-person-fill" />
    </div>
  )
}

function Pagination({ page, total, perPage = 20, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  if (totalPages <= 1) return null
  const start = Math.max(1, page - 2)
  const end   = Math.min(totalPages, page + 2)
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i)
  return (
    <div className="admin-pagination">
      <span className="pagination-info">{total} records</span>
      <button className="page-btn" aria-label="First page" disabled={page <= 1} onClick={() => onChange(1)}><i className="bi bi-chevron-double-left" /></button>
      <button className="page-btn" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)}><i className="bi bi-chevron-left" /></button>
      {start > 1 && <span className="pagination-info">…</span>}
      {pages.map((p) => <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => onChange(p)}>{p}</button>)}
      {end < totalPages && <span className="pagination-info">…</span>}
      <button className="page-btn" aria-label="Next page" disabled={page >= totalPages} onClick={() => onChange(page + 1)}><i className="bi bi-chevron-right" /></button>
      <button className="page-btn" aria-label="Last page" disabled={page >= totalPages} onClick={() => onChange(totalPages)}><i className="bi bi-chevron-double-right" /></button>
    </div>
  )
}

export default function WhatsAppHubPage() {
  const navigate = useNavigate()
  const [data, setData]               = useState({ voters: [], total: 0 })
  const [loading, setLoading]         = useState(true)
  const [page, setPage]               = useState(1)
  const [search, setSearch]           = useState('')
  const [searchInput, setSearchInput]   = useState('')
  const [district, setDistrict]       = useState('')
  const [assembly, setAssembly]       = useState('')
  const [districtsList, setDistrictsList]   = useState([])
  const [assembliesList, setAssembliesList] = useState([])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await admin.getGeneratedVoters({ page, search, district, assembly, per_page: 20 })
      setData({ voters: res.voters || res.data || res.members || [], total: res.total || 0 })
      if (res.districts && Array.isArray(res.districts)) setDistrictsList(res.districts.filter(Boolean).sort())
      if (res.assemblies && Array.isArray(res.assemblies)) setAssembliesList(res.assemblies.filter(Boolean).sort())
    } catch {
      setData({ voters: [], total: 0 })
    } finally {
      setLoading(false)
    }
  }, [page, search, district, assembly])

  useEffect(() => { loadData() }, [loadData])

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const voters = data.voters

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0, fontSize: 22, fontWeight: 700 }}>
            <i className="bi bi-whatsapp" style={{ color: '#25D366' }} /> WhatsApp Hub
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
            Manage and communicate directly with members across State, District, and Assembly constituencies
          </p>
        </div>

        {/* Quick Hierarchy Pill */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(37, 211, 102, 0.1)', color: '#25D366', border: '1px solid rgba(37, 211, 102, 0.2)', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
            <i className="bi bi-geo-alt-fill me-1" /> Tamil Nadu State
          </span>
          {district && (
            <span style={{ background: 'rgba(30, 58, 138, 0.1)', color: '#1E3A8A', border: '1px solid rgba(30, 58, 138, 0.2)', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
              District: {district}
            </span>
          )}
          {assembly && (
            <span style={{ background: 'rgba(52, 152, 219, 0.1)', color: '#3498db', border: '1px solid rgba(52, 152, 219, 0.2)', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
              Assembly: {assembly}
            </span>
          )}
        </div>
      </div>

      {/* Main Content Card */}
      <div className="admin-card">
        <div className="admin-card-header" style={{ flexWrap: 'wrap', gap: 12, background: '#fafafa', borderBottom: '1px solid var(--border-dim)' }}>
          <h6 className="admin-card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="bi bi-funnel-fill" style={{ color: '#25D366' }} /> Hierarchy Filters & Search
          </h6>

          <form className="admin-card-tools" onSubmit={handleSearch} style={{ flexWrap: 'wrap', gap: 10 }}>
            {/* District Filter Dropdown */}
            <select
              className="admin-search-input"
              value={district}
              onChange={(e) => { setDistrict(e.target.value); setPage(1); }}
              style={{ padding: '7px 12px', fontSize: 13, minWidth: 150, background: '#fff', color: 'var(--text-primary)', border: '1px solid var(--border-dim)', borderRadius: 6 }}
            >
              <option value="">All Districts (State)</option>
              {districtsList.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            {/* Assembly Filter Dropdown */}
            <select
              className="admin-search-input"
              value={assembly}
              onChange={(e) => { setAssembly(e.target.value); setPage(1); }}
              style={{ padding: '7px 12px', fontSize: 13, minWidth: 150, background: '#fff', color: 'var(--text-primary)', border: '1px solid var(--border-dim)', borderRadius: 6 }}
            >
              <option value="">All Assemblies</option>
              {assembliesList.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>

            {/* Text Search */}
            <input
              className="admin-search-input"
              type="text"
              placeholder="Search name / EPIC / mobile…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ padding: '7px 12px', fontSize: 13, minWidth: 180, background: '#fff', border: '1px solid var(--border-dim)', borderRadius: 6 }}
            />

            <button type="submit" style={{ background: '#25D366', border: 'none', color: '#fff', padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="bi bi-search" /> Filter
            </button>

            {(search || district || assembly) && (
              <button
                type="button"
                onClick={() => { setSearch(''); setSearchInput(''); setDistrict(''); setAssembly(''); setPage(1); }}
                style={{ background: '#fff', border: '1px solid var(--border-dim)', color: 'var(--text-secondary)', padding: '7px 12px', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}
              >
                Clear Filters
              </button>
            )}
          </form>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner-border spinner-border-sm text-success" /></div>
        ) : voters.length === 0 ? (
          <div className="empty-state" style={{ padding: 40, textAlign: 'center' }}>
            <i className="bi bi-whatsapp" style={{ fontSize: 40, color: '#25D366', opacity: 0.6 }} />
            <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>No WhatsApp members found matching your selected location filters.</p>
          </div>
        ) : (
          <>
            <div className="admin-medialist">
              {voters.map((v, i) => {
                const codeVal = v.bjp_code || v.ptc_code
                const mobVal  = v.mobile || v.MOBILE_NO || ''
                const waLink  = mobVal ? `https://wa.me/91${String(mobVal).replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(`Vanakkam ${v.name || v.VOTER_NAME || 'Member'}! Your BJP Member ID is ${codeVal || v.epic_no}. View your card here: ${v.card_url || ''}`)}` : null

                return (
                  <div
                    key={codeVal || v.epic_no || i}
                    className="ml-row ml-clickable"
                    onClick={() => codeVal && navigate(`/admin/generated-voters/${codeVal}`)}
                    style={{ borderBottom: '1px solid var(--border-dim)' }}
                  >
                    <span className="ml-index">{(page - 1) * 20 + i + 1}</span>
                    <MemberCover url={v.photo_url} />
                    <div className="ml-info">
                      <span className="ml-name" style={{ fontWeight: 700 }}>{v.name || v.Name || '—'}</span>
                      <span className="ml-sub">
                        <code>{v.epic_no || v.EpicNo}</code>
                        {codeVal && <span className="ml-code">{codeVal}</span>}
                        {(v.assembly || v.AssemblyName) && <span style={{ color: '#25D366', fontWeight: 600 }}>{v.assembly || v.AssemblyName}</span>}
                        {v.district && <span style={{ opacity: 0.85 }}>({v.district})</span>}
                        {mobVal && <span>{mobVal}</span>}
                      </span>
                    </div>
                    <div className="ml-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {waLink && (
                        <a
                          href={waLink}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            background: '#25D366',
                            color: '#fff',
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: 12,
                            fontWeight: '700',
                            textDecoration: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            boxShadow: '0 2px 6px rgba(37,211,102,0.25)'
                          }}
                          title="Chat on WhatsApp"
                        >
                          <i className="bi bi-whatsapp" style={{ fontSize: 14 }} /> Chat on WhatsApp
                        </a>
                      )}
                      <span className="ml-count" title="Referrals">
                        <i className="bi bi-people-fill" /> {v.referred_members_count || 0}
                      </span>
                      <span className="ml-date">{v.generated_at ? new Date(v.generated_at).toLocaleDateString() : ''}</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <Pagination page={page} total={data.total} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
