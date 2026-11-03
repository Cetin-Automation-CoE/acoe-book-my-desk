import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { useT } from '../hooks/useLang'
import { dragOutcome } from '../lib/sheet'

interface SheetProps {
  open: boolean
  // Accessible name; shown as a heading only when `heading` is true.
  title: string
  heading?: boolean
  onClose: () => void
  children: ReactNode
}

const CLOSE_MS = 220
const SNAP_MS = 200
const STILL_MS = 100

interface DragState {
  startX: number
  startY: number
  lastY: number
  lastT: number
  // Downward speed in px/ms, in the sheet's own pixels.
  velocity: number
  // The gesture is a pull on the sheet (not a scroll of its content).
  active: boolean
  // The touch began on the handle: it pulls the sheet however far the content is scrolled.
  onHandle: boolean
  // The desktop phone frame is zoomed; finger movement is scaled back to sheet pixels.
  zoom: number
}

interface Controller {
  dismiss: () => void
  begin: (x: number, y: number, onHandle?: boolean) => void
  follow: (y: number) => void
  release: () => void
}

// A bottom sheet. It can be pulled down to close: by touch anywhere on it once its content is
// scrolled to the top, or by dragging the handle with a mouse. Tapping the shade or Escape also
// closes it; every close slides the sheet out unless motion is reduced.
// The sheet never fills its screen (see .sheet-panel in index.css): a strip of shade stays above
// it to tap, clear of the status bar, and the handle sticks to the top while long content scrolls
// (content fades out under it). The handle carries the sheet's top padding itself: a sticky box
// cannot start above its parent's content box, so a negative top margin would push it over the
// content.
export function Sheet({ open, title, heading = false, onClose, children }: SheetProps) {
  const t = useT()
  const panel = useRef<HTMLDivElement>(null)
  const grip = useRef<HTMLDivElement>(null)
  const shade = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const ctrl = useRef<Controller | null>(null)

  useEffect(() => {
    const el = panel.current
    const overlay = shade.current
    if (!open || !el) return
    let drag: DragState | null = null
    let closing = false

    const style = (transform: string, opacity: string, ms: number) => {
      el.style.transition = ms ? `transform ${ms}ms var(--ease-out-soft)` : 'none'
      el.style.transform = transform
      if (overlay) {
        overlay.style.transition = ms ? `opacity ${ms}ms ease` : 'none'
        overlay.style.opacity = opacity
      }
    }

    const c: Controller = {
      dismiss() {
        if (closing) return
        closing = true
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          onCloseRef.current()
          return
        }
        style('translateY(110%)', '0', CLOSE_MS)
        window.setTimeout(() => onCloseRef.current(), CLOSE_MS)
      },
      begin(x, y, onHandle = false) {
        if (closing) return
        // The frame (and its zoom) exists on wide screens only; see index.css.
        const framed = window.matchMedia('(min-width: 640px)').matches
        const zoom = (framed && Number(getComputedStyle(document.documentElement).getPropertyValue('--phone-zoom'))) || 1
        drag = { startX: x, startY: y, lastY: y, lastT: performance.now(), velocity: 0, active: false, onHandle, zoom }
      },
      follow(y) {
        if (!drag) return
        drag.active = true
        const now = performance.now()
        if (now > drag.lastT) drag.velocity = (y - drag.lastY) / drag.zoom / (now - drag.lastT)
        drag.lastY = y
        drag.lastT = now
        const offset = Math.max(0, (y - drag.startY) / drag.zoom)
        style(`translateY(${offset}px)`, String(Math.max(0, 1 - offset / el.offsetHeight)), 0)
      },
      release() {
        const d = drag
        drag = null
        if (!d?.active) return
        const offset = (d.lastY - d.startY) / d.zoom
        // A finger that paused before letting go is not flicking.
        const velocity = performance.now() - d.lastT > STILL_MS ? 0 : d.velocity
        if (dragOutcome({ offset, velocity, height: el.offsetHeight }) === 'close') c.dismiss()
        else style('', '', SNAP_MS)
      },
    }
    ctrl.current = c

    // Touch: a downward pull while the content sits at its top drags the sheet, and so does any
    // touch that starts on the handle; other movement is left to the browser, so the content still
    // scrolls.
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      const touch = e.touches[0]
      c.begin(touch.clientX, touch.clientY, grip.current?.contains(e.target as Node) ?? false)
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!drag) return
      const touch = e.touches[0]
      if (!drag.active && !drag.onHandle) {
        const dx = touch.clientX - drag.startX
        const dy = touch.clientY - drag.startY
        if (el.scrollTop > 0 || dy <= 0 || Math.abs(dx) > dy) {
          drag = null
          return
        }
      }
      e.preventDefault()
      c.follow(touch.clientY)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && c.dismiss()

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', c.release)
    el.addEventListener('touchcancel', c.release)
    window.addEventListener('keydown', onKey)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', c.release)
      el.removeEventListener('touchcancel', c.release)
      window.removeEventListener('keydown', onKey)
      ctrl.current = null
    }
  }, [open])

  // Mouse (the desktop phone frame): drag the handle. Touch is handled on the whole sheet above.
  const onHandlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const c = ctrl.current
    if (!c || e.pointerType === 'touch' || e.button !== 0) return
    e.preventDefault()
    c.begin(e.clientX, e.clientY)
    const onMove = (ev: PointerEvent) => c.follow(ev.clientY)
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      c.release()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button
        ref={shade}
        type="button"
        className="sheet-overlay absolute inset-0 bg-brand-deep/45"
        aria-label={t.close}
        onClick={() => ctrl.current?.dismiss()}
      />
      <div
        ref={panel}
        className="sheet-panel relative w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[32px] bg-white px-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))] shadow-sheet [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div
          ref={grip}
          aria-hidden
          onPointerDown={onHandlePointerDown}
          className="sticky top-0 z-10 -mx-5 cursor-grab touch-none bg-[linear-gradient(to_bottom,white_60%,rgba(255,255,255,0))] px-5 pb-4 pt-2 active:cursor-grabbing"
        >
          <div className="mx-auto h-[5px] w-[38px] rounded-full bg-line" />
        </div>
        {heading && <h2 className="mb-2 text-[21px] font-extrabold leading-[26px] text-ink">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
