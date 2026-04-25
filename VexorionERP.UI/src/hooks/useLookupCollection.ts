import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../lib/api'

export function useLookupCollection<T>(loader: () => Promise<T[]>, enabled = true) {
  const [items, setItems] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!enabled) {
      setItems([])
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      setItems(await loader())
    } catch (loadError) {
      if (loadError instanceof ApiError) {
        setError(loadError.message)
      } else {
        setError('Unable to load lookup data.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [enabled, loader])

  useEffect(() => {
    void reload()
  }, [reload])

  return {
    items,
    isLoading,
    error,
    reload,
  }
}