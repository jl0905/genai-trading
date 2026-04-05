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

  if (loading) return <div className="text-white">Loading Bitcoin price...</div>
  if (error) return <div className="text-red-500">Error: {error}</div>

  return (
    <div className="text-center text-white p-8">
      <h2 className="text-2xl font-bold mb-4">Bitcoin Price from API</h2>
      <div className="text-4xl font-mono text-green-400 mb-4">
        {bitcoinPrice?.price || 'N/A'}
      </div>
      <div className="text-sm text-gray-400">
        Source: {bitcoinPrice?.source || 'Unknown'}
      </div>
    </div>
  )
}
