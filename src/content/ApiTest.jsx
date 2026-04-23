import { useState, useEffect } from 'react'
import { api } from '../api.js'

export default function ApiTest() {
  const [bitcoinPrice, setBitcoinPrice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const data = await api.getBitcoinPrice()
        setBitcoinPrice(data)
        setLoading(false)
      } catch (err) {
        setError(err.message)
        setLoading(false)
      }
    }

    fetchPrice()
  }, [])

  if (loading) return <div className="text-[color:var(--text-main)]">Loading Bitcoin price...</div>
  if (error) return <div className="text-[color:var(--chart-down)]">Error: {error}</div>

  return (
    <div className="text-center text-[color:var(--text-main)] p-8">
      <h2 className="text-2xl font-bold mb-4">Bitcoin Price from API</h2>
      <div className="text-4xl font-mono text-[color:var(--chart-up)] mb-4">
        {bitcoinPrice?.price || 'N/A'}
      </div>
      <div className="text-sm text-[color:var(--text-muted)]">
        Source: {bitcoinPrice?.source || 'Unknown'}
      </div>
    </div>
  )
}
