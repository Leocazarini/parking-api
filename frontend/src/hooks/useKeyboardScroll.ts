import { useEffect } from 'react'

const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

export function useKeyboardScroll() {
  useEffect(() => {
    const vv = window.visualViewport

    if (vv) {
      const onViewportResize = () => {
        const focused = document.activeElement as HTMLElement | null
        if (!focused || !INPUT_TAGS.has(focused.tagName)) return
        focused.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }

      vv.addEventListener('resize', onViewportResize)
      return () => vv.removeEventListener('resize', onViewportResize)
    }

    // Fallback for browsers without visualViewport
    const onFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null
      if (!target || !INPUT_TAGS.has(target.tagName)) return
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300)
    }

    document.addEventListener('focusin', onFocus)
    return () => document.removeEventListener('focusin', onFocus)
  }, [])
}
