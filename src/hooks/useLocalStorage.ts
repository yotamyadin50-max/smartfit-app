import { useCallback, useState } from 'react'
import { readJson, removeJson, writeJson } from '../lib/storage'

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  validate?: (value: unknown) => value is T,
) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    return readJson(key, initialValue, validate)
  })

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      setStoredValue(prev => {
        const valueToStore = value instanceof Function ? value(prev) : value
        writeJson(key, valueToStore)
        return valueToStore
      })
    } catch (error) {
      console.error(`useLocalStorage error for key "${key}":`, error)
    }
  }, [key])

  const removeValue = useCallback(() => {
    removeJson(key)
    setStoredValue(initialValue)
  }, [initialValue, key])

  return [storedValue, setValue, removeValue] as const
}
