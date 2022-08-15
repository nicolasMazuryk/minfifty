import { useState, useEffect } from 'react'
type ICallback = () => void
const useComponentWillMount = (callback: ICallback) => {
  const [mounted, setMounted] = useState(false)
  if (!mounted) callback()
  useEffect(() => {
    setMounted(true)
  }, [])
}

export default useComponentWillMount
