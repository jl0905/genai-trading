import { useState, useRef, useEffect, useMemo, useCallback } from 'react'

// Simple subsequence fuzzy match; returns a score (lower = better) or null if no match
function fuzzyScore(query, text) {
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (!q) return 0
  const idx = t.indexOf(q)
  if (idx !== -1) return idx // contiguous match, prefer earlier
  let ti = 0
  let score = 100
  for (let qi = 0; qi < q.length; qi++) {
    const found = t.indexOf(q[qi], ti)
    if (found === -1) return null
    score += found - ti // penalize gaps
    ti = found + 1
  }
  return score
}

function CommandPalette({ onClose, commands }) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const results = useMemo(() => {
    return commands
      .map(cmd => {
        const score = fuzzyScore(query, `${cmd.category} ${cmd.label}`)
        return score === null ? null : { cmd, score }
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score)
      .map(r => r.cmd)
  }, [commands, query])

  // Focus the input on mount (the parent remounts this panel each time it opens)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Keep the selected item scrolled into view
  useEffect(() => {
    const el = listRef.current?.children?.[selectedIndex]
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  const runCommand = useCallback((cmd) => {
    onClose()
    cmd.action()
  }, [onClose])

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[selectedIndex]) runCommand(results[selectedIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'Tab') {
      e.preventDefault() // keep focus trapped in the input
    }
  }

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        backgroundColor: 'rgba(12, 17, 34, 0.35)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '14vh',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        style={{
          width: 'min(560px, calc(100vw - 32px))',
          backgroundColor: 'var(--bg-main)',
          border: '1px solid var(--border-main)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-soft), 0 24px 64px -16px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0) }}
          onKeyDown={handleKeyDown}
          placeholder="Type a command or tab name…"
          aria-label="Search commands"
          style={{
            padding: '14px 16px',
            border: 'none',
            borderBottom: '1px solid var(--border-main)',
            backgroundColor: 'var(--bg-input)',
            color: 'var(--text-main)',
            fontSize: '15px',
            fontFamily: 'var(--font-main)',
            outline: 'none',
          }}
        />
        <div
          ref={listRef}
          role="listbox"
          style={{ maxHeight: '320px', overflowY: 'auto', padding: '6px' }}
        >
          {results.length === 0 && (
            <div style={{ padding: '14px 12px', color: 'var(--text-muted)', fontSize: '14px' }}>
              No matching commands
            </div>
          )}
          {results.map((cmd, i) => (
            <div
              key={cmd.id}
              role="option"
              aria-selected={i === selectedIndex}
              onMouseEnter={() => setSelectedIndex(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runCommand(cmd)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 10px',
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: i === selectedIndex ? 'var(--accent-soft)' : 'transparent',
                color: 'var(--text-main)',
                fontSize: '14px',
              }}
            >
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: i === selectedIndex ? 'var(--accent)' : 'var(--text-muted)',
                minWidth: '52px',
              }}>
                {cmd.category}
              </span>
              <span style={{ flex: 1 }}>{cmd.label}</span>
              {cmd.hint && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cmd.hint}</span>
              )}
            </div>
          ))}
        </div>
        <div style={{
          display: 'flex',
          gap: '14px',
          padding: '8px 14px',
          borderTop: '1px solid var(--border-main)',
          backgroundColor: 'var(--bg-panel)',
          color: 'var(--text-muted)',
          fontSize: '11.5px',
        }}>
          <span>↑↓ navigate</span>
          <span>↵ run</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
