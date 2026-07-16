'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ====== Mond fonts (จาก Rainmeter skin) ======
// โหลด font ที่นี่เพื่อให้ clock ใช้ได้
if (typeof window !== 'undefined') {
  const fontStyles = `
    @font-face { font-family: 'Quicksand'; src: url('/Quicksand.otf') format('opentype'); font-weight: normal; font-style: normal; }
    @font-face { font-family: 'Quicksand'; src: url('/Quicksand.otf') format('opentype'); font-weight: 600; font-style: normal; }
    @font-face { font-family: 'Anurati'; src: url('/Anurati.otf') format('opentype'); font-weight: normal; font-style: normal; }
  `
  const existing = document.getElementById('mond-fonts')
  if (!existing) {
    const style = document.createElement('style')
    style.id = 'mond-fonts'
    style.textContent = fontStyles
    document.head.appendChild(style)
  }
}

// ============================================================
// Windows 10 Desktop — Window Manager Edition
// ============================================================

// ---------- Types ----------
type WallpaperType = 'image' | 'video' | 'solid'
interface WallpaperConfig { type: WallpaperType; src: string }

interface WindowState {
  id: string
  title: string
  icon: string          // emoji or image path
  iconType: 'img' | 'emoji' | 'svg'
  open: boolean
  minimized: boolean
  maximized: boolean
  focused: boolean
  position: { x: number; y: number }
  size: { w: number; h: number }
  // animation flags
  opening: boolean
  closing: boolean
  minAnim: boolean
  switchIn: boolean   // สลับเข้า (zoom 75→100 + fade 0→100)
  switchOut: boolean  // สลับออก (zoom 100→120 + fade 100→0)
  switchWaiting: boolean // รอเล่น switchIn animation (invisible ระหว่างรอ)
  // optional per-app data (e.g. settings category)
  data?: Record<string, any>
}

// ---------- Constants ----------
const DEFAULT_WALLPAPER: WallpaperConfig = { type: 'image', src: '/wallpaper-default.jpg' }

// Preset wallpapers + solid colors
const WALLPAPER_PRESETS = [
  { type: 'image' as const, src: '/wallpaper-default.jpg', name: 'Windows 10' },
  { type: 'image' as const, src: '/win10-wallpaper.jpg', name: 'Hero' },
]
const SOLID_COLORS = [
  '#0078D7', '#E91E63', '#107C10', '#FF8C00', '#5C2D91',
  '#008272', '#D83B01', '#000000', '#FFFFFF', '#444444',
]

const MIN_W = 400
const MIN_H = 300

// ====== Animation timing constants (ใช้ทั้ง AppWindow และ openApp) ======
const D_OPEN = 600         // open / close / minimize
const D_SWITCH_IN = 600    // switchIn (App 2)
const D_SWITCH_OUT = 400   // switchOut (App 1) — รวมช่วงคงที่ + fade
const SWITCH_OUT_HOLD = 300 // App 1 คงที่ (visible เต็ม) 300ms ก่อนเริ่ม fade
const SWITCH_IN_START = 300 // App 2 เริ่มตอน 300ms

// ---------- App definitions ----------
interface AppDef {
  id: string
  title: string
  icon: string
  iconType: 'img' | 'emoji' | 'svg'
  defaultSize: { w: number; h: number }
  defaultPosition: { x: number; y: number }
  pinned: boolean  // แสดงใน taskbar เสมอ แม้ปิด
}

const APPS: AppDef[] = [
  {
    id: 'settings',
    title: 'Settings',
    icon: '/win10-settings-icon.png',
    iconType: 'img',
    defaultSize: { w: 760, h: 540 },
    defaultPosition: { x: 120, y: 80 },
    pinned: true,
  },
  {
    id: 'notepad',
    title: 'Notepad',
    icon: '/icon-notepad.png',
    iconType: 'img',
    defaultSize: { w: 500, h: 400 },
    defaultPosition: { x: 200, y: 120 },
    pinned: true,
  },
  {
    id: 'calculator',
    title: 'Calculator',
    icon: '/icon-calculator.png',
    iconType: 'img',
    defaultSize: { w: 320, h: 480 },
    defaultPosition: { x: 300, y: 100 },
    pinned: true,
  },
  // เพิ่มแอปใหม่ตรงนี้
]

// ============================================================
// TaskbarIconButton
// ============================================================
function TaskbarIconButton({
  label, onClick, children, width = 45,
  isOpen = false, isFocused = false,
  showHighlight = false, highlightColor = '#FF4081',
  centerStyle = false, buttonRef,
  onMiddleClick, onWheel,
}: {
  label: string
  onClick?: () => void
  children: React.ReactNode
  width?: number
  isOpen?: boolean
  isFocused?: boolean
  showHighlight?: boolean
  highlightColor?: string
  centerStyle?: boolean
  buttonRef?: React.Ref<HTMLButtonElement>
  onMiddleClick?: () => void
  onWheel?: (deltaY: number) => void
}) {
  const [hover, setHover] = useState(false)

  let overlayBg = 'transparent'
  let overlaySize = 0.9

  if (centerStyle) {
    if (isFocused && isOpen) {
      overlayBg = 'rgba(255, 255, 255, 0.8)'
      overlaySize = 1
    } else if (isOpen && hover) {
      overlayBg = 'rgba(255, 255, 255, 0.75)'
      overlaySize = 1
    } else if (isOpen && !hover) {
      overlayBg = 'rgba(255, 255, 255, 0)'
      overlaySize = 0.9
    } else if (hover) {
      overlayBg = 'rgba(255, 255, 255, 0.4)'
      overlaySize = 1
    }
  } else {
    if (hover) {
      overlayBg = 'rgba(0, 0, 0, 0.06)'
      overlaySize = 1
    }
  }

  return (
    <button
      ref={buttonRef}
      aria-label={label}
      title={label}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onMouseDown={(e) => {
        // คลิกเมาส์กลาง (button === 1)
        if (e.button === 1 && onMiddleClick) {
          e.preventDefault()
          onMiddleClick()
        }
      }}
      onWheel={(e) => {
        if (onWheel) {
          e.preventDefault()
          onWheel(e.deltaY)
        }
      }}
      style={{
        width, height: 45, border: 'none', background: 'transparent',
        cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background-color 0.18s ease', flexShrink: 0, position: 'relative', padding: 0,
      }}
    >
      <div
        style={{
          position: 'absolute', left: '50%', top: 0,
          width: `${overlaySize * 100}%`, height: '100%',
          transform: 'translateX(-50%)', backgroundColor: overlayBg,
          transition: 'background-color 0.18s ease, width 0.18s ease',
          pointerEvents: 'none', zIndex: 0,
        }}
      >
        {showHighlight && centerStyle && (
          <div
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
              backgroundColor: highlightColor,
              transition: 'height 0.18s ease, background-color 0.18s ease',
            }}
          />
        )}
      </div>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </button>
  )
}

// ============================================================
// AppWindow — generic window component
// ============================================================
function AppWindow({
  state, tabletMode, taskbarBtnRef,
  onMinimize, onMaximize, onClose, onFocus,
  onDragStart, onDragMove, onDragEnd,
  onResizeStart, onResizeMove, onResizeEnd,
  children,
}: {
  state: WindowState
  tabletMode: boolean
  taskbarBtnRef: React.RefObject<HTMLButtonElement>
  onMinimize: () => void
  onMaximize: () => void
  onClose: () => void
  onFocus: () => void
  onDragStart: (e: React.MouseEvent) => void
  onDragMove: (e: React.MouseEvent) => void
  onDragEnd: () => void
  onResizeStart: (edge: string, e: React.MouseEvent) => void
  onResizeMove: (e: React.MouseEvent) => void
  onResizeEnd: () => void
  children: React.ReactNode
}) {
  // tablet mode = maximize
  const isMaximized = state.maximized || tabletMode

  // ถ้า minimized และไม่อยู่ใน animation ย่อ → ไม่ render (ยกเว้น switchWaiting — ยัง render แต่ invisible)
  if (state.minimized && !state.minAnim && !state.switchWaiting) return null

  // Local state สำหรับ opening/switchIn/switchWaiting animation
  // - opening/switchIn: เริ่มที่ scale 0.8 + opacity 0 → 1
  // - switchWaiting: invisible รอ switchIn
  const [localStarting, setLocalStarting] = useState(state.opening || state.switchIn || state.switchWaiting)
  useEffect(() => {
    if (state.opening || state.switchIn) {
      const t = requestAnimationFrame(() => {
        requestAnimationFrame(() => setLocalStarting(false))
      })
      return () => cancelAnimationFrame(t)
    }
  }, [state.opening, state.switchIn])

  const winWidth = isMaximized ? window.innerWidth : state.size.w
  const winHeight = isMaximized ? window.innerHeight - 45 : state.size.h
  const winLeft = isMaximized ? 0 : state.position.x
  const winTop = isMaximized ? 0 : state.position.y

  // ====== Compute animation transform ======
  // Default: 100% scale + opacity 1
  let animScale = 1
  let animOpacity = 1

  // switchWaiting → invisible + scale 80% ระหว่างรอ switchIn
  if (state.switchWaiting) {
    animOpacity = 0
    animScale = 0.8
  } else if (state.closing) {
    // ปิด: zoom 100→95% + fade 100→0, 500ms
    animScale = 0.95
    animOpacity = 0
  } else if (state.minAnim) {
    // Minimize: เหมือนปิด
    animScale = 0.95
    animOpacity = 0
  } else if (state.switchOut) {
    // สลับแอป (app1 ออก): zoom 100→120% + fade 100→0, 500ms
    animScale = 1.2
    animOpacity = 0
  } else if (localStarting) {
    // เปิด/สลับเข้า (app2): zoom 80→100% + fade 0→100%, 500ms
    animScale = 0.8
    animOpacity = 0
  }

  const animTransform = `scale(${animScale})`

  // ====== Duration ตามสถานการณ์ (constants อยู่ที่ top-level) ======
  let duration = D_OPEN
  let opacityDelayMs = 0
  if (state.switchIn) {
    duration = D_SWITCH_IN
  } else if (state.switchOut) {
    duration = D_SWITCH_OUT
    opacityDelayMs = SWITCH_OUT_HOLD
  }

  const transformDuration = `${duration}ms`
  // opacity: switchOut → hold 300ms + fade 100ms (fade ช่วง 300-400ms); อื่น ๆ → fade เต็ม duration
  const opacityDuration = state.switchOut
    ? `${duration - opacityDelayMs}ms`
    : `${duration}ms`
  const opacityDelay = `${opacityDelayMs}ms`
  // Easing: ease-out-expo (เร็ว→ช้า) — default สำหรับทุกแอป
  const easing = 'cubic-bezier(0.16, 1, 0.3, 1)'
  // Easing พิเศษ: App 1 (แอปเก่า) ตอน switchOut zoom → ease-in-cubic (ช้า→เร็ว)
  const transformEasing = state.switchOut
    ? 'cubic-bezier(0.55, 0.055, 0.675, 0.19)'
    : easing
  const posDuration = `${duration}ms`

  return (
    <div
      data-window="true"
      style={{
        position: 'absolute', left: winLeft, top: winTop,
        width: winWidth, height: winHeight, zIndex: 500,
        backgroundColor: 'rgba(255, 255, 255, 1)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: 'none',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
        display: 'flex', flexDirection: 'column',
        fontFamily: 'Segoe UI, sans-serif', overflow: 'hidden',
        transform: animTransform, opacity: animOpacity,
        transformOrigin: 'center center',
        transition: `transform ${transformDuration} ${transformEasing}, opacity ${opacityDuration} ${easing} ${opacityDelay}, left ${posDuration} ${easing}, top ${posDuration} ${easing}, width ${posDuration} ${easing}, height ${posDuration} ${easing}`,
        willChange: 'transform, opacity, left, top, width, height',
        userSelect: 'none',
      }}
      onMouseDown={(e) => {
        const target = e.target as HTMLElement
        if (target.style.cursor && target.style.cursor.includes('resize')) return
        onFocus()
        onDragStart(e)
      }}
      onMouseMove={(e) => { onDragMove(e) }}
      onMouseUp={onDragEnd}
      onMouseLeave={onDragEnd}
    >
      {/* Noise overlay 20% */}
      <div
        style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          opacity: 0.2,
          mixBlendMode: 'overlay',
          backgroundSize: '100px 100px',
          zIndex: 0,
        }}
      />
      {/* ====== Title Bar ====== */}
      <div
        style={{
          height: 32, backgroundColor: 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 0 0 12px', flexShrink: 0,
          borderBottom: 'none', cursor: 'default',
          userSelect: 'none', position: 'relative', zIndex: 1,
        }}
        onMouseDown={(e) => {
          e.stopPropagation()
          onFocus()
          onDragStart(e)
        }}
      >
        <div style={{ fontSize: 12, color: '#1F1F1F', fontWeight: 400 }}>{state.title}</div>
        <div style={{ display: 'flex', height: '100%' }}>
          {/* Close */}
          <button
            onClick={onClose}
            onMouseDown={(e) => { e.stopPropagation(); onDragStart(e) }}
            style={{ ...winBtnStyle }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e81123'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#1F1F1F' }}
            title="Close"
            aria-label="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1,1 L9,9 M9,1 L1,9" stroke="currentColor" strokeWidth="1.2" /></svg>
          </button>
        </div>
      </div>

      {/* ====== Body ====== */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', userSelect: 'none', position: 'relative', zIndex: 1 }}>
        {children}
      </div>

      {/* ====== Resize Handles — ซ่อนตอน maximized/tablet ====== */}
      {!isMaximized && (
        <>
          {(['n','s','w','e'] as const).map(edge => (
            <div
              key={edge}
              onMouseDown={(e) => { e.stopPropagation(); onResizeStart(edge, e) }}
              onMouseMove={onResizeMove}
              onMouseUp={onResizeEnd}
              onMouseLeave={onResizeEnd}
              style={{
                position: 'absolute',
                ...(edge === 'n' ? { top: 0, left: 6, right: 6, height: 4, cursor: 'ns-resize' } : {}),
                ...(edge === 's' ? { bottom: 0, left: 6, right: 6, height: 4, cursor: 'ns-resize' } : {}),
                ...(edge === 'w' ? { left: 0, top: 6, bottom: 6, width: 4, cursor: 'ew-resize' } : {}),
                ...(edge === 'e' ? { right: 0, top: 6, bottom: 6, width: 4, cursor: 'ew-resize' } : {}),
                zIndex: 10,
              }}
            />
          ))}
          {([
            ['nw', 'nwse-resize'], ['ne', 'nesw-resize'],
            ['sw', 'nesw-resize'], ['se', 'nwse-resize'],
          ] as const).map(([corner, cursor]) => (
            <div
              key={corner}
              onMouseDown={(e) => { e.stopPropagation(); onResizeStart(corner, e) }}
              onMouseMove={onResizeMove}
              onMouseUp={onResizeEnd}
              onMouseLeave={onResizeEnd}
              style={{
                position: 'absolute', width: 8, height: 8, cursor,
                zIndex: 11,
                ...(corner.includes('n') ? { top: 0 } : { bottom: 0 }),
                ...(corner.includes('w') ? { left: 0 } : { right: 0 }),
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}

const winBtnStyle: React.CSSProperties = {
  width: 46, height: 32, border: 'none', background: 'transparent',
  cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background-color 0.1s', color: '#1F1F1F',
}

// ============================================================
// Settings Content
// ============================================================
const SETTINGS_CATEGORIES = [
  // แถวบน 5 หมวด (active)
  {
    id: 'System', icon: 'system', desc: 'Display, sound, notifications, power', active: true,
    subPages: [
      { id: 'Display', icon: 'display', desc: 'Monitors, brightness, night light' },
      { id: 'Sound', icon: 'sound', desc: 'Volume, output, input' },
      { id: 'Notifications & actions', icon: 'notifications', desc: 'Notifications, quick actions' },
      { id: 'Focus assist', icon: 'focus', desc: 'Hide notifications' },
      { id: 'Power & sleep', icon: 'power', desc: 'Sleep, screen, power' },
      { id: 'Storage', icon: 'storage', desc: 'Storage, drives' },
      { id: 'Multitasking', icon: 'multitasking', desc: 'Snap, virtual desktops' },
      { id: 'Projecting to this PC', icon: 'projecting', desc: 'Project to this PC' },
      { id: 'Clipboard', icon: 'clipboard', desc: 'Copy history, sync' },
      { id: 'About', icon: 'about', desc: 'Device specs' },
    ],
  },
  { id: 'Devices', icon: 'devices', desc: 'Bluetooth, printers, mouse', active: false, subPages: [] },
  { id: 'Phone', icon: 'phone', desc: 'Link your Android, iPhone', active: false, subPages: [] },
  { id: 'Network & Internet', icon: 'network', desc: 'Wi-Fi, airplane mode, VPN', active: false, subPages: [] },
  {
    id: 'Personalization', icon: 'personalization', desc: 'Background, lock screen, colors', active: true,
    subPages: [
      { id: 'Background', icon: 'display', desc: 'Picture, color, slideshow' },
      { id: 'Colors', icon: 'personalization', desc: 'Light, dark, accent' },
      { id: 'Lock screen', icon: 'privacy', desc: 'Background, status' },
      { id: 'Themes', icon: 'personalization', desc: 'Install, save, switch' },
      { id: 'Fonts', icon: 'about', desc: 'Install, manage' },
      { id: 'Start', icon: 'system', desc: 'Layout, folders' },
      { id: 'Taskbar', icon: 'system', desc: 'Lock, auto-hide' },
    ],
  },
  // แถวล่าง 3 หมวด (active)
  {
    id: 'Apps', icon: 'apps', desc: 'Uninstall, defaults, optional features', active: true,
    subPages: [
      { id: 'Apps & features', icon: 'apps', desc: 'Uninstall, change' },
      { id: 'Default apps', icon: 'apps', desc: 'Defaults for email, maps' },
      { id: 'Optional features', icon: 'storage', desc: 'Install, uninstall' },
      { id: 'Startup', icon: 'system', desc: 'Auto-start apps' },
      { id: 'Apps for websites', icon: 'network', desc: 'Open websites with apps' },
      { id: 'Video playback', icon: 'display', desc: 'HDR, battery' },
    ],
  },
  { id: 'Accounts', icon: 'accounts', desc: 'Your accounts, email, sync, work, family', active: false, subPages: [] },
  { id: 'Time & Language', icon: 'time', desc: 'Speech, region, date', active: false, subPages: [] },
  { id: 'Gaming', icon: 'gaming', desc: 'Xbox Game Bar, captures, Game Mode', active: false, subPages: [] },
  { id: 'Ease of Access', icon: 'ease', desc: 'Narrator, magnifier, high contrast', active: false, subPages: [] },
  { id: 'Privacy', icon: 'privacy', desc: 'Location, camera, microphone', active: false, subPages: [] },
  {
    id: 'Update & Security', icon: 'update', desc: 'Windows Update, recovery, backup', active: true,
    subPages: [
      { id: 'Windows Update', icon: 'update', desc: 'Check for updates' },
      { id: 'Windows Security', icon: 'privacy', desc: 'Antivirus, firewall' },
      { id: 'Backup', icon: 'storage', desc: 'File History' },
      { id: 'Troubleshoot', icon: 'about', desc: 'Resolve problems' },
      { id: 'Recovery', icon: 'update', desc: 'Reset, restore' },
      { id: 'Activation', icon: 'about', desc: 'Activation status' },
      { id: 'Find my device', icon: 'phone', desc: 'Locate device' },
      { id: 'For developers', icon: 'system', desc: 'Developer mode' },
    ],
  },
]

// SVG icons สีฟ้าแบบ line-art (เหมือน Win10 จริง)
function SettingsIcon({ name, size = 32 }: { name: string; size?: number }) {
  const stroke = '#E91E63'
  const sw = 1.5
  const common = { width: size, height: size, viewBox: '0 0 32 32', fill: 'none', stroke, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'system': // Monitor
      return <svg {...common}><rect x="4" y="6" width="24" height="16" rx="1" /><line x1="12" y1="26" x2="20" y2="26" /><line x1="16" y1="22" x2="16" y2="26" /></svg>
    case 'devices': // Mouse
      return <svg {...common}><rect x="12" y="4" width="8" height="20" rx="4" /><line x1="16" y1="8" x2="16" y2="13" /></svg>
    case 'phone': // Phone
      return <svg {...common}><rect x="10" y="4" width="12" height="24" rx="2" /><line x1="14" y1="25" x2="18" y2="25" /></svg>
    case 'network': // Globe
      return <svg {...common}><circle cx="16" cy="16" r="10" /><line x1="6" y1="16" x2="26" y2="16" /><path d="M16 6c4 4 4 16 0 20M16 6c-4 4-4 16 0 20" /></svg>
    case 'personalization': // Palette
      return <svg {...common}><path d="M16 4a12 12 0 0 0 0 24c2 0 3-1 3-3 0-1-1-2-1-3s1-2 2-2h2a6 6 0 0 0 6-6c0-5-5-10-12-10z" /><circle cx="10" cy="14" r="1.2" fill={stroke} /><circle cx="14" cy="10" r="1.2" fill={stroke} /><circle cx="20" cy="11" r="1.2" fill={stroke} /><circle cx="22" cy="17" r="1.2" fill={stroke} /></svg>
    case 'apps': // Grid
      return <svg {...common}><rect x="5" y="5" width="8" height="8" rx="1" /><rect x="19" y="5" width="8" height="8" rx="1" /><rect x="5" y="19" width="8" height="8" rx="1" /><rect x="19" y="19" width="8" height="8" rx="1" /></svg>
    case 'accounts': // Person
      return <svg {...common}><circle cx="16" cy="11" r="5" /><path d="M6 28c0-5 4-9 10-9s10 4 10 9" /></svg>
    case 'time': // Clock
      return <svg {...common}><circle cx="16" cy="16" r="11" /><polyline points="16 9 16 16 21 19" /></svg>
    case 'gaming': // Game controller
      return <svg {...common}><path d="M9 11h14a4 4 0 0 1 4 4v3a5 5 0 0 1-9 3l-2-2h-2l-2 2a5 5 0 0 1-9-3v-3a4 4 0 0 1 4-4z" /><line x1="11" y1="16" x2="11" y2="19" /><line x1="9.5" y1="17.5" x2="12.5" y2="17.5" /><circle cx="21" cy="16" r="1" fill={stroke} /><circle cx="23" cy="18" r="1" fill={stroke} /></svg>
    case 'ease': // Eye
      return <svg {...common}><path d="M2 16c4-6 9-9 14-9s10 3 14 9c-4 6-9 9-14 9s-10-3-14-9z" /><circle cx="16" cy="16" r="4" /><circle cx="16" cy="16" r="1.5" fill={stroke} /></svg>
    case 'privacy': // Lock
      return <svg {...common}><rect x="6" y="14" width="20" height="14" rx="2" /><path d="M10 14v-4a6 6 0 0 1 12 0v4" /><circle cx="16" cy="21" r="1.5" fill={stroke} /></svg>
    case 'update': // Refresh circle
      return <svg {...common}><path d="M27 16a11 11 0 1 1-3-8" /><polyline points="27 6 27 11 22 11" /></svg>
    // Sub-page icons (Win10 style)
    case 'display': // Monitor
      return <svg {...common}><rect x="5" y="6" width="22" height="15" rx="1" /><line x1="11" y1="26" x2="21" y2="26" /><line x1="16" y1="21" x2="16" y2="26" /></svg>
    case 'sound': // Speaker
      return <svg {...common}><polygon points="6,12 10,12 15,8 15,24 10,20 6,20" /><path d="M18 10a5 5 0 0 1 0 12" /><path d="M21 7a9 9 0 0 1 0 18" /></svg>
    case 'notifications': // Bell
      return <svg {...common}><path d="M16 4a6 6 0 0 0-6 6v5l-2 3h16l-2-3v-5a6 6 0 0 0-6-6z" /><path d="M13 22a3 3 0 0 0 6 0" /></svg>
    case 'focus': // Moon
      return <svg {...common}><path d="M20 14a8 8 0 1 1-9-9 7 7 0 0 0 9 9z" /></svg>
    case 'power': // Power button
      return <svg {...common}><path d="M16 4v10" /><path d="M10 7a10 10 0 1 0 12 0" /></svg>
    case 'storage': // Drive
      return <svg {...common}><rect x="4" y="10" width="24" height="10" rx="1" /><circle cx="9" cy="15" r="1.5" fill={stroke} /><line x1="14" y1="15" x2="24" y2="15" /></svg>
    case 'multitasking': // Overlapping windows
      return <svg {...common}><rect x="4" y="8" width="12" height="12" rx="1" /><rect x="12" y="12" width="12" height="12" rx="1" fill="#fff" /></svg>
    case 'projecting': // Cast
      return <svg {...common}><rect x="4" y="6" width="24" height="16" rx="1" /><path d="M10 22a6 6 0 0 1 12 0" /><circle cx="16" cy="22" r="1.5" fill={stroke} /></svg>
    case 'clipboard': // Clipboard
      return <svg {...common}><rect x="8" y="6" width="16" height="22" rx="2" /><rect x="12" y="3" width="8" height="5" rx="1" /><line x1="12" y1="14" x2="20" y2="14" /><line x1="12" y1="18" x2="20" y2="18" /></svg>
    case 'about': // Info
      return <svg {...common}><circle cx="16" cy="16" r="11" /><line x1="16" y1="11" x2="16" y2="17" /><circle cx="16" cy="21" r="1" fill={stroke} /></svg>
    default:
      return <svg {...common}><circle cx="16" cy="16" r="10" /><line x1="16" y1="12" x2="16" y2="16" /><circle cx="16" cy="20" r="0.5" fill={stroke} /></svg>
  }
}

// ============================================================
// Settings Content (Win10 style)
// ============================================================
function ToggleSwitch({ defaultOn = false, on, onToggle }: { defaultOn?: boolean; on?: boolean; onToggle?: () => void }) {
  const [internalOn, setInternalOn] = useState(defaultOn)
  const isControlled = on !== undefined
  const current = isControlled ? on : internalOn
  const handleToggle = () => {
    if (isControlled && onToggle) onToggle()
    else setInternalOn(!internalOn)
  }
  return (
    <div
      onClick={handleToggle}
      style={{
        width: 44, height: 22,
        backgroundColor: current ? '#E91E63' : '#BDBDBD',
        borderRadius: 11, position: 'relative', cursor: 'default',
        transition: 'background-color 0.2s',
      }}
    >
      <div
        style={{
          position: 'absolute', top: 3, left: current ? 25 : 3,
          width: 16, height: 16, backgroundColor: current ? '#fff' : '#333', borderRadius: '50%',
          transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}
      />
    </div>
  )
}

function SettingsContent({
  category, onCategoryChange, subPage, onSubPageChange,
  tabletMode, onToggleTabletMode,
  wallpaper, onWallpaperChange, brightness, onBrightnessChange,
  volume, onVolumeChange, nightLight, onToggleNightLight,
  autoTime, onToggleAutoTime, darkMode, onToggleDarkMode,
  wifi, onToggleWifi, bluetooth, onToggleBluetooth,
  airplane, onToggleAirplane, mobileHotspot, onToggleMobileHotspot,
  touchpad, onToggleTouchpad, typing, onToggleTyping,
  gameBar, onToggleGameBar, gameMode, onToggleGameMode,
  magnifier, onToggleMagnifier, highContrast, onToggleHighContrast,
  location, onToggleLocation, camera, onToggleCamera, microphone, onToggleMicrophone,
  backup, onToggleBackup,
}: {
  category: string
  onCategoryChange: (c: string) => void
  subPage: string
  onSubPageChange: (s: string) => void
  tabletMode: boolean
  onToggleTabletMode: () => void
  wallpaper: string
  onWallpaperChange: (w: string, t?: string) => void
  brightness: number
  onBrightnessChange: (b: number) => void
  volume: number
  onVolumeChange: (v: number) => void
  nightLight: boolean
  onToggleNightLight: () => void
  autoTime: boolean
  onToggleAutoTime: () => void
  darkMode: boolean
  onToggleDarkMode: () => void
  wifi: boolean; onToggleWifi: () => void
  bluetooth: boolean; onToggleBluetooth: () => void
  airplane: boolean; onToggleAirplane: () => void
  mobileHotspot: boolean; onToggleMobileHotspot: () => void
  touchpad: boolean; onToggleTouchpad: () => void
  typing: boolean; onToggleTyping: () => void
  gameBar: boolean; onToggleGameBar: () => void
  gameMode: boolean; onToggleGameMode: () => void
  magnifier: boolean; onToggleMagnifier: () => void
  highContrast: boolean; onToggleHighContrast: () => void
  location: boolean; onToggleLocation: () => void
  camera: boolean; onToggleCamera: () => void
  microphone: boolean; onToggleMicrophone: () => void
  backup: boolean; onToggleBackup: () => void
}) {
  const isHome = !category || category === ''
  // Settings page transition state
  const [settingsTransition, setSettingsTransition] = useState<'home' | 'category'>(isHome ? 'home' : 'category')
  useEffect(() => {
    setSettingsTransition(isHome ? 'home' : 'category')
  }, [isHome])
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%',
      backgroundColor: 'transparent', overflow: 'hidden',
      fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
    }}>
      {/* ====== Header ====== */}
      {isHome ? (
        // ====== Home header: title กลาง + search ใต้ title (เหมือน Win10 จริง) ======
        <div
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '40px 24px 24px', backgroundColor: 'transparent',
            flexShrink: 0, gap: 16,
          }}
        >
          <h1 style={{
            fontSize: 24, fontWeight: 400, margin: 0,
            lineHeight: '32px', color: '#323130',
          }}>Windows Settings</h1>
          <div
            style={{
              height: 36, width: '100%', maxWidth: 480,
              backgroundColor: 'rgba(255,255,255,0.5)', border: '1px solid #E91E63',
              borderRadius: 4,
              display: 'flex', alignItems: 'center', padding: '8px 12px', gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#64748b" strokeWidth="1.5" />
              <path d="M16 16l4 4" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              placeholder="Find a setting"
              style={{
                border: 'none', outline: 'none', background: 'transparent',
                fontSize: 14, flex: 1, color: '#323130', fontFamily: 'inherit',
              }}
            />
          </div>
        </div>
      ) : (
        // ====== Category header: back button + breadcrumb (เหมือน Win10 จริง) ======
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '8px 24px', backgroundColor: 'transparent',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)', flexShrink: 0,
          }}
        >
          <button
            aria-label="Back"
            onClick={() => onCategoryChange('')}
            style={{
              width: 32, height: 32, border: 'none', background: 'transparent',
              cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 0, padding: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#323130" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          {/* Breadcrumb: แสดง category > subPage */}
          <div style={{ fontSize: 14, color: '#1F1F1F', fontWeight: 400, userSelect: 'none' }}>
            <span style={{ cursor: 'default' }} onClick={() => onCategoryChange('')}>{category}</span>
            <span style={{ color: '#767676', margin: '0 6px' }}>›</span>
            <span>{subPage || (SETTINGS_CATEGORIES.find((c) => c.id === category)?.subPages?.[0]?.id) || ''}</span>
          </div>
        </div>
      )}

      {/* ====== Body: ทั้งหน้าเปลี่ยนพร้อมกัน (Home ↔ Category) ====== */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}>

      {/* Home page — โผล่/หาย ตาม isHome */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundColor: 'transparent', overflowY: 'auto',
        padding: '24px 56px 32px', userSelect: 'none',
        display: 'flex', flexDirection: 'column',
        opacity: isHome ? 1 : 0,
        transform: isHome ? 'scale(1)' : 'scale(0.96)',
        pointerEvents: isHome ? 'auto' : 'none',
        transition: 'opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '16px 16px',
            maxWidth: 1100, margin: '0 auto', width: '100%',
          }}>
            {SETTINGS_CATEGORIES.map((c) => {
              const disabled = c.active === false
              return (
              <div
                key={c.id}
                onClick={() => { if (!disabled) onCategoryChange(c.id) }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  padding: '14px 12px',
                  cursor: disabled ? 'not-allowed' : 'default',
                  backgroundColor: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: 4,
                  opacity: disabled ? 0.4 : 1,
                  transition: 'background-color 83ms linear, opacity 83ms linear',
                }}
                onMouseEnter={(e) => {
                  if (!disabled) e.currentTarget.style.backgroundColor = '#f3f3f3'
                }}
                onMouseLeave={(e) => {
                  if (!disabled) e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center', marginTop: 2 }}>
                  <SettingsIcon name={c.icon} size={19} />
                </span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#323130', lineHeight: '22px', marginBottom: 4 }}>
                    {c.id}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', lineHeight: '18px' }}>
                    {c.desc}
                  </div>
                </div>
              </div>
              )
            })}
          </div>
          {/* Footer */}
          <div style={{ marginTop: 'auto' }} />
        </div>

      {/* Category page — โผล่/หาย ตาม isHome (ตรงข้าม) */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', minHeight: 0, overflow: 'hidden',
        opacity: isHome ? 0 : 1,
        transform: isHome ? 'scale(0.96)' : 'scale(1)',
        pointerEvents: isHome ? 'none' : 'auto',
        transition: 'opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Sidebar — Win10 จริง: 280px, bg #F2F2F2, search bar ด้านบน */}
        <div
          style={{
            width: 280, backgroundColor: 'transparent',
            borderRight: '1px solid #D4D4D4', padding: 0,
            overflowY: 'auto', color: '#1F1F1F', userSelect: 'none',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Search bar ด้านบน sidebar */}
          <div style={{ padding: '12px 16px 16px' }}>
            <div
              style={{
                height: 32, backgroundColor: 'rgba(255,255,255,0.5)', border: '1px solid #E91E63',
                borderRadius: 4,
                display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="#757575" strokeWidth="1.5" />
                <path d="M16 16l4 4" stroke="#757575" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <input
                placeholder="Find a setting"
                style={{
                  border: 'none', outline: 'none', background: 'transparent',
                  fontSize: 13, flex: 1, color: '#323130', fontFamily: 'inherit',
                }}
              />
            </div>
          </div>

          {/* Home item — no icon (matches real Win10) */}
          <div
            onClick={(e) => { e.stopPropagation(); onCategoryChange('') }}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 24px',
              cursor: 'pointer',
              fontSize: 13, lineHeight: '20px',
              color: '#E91E63',
              fontWeight: 400,
              transition: 'background-color 83ms linear',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
          >
            <span>Home</span>
          </div>

          {/* Category name (parent) — no icon (matches real Win10) */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 24px',
              fontSize: 13, lineHeight: '20px',
              fontWeight: 600, color: '#323130',
            }}
          >
            <span>{category}</span>
          </div>

          {/* Sub-pages ของ category ปัจจุบัน */}
          {(SETTINGS_CATEGORIES.find((c) => c.id === category)?.subPages || []).map((sp) => {
            const currentSub = subPage || (SETTINGS_CATEGORIES.find((c) => c.id === category)?.subPages?.[0]?.id) || ''
            const selected = currentSub === sp.id
            return (
            <div
              key={sp.id}
              onClick={(e) => { e.stopPropagation(); onSubPageChange(sp.id) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 24px 10px 48px',
                cursor: 'pointer',
                fontSize: 13, lineHeight: '20px',
                fontWeight: selected ? 600 : 400,
                color: '#323130',
                backgroundColor: selected ? 'rgba(0, 0, 0, 0.06)' : 'transparent',
                borderLeft: selected ? '3px solid #E91E63' : '3px solid transparent',
                transition: 'background-color 150ms ease, border-color 150ms ease',
              }}
              onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.04)' }}
              onMouseLeave={(e) => { if (!selected) e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <SettingsIcon name={sp.icon} size={16} />
              </span>
              <span>{sp.id}</span>
            </div>
            )
          })}
        </div>

        {/* Content — Win10 จริง: พื้นขาว, padding 32px */}
        <div
          style={{
            flex: 1, backgroundColor: 'transparent', padding: '24px 32px 200px',
            overflowY: 'auto', color: '#323130', userSelect: 'none',
          }}
        >
          <div key={subPage || 'default'} style={{ animation: 'settingsSwitch 700ms cubic-bezier(0.16, 1, 0.3, 1)' }}>
          <SettingsSubPage
            category={category}
            subPage={subPage || (SETTINGS_CATEGORIES.find((c) => c.id === category)?.subPages?.[0]?.id) || category}
            wallpaper={wallpaper}
            onWallpaperChange={onWallpaperChange}
            brightness={brightness}
            onBrightnessChange={onBrightnessChange}
            volume={volume}
            onVolumeChange={onVolumeChange}
            nightLight={nightLight}
            onToggleNightLight={onToggleNightLight}
            tabletMode={tabletMode}
            onToggleTabletMode={onToggleTabletMode}
            autoTime={autoTime}
            onToggleAutoTime={onToggleAutoTime}
            darkMode={darkMode}
            onToggleDarkMode={onToggleDarkMode}
            backup={backup}
            onToggleBackup={onToggleBackup}
          />
          </div>
        </div>
      </div>

      </div>{/* ปิด wrapper relative */}
    </div>
  )
}

// ============================================================
// Settings Page (แต่ละหมวด)
// ============================================================
// ============================================================
// Settings Sub-Page (หน้า detail ของแต่ละ row)
// ============================================================
function SettingsSubPage(props: {
  category: string
  subPage: string
  wallpaper: string
  onWallpaperChange: (w: string, t?: string) => void
  brightness: number
  onBrightnessChange: (b: number) => void
  volume: number
  onVolumeChange: (v: number) => void
  nightLight: boolean
  onToggleNightLight: () => void
  tabletMode: boolean
  onToggleTabletMode: () => void
  autoTime: boolean
  onToggleAutoTime: () => void
  darkMode: boolean
  onToggleDarkMode: () => void
  backup: boolean
  onToggleBackup: () => void
}) {
  const titleStyle: React.CSSProperties = { fontSize: 28, fontWeight: 600, margin: '0 0 24px 0', lineHeight: '36px', color: '#1F1F1F' }
  const sectionTitleStyle: React.CSSProperties = { fontSize: 24, fontWeight: 600, marginBottom: 16, marginTop: 36, color: '#1F1F1F' }
  const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #F0F0F0' }
  const labelStyle: React.CSSProperties = { fontSize: 14, color: '#323130' }
  const descStyle: React.CSSProperties = { fontSize: 13, color: '#616161', marginTop: 4 }
  const linkStyle: React.CSSProperties = { fontSize: 14, color: '#E91E63', cursor: 'default' }

  // ====== Display sub-page (ใช้งานได้จริง — เหมือน Win10 จริง) ======
  if (props.subPage === 'Display') {
    return (
      <>
        <h1 style={titleStyle}>Display</h1>

        <div style={sectionTitleStyle}>Brightness and color</div>
        <div style={{ fontSize: 14, color: '#616161', marginBottom: 8 }}>Change brightness for the built-in display</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <input type="range" min={0} max={100} value={props.brightness} onChange={(e) => props.onBrightnessChange(Number(e.target.value))} style={{ width: 400, accentColor: '#E91E63', height: 4 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 14, color: '#323130' }}>
          <input type="checkbox" style={{ accentColor: '#E91E63', width: 16, height: 16 }} />
          <span>Change brightness automatically when lighting changes</span>
        </div>

        <div style={{ ...rowStyle, borderBottom: '1px solid #F0F0F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ToggleSwitch on={props.nightLight} onToggle={props.onToggleNightLight} />
            <div>
              <div style={labelStyle}>Night light</div>
              <div style={descStyle}>Off</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '8px 0 4px' }}>
          <span style={linkStyle}>Night light settings</span>
        </div>

        <div style={sectionTitleStyle}>Windows HD Color</div>
        <div style={{ fontSize: 14, color: '#616161', marginBottom: 8 }}>Get a brighter and more vibrant picture for videos, games and apps that support HDR.</div>
        <div style={{ padding: '4px 0' }}>
          <span style={linkStyle}>Windows HD Color settings</span>
        </div>

        <div style={sectionTitleStyle}>Scale and layout</div>
        <div style={{ ...rowStyle, borderBottom: '1px solid #F0F0F0' }}>
          <div>
            <div style={labelStyle}>Change the size of text, apps, and other items</div>
          </div>
          <span style={{ fontSize: 14, color: '#323130' }}>100% (Recommended)</span>
        </div>
        <div style={{ padding: '8px 0 4px' }}>
          <span style={linkStyle}>Advanced scaling settings</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: '1px solid #F0F0F0' }}>
          <div>
            <div style={labelStyle}>Display resolution</div>
          </div>
          <span style={{ fontSize: 14, color: '#323130' }}>1920 × 1080 (Recommended)</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: '1px solid #F0F0F0' }}>
          <div>
            <div style={labelStyle}>Orientation</div>
          </div>
          <span style={{ fontSize: 14, color: '#323130' }}>Landscape</span>
        </div>

        {/* Help from the web */}
        <div style={{ marginTop: 32, padding: 16, backgroundColor: '#F8F8F8', borderRadius: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#323130', marginBottom: 12 }}>Help from the web</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={linkStyle}>Adjusting display brightness settings easily</span>
            <span style={linkStyle}>Syncing refresh rates for smooth playback</span>
            <span style={linkStyle}>Setting up dual monitors easily</span>
            <span style={linkStyle}>Connecting to a projector or PC</span>
          </div>
        </div>
      </>
    )
  }

  // ====== Sound sub-page (ใช้งานได้จริง) ======
  if (props.subPage === 'Sound') {
    return (
      <>
        <h1 style={titleStyle}>Sound</h1>
        <div style={sectionTitleStyle}>Output</div>
        <div style={rowStyle}>
          <div>
            <div style={labelStyle}>Choose your output device</div>
            <div style={descStyle}>Speakers (Realtek Audio)</div>
          </div>
          <span style={{ fontSize: 12, color: '#E91E63' }}>Speakers</span>
        </div>
        <div style={rowStyle}>
          <div>
            <div style={labelStyle}>Master volume</div>
            <div style={descStyle}>Adjust the overall volume</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="range" min={0} max={100} value={props.volume} onChange={(e) => props.onVolumeChange(Number(e.target.value))} style={{ width: 200, accentColor: '#E91E63' }} />
            <span style={{ fontSize: 12, color: '#767676', minWidth: 30 }}>{props.volume}%</span>
          </div>
        </div>
        <div style={sectionTitleStyle}>Input</div>
        <div style={rowStyle}>
          <div>
            <div style={labelStyle}>Choose your input device</div>
            <div style={descStyle}>Microphone (Realtek Audio)</div>
          </div>
          <span style={{ fontSize: 12, color: '#E91E63' }}>Microphone</span>
        </div>
      </>
    )
  }

  // ====== Tablet mode sub-page (ใช้งานได้จริง) ======
  if (props.subPage === 'Tablet mode') {
    return (
      <>
        <h1 style={titleStyle}>Tablet mode</h1>
        <div style={sectionTitleStyle}>Tablet mode</div>
        <div style={rowStyle}>
          <div>
            <div style={labelStyle}>Make Windows more touch-friendly when using your device as a tablet</div>
            <div style={descStyle}>When on, apps open full screen</div>
          </div>
          <ToggleSwitch on={props.tabletMode} onToggle={props.onToggleTabletMode} />
        </div>
      </>
    )
  }

  // ====== Date & time sub-page (ใช้งานได้จริง) ======
  if (props.subPage === 'Date & time') {
    return (
      <>
        <h1 style={titleStyle}>Date &amp; time</h1>
        <div style={rowStyle}>
          <div>
            <div style={labelStyle}>Set time automatically</div>
            <div style={descStyle}>Windows will set the time zone automatically</div>
          </div>
          <ToggleSwitch on={props.autoTime} onToggle={props.onToggleAutoTime} />
        </div>
        <div style={rowStyle}>
          <div>
            <div style={labelStyle}>Adjust for daylight saving time automatically</div>
          </div>
          <ToggleSwitch on={props.autoTime} onToggle={props.onToggleAutoTime} />
        </div>
        <div style={sectionTitleStyle}>Time zone</div>
        <div style={rowStyle}>
          <div><div style={labelStyle}>Time zone</div></div>
          <span style={{ fontSize: 12, color: '#E91E63' }}>(UTC+07:00) Bangkok</span>
        </div>
      </>
    )
  }

  // ====== Colors sub-page (ใช้งานได้จริง) ======
  // ====== Background sub-page (wallpaper picker — เหมือน Win10 จริง) ======
  if (props.subPage === 'Background') {
    const isSolidColor = props.wallpaper && !props.wallpaper.startsWith('/') && !props.wallpaper.startsWith('data:')
    return (
      <>
        <h1 style={titleStyle}>Background</h1>

        {/* Preview */}
        <div style={{ ...rowStyle, borderBottom: 'none', alignItems: 'flex-start' }}>
          <div style={{ fontSize: 14, color: '#323130', minWidth: 200 }}>Preview</div>
          <div style={{
            width: 320, height: 180,
            backgroundImage: isSolidColor ? 'none' : `url(${props.wallpaper})`,
            backgroundColor: isSolidColor ? props.wallpaper : 'transparent',
            backgroundSize: 'cover', backgroundPosition: 'center',
            border: '1px solid #ccc', borderRadius: 2,
          }} />
        </div>

        {/* Background type dropdown */}
        <div style={{ ...rowStyle, borderBottom: '1px solid #F0F0F0' }}>
          <div style={{ fontSize: 14, color: '#323130' }}>Background</div>
          <select
            value={isSolidColor ? 'solid' : 'picture'}
            onChange={(e) => {
              if (e.target.value === 'solid') props.onWallpaperChange('#0078D7', 'solid')
              else props.onWallpaperChange(WALLPAPER_PRESETS[0].src, 'image')
            }}
            style={{ padding: '4px 8px', fontSize: 13, border: '1px solid #ccc', borderRadius: 2, backgroundColor: '#fff', color: '#323130', cursor: 'default', minWidth: 120 }}
          >
            <option value="picture">Picture</option>
            <option value="solid">Solid color</option>
          </select>
        </div>

        {/* Choose your picture (only when Picture mode) */}
        {!isSolidColor && (
          <>
            <div style={{ ...rowStyle, borderBottom: '1px solid #F0F0F0', alignItems: 'flex-start' }}>
              <div style={{ fontSize: 14, color: '#323130', minWidth: 200 }}>Choose your picture</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {WALLPAPER_PRESETS.map((wp) => (
                  <div
                    key={wp.src}
                    onClick={() => props.onWallpaperChange(wp.src, 'image')}
                    style={{
                      width: 90, height: 60, backgroundImage: `url(${wp.src})`, backgroundSize: 'cover', backgroundPosition: 'center',
                      cursor: 'pointer', border: props.wallpaper === wp.src ? '3px solid #E91E63' : '1px solid #ccc',
                      borderRadius: 2,
                    }}
                    title={wp.name}
                  />
                ))}
                {/* Browse button */}
                <label style={{
                  width: 90, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid #ccc', borderRadius: 2, cursor: 'pointer', fontSize: 12, color: '#323130',
                  backgroundColor: '#f3f3f3',
                }}>
                  Browse
                  <input type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = () => {
                        const isVideo = file.type.startsWith('video/')
                        props.onWallpaperChange(reader.result as string, isVideo ? 'video' : 'image')
                      }
                      reader.readAsDataURL(file)
                    }
                  }} />
                </label>
              </div>
            </div>

            {/* Choose a fit */}
            <div style={{ ...rowStyle, borderBottom: '1px solid #F0F0F0' }}>
              <div style={{ fontSize: 14, color: '#323130' }}>Choose a fit</div>
              <select style={{ padding: '4px 8px', fontSize: 13, border: '1px solid #ccc', borderRadius: 2, backgroundColor: '#fff', color: '#323130', cursor: 'default', minWidth: 120 }}>
                <option>Fill</option>
                <option>Fit</option>
                <option>Stretch</option>
                <option>Tile</option>
                <option>Center</option>
                <option>Span</option>
              </select>
            </div>
          </>
        )}

        {/* Solid colors (only when Solid color mode) */}
        {isSolidColor && (
          <div style={{ ...rowStyle, borderBottom: '1px solid #F0F0F0', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 14, color: '#323130', minWidth: 200 }}>Choose your color</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SOLID_COLORS.map((color) => (
                <div
                  key={color}
                  onClick={() => props.onWallpaperChange(color, 'solid')}
                  style={{
                    width: 60, height: 60, backgroundColor: color, cursor: 'pointer',
                    border: props.wallpaper === color ? '3px solid #E91E63' : '1px solid #ccc',
                    borderRadius: 2,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </>
    )
  }

  if (props.subPage === 'Colors') {
    return (
      <>
        <h1 style={titleStyle}>Colors</h1>
        <div style={sectionTitleStyle}>Choose your color</div>
        <div style={rowStyle}>
          <div>
            <div style={labelStyle}>Choose your mode</div>
            <div style={descStyle}>Light / Dark</div>
          </div>
          <span style={{ fontSize: 12, color: '#E91E63' }}>{props.darkMode ? 'Dark' : 'Light'}</span>
        </div>
        <div style={rowStyle}>
          <div>
            <div style={labelStyle}>Choose your default app mode</div>
            <div style={descStyle}>Toggle between light and dark mode</div>
          </div>
          <ToggleSwitch on={props.darkMode} onToggle={props.onToggleDarkMode} />
        </div>
      </>
    )
  }

  // ====== Backup sub-page (ใช้งานได้จริง) ======
  if (props.subPage === 'Backup') {
    return (
      <>
        <h1 style={titleStyle}>Backup</h1>
        <div style={sectionTitleStyle}>Back up using File History</div>
        <div style={rowStyle}>
          <div>
            <div style={labelStyle}>Automatically back up my files</div>
            <div style={descStyle}>File History backs up files to an external drive</div>
          </div>
          <ToggleSwitch on={props.backup} onToggle={props.onToggleBackup} />
        </div>
      </>
    )
  }

  // ====== Default placeholder สำหรับ sub-pages อื่น ๆ ======
  return (
    <>
      <h1 style={titleStyle}>{props.subPage}</h1>
      <div style={{ fontSize: 13, color: '#767676', marginBottom: 24, lineHeight: 1.6 }}>
        This is the {props.subPage} settings page under {props.category}.
      </div>
      <div style={{ padding: 24, backgroundColor: '#f3f3f3', borderRadius: 4, textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#767676' }}>⚙️ Settings for {props.subPage}</div>
        <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>This sub-page is a placeholder</div>
      </div>
    </>
  )
}

// ============================================================
// Settings Page (แต่ละหมวด)
// ============================================================
function SettingsPage(props: {
  category: string
  subPage: string
  onSubPageChange: (s: string) => void
  tabletMode: boolean
  onToggleTabletMode: () => void
  wallpaper: string
  onWallpaperChange: (w: string, t?: string) => void
  brightness: number
  onBrightnessChange: (b: number) => void
  volume: number
  onVolumeChange: (v: number) => void
  nightLight: boolean
  onToggleNightLight: () => void
  autoTime: boolean
  onToggleAutoTime: () => void
  darkMode: boolean
  onToggleDarkMode: () => void
  wifi: boolean; onToggleWifi: () => void
  bluetooth: boolean; onToggleBluetooth: () => void
  airplane: boolean; onToggleAirplane: () => void
  mobileHotspot: boolean; onToggleMobileHotspot: () => void
  touchpad: boolean; onToggleTouchpad: () => void
  typing: boolean; onToggleTyping: () => void
  gameBar: boolean; onToggleGameBar: () => void
  gameMode: boolean; onToggleGameMode: () => void
  magnifier: boolean; onToggleMagnifier: () => void
  highContrast: boolean; onToggleHighContrast: () => void
  location: boolean; onToggleLocation: () => void
  camera: boolean; onToggleCamera: () => void
  microphone: boolean; onToggleMicrophone: () => void
  backup: boolean; onToggleBackup: () => void
}) {
  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 0', borderBottom: '1px solid #efefef',
  }
  // Win10 type ramp (Microsoft Learn): title 14/20 semibold, body 14/20 regular, small 12/16
  const titleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 600, marginBottom: 2, lineHeight: '20px' }
  const descStyle: React.CSSProperties = { fontSize: 12, color: '#767676', lineHeight: '16px' }
  const iconBoxStyle: React.CSSProperties = {
    width: 32, height: 32, backgroundColor: '#f3f3f3', borderRadius: 4,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, flexShrink: 0,
  }
  // Win10 page title: Display semibold 28/36
  const pageTitleStyle: React.CSSProperties = {
    fontSize: 28, fontWeight: 600, margin: '0 0 24px 0', lineHeight: '36px', color: '#1F1F1F',
  }

  // Row ที่คลิกได้ → เข้า sub-page
  const Row = ({ icon, title, desc, children }: { icon: string; title: string; desc: string; children?: React.ReactNode }) => (
    <div
      style={{ ...rowStyle, cursor: 'pointer' }}
      onClick={() => props.onSubPageChange(title)}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f3f3' }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
        <div style={iconBoxStyle}>{icon}</div>
        <div>
          <div style={titleStyle}>{title}</div>
          <div style={descStyle}>{desc}</div>
        </div>
      </div>
      {children}
    </div>
  )

  // DisabledRow — สีเทา ใช้งานไม่ได้ (placeholder สำหรับ sub-pages ที่ยังไม่ได้ทำ)
  const DisabledRow = ({ icon, title, desc }: { icon: string; title: string; desc: string }) => (
    <div style={{ ...rowStyle, opacity: 0.45, cursor: 'not-allowed' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
        <div style={iconBoxStyle}>{icon}</div>
        <div>
          <div style={titleStyle}>{title}</div>
          <div style={descStyle}>{desc}</div>
        </div>
      </div>
      <span style={{ fontSize: 12, color: '#999' }}>—</span>
    </div>
  )

  if (props.category === 'System') {
    return (
      <>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 24px 0', lineHeight: '36px' }}>System</h1>
        <Row icon="🖥️" title="Display" desc="Monitors, brightness, night light, display profile">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Configure</span>
        </Row>
        <Row icon="🔊" title="Sound" desc="Volume levels, output, input, sound devices">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Configure</span>
        </Row>
        <Row icon="🔔" title="Notifications & actions" desc="Notifications, quick actions">
          <ToggleSwitch />
        </Row>
        <Row icon="🌙" title="Focus assist" desc="Hide notifications during focus time">
          <ToggleSwitch defaultOn />
        </Row>
        <Row icon="🔋" title="Power & sleep" desc="Sleep, screen, power mode">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Configure</span>
        </Row>
        <Row icon="💾" title="Storage" desc="Storage space, drives, configuration rules">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Configure</span>
        </Row>
        <Row icon="🪟" title="Multitasking" desc="Snap windows, virtual desktops, Task view">
          <ToggleSwitch defaultOn />
        </Row>
        <Row icon="📱" title="Tablet mode" desc="Make Windows more touch-friendly">
          <ToggleSwitch on={props.tabletMode} onToggle={props.onToggleTabletMode} />
        </Row>
        <Row icon="📋" title="Clipboard" desc="Copy history, sync across devices">
          <ToggleSwitch defaultOn />
        </Row>
        <Row icon="🔁" title="Shared experiences" desc="Continue tasks across devices">
          <ToggleSwitch defaultOn />
        </Row>
        <Row icon="🖼️" title="Graphics Settings" desc="GPU preference, advanced graphics">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Configure</span>
        </Row>
        <Row icon="🔋" title="Battery" desc="Battery saver, battery use">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Configure</span>
        </Row>
        <Row icon="ℹ️" title="About" desc="Device specifications, Windows specifications">
          <span style={{ fontSize: 12, color: '#E91E63' }}>View</span>
        </Row>
      </>
    )
  }

  if (props.category === 'Personalization') {
    return (
      <>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 24px 0', lineHeight: '36px' }}>Personalization</h1>
        <Row icon="🖼️" title="Background" desc="Picture, solid color, slideshow">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Browse</span>
        </Row>
        <Row icon="🎨" title="Colors" desc="Light, dark, accent color">
          <ToggleSwitch on={props.darkMode} onToggle={props.onToggleDarkMode} />
        </Row>
        <Row icon="🔒" title="Lock screen" desc="Background, status, screen timeout">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Configure</span>
        </Row>
        <Row icon="🎭" title="Themes" desc="Install, save, switch">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Browse</span>
        </Row>
        <Row icon="🔤" title="Fonts" desc="Install, manage fonts">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Browse</span>
        </Row>
        <Row icon="🚀" title="Start" desc="Layout, folders, recent apps">
          <ToggleSwitch defaultOn />
        </Row>
        <Row icon="📊" title="Taskbar" desc="Lock, auto-hide, small buttons">
          <ToggleSwitch defaultOn />
        </Row>
      </>
    )
  }

  if (props.category === 'Time & Language') {
    return (
      <>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 24px 0', lineHeight: '36px' }}>Time & Language</h1>
        <Row icon="🕐" title="Date & time" desc="Time zone, automatic time">
          <ToggleSwitch on={props.autoTime} onToggle={props.onToggleAutoTime} />
        </Row>
        <Row icon="🌍" title="Region" desc="Country, regional format">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Configure</span>
        </Row>
        <Row icon="🗣️" title="Language" desc="Display, preferred languages">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Add</span>
        </Row>
        <Row icon="🎤" title="Speech" desc="Microphone, voice packages">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Configure</span>
        </Row>
      </>
    )
  }

  // ====== Devices ======
  if (props.category === 'Devices') {
    return (
      <>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 24px 0', lineHeight: '36px' }}>Devices</h1>
        <Row icon="🔵" title="Bluetooth & other devices" desc="Mouse, keyboard, pen, audio">
          <ToggleSwitch on={props.bluetooth} onToggle={props.onToggleBluetooth} />
        </Row>
        <Row icon="🖨️" title="Printers & scanners" desc="Printers, scanners, fax">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Add</span>
        </Row>
        <Row icon="🖱️" title="Mouse" desc="Buttons, wheel, pointer">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Configure</span>
        </Row>
        <Row icon="✋" title="Touchpad" desc="Gestures, sensitivity">
          <ToggleSwitch on={props.touchpad} onToggle={props.onToggleTouchpad} />
        </Row>
        <Row icon="⌨️" title="Typing" desc="Autocorrect, suggestions">
          <ToggleSwitch on={props.typing} onToggle={props.onToggleTyping} />
        </Row>
        <DisabledRow icon="✏️" title="Pen & Windows Ink" desc="Pen shortcuts, handwriting" />
        <DisabledRow icon="💿" title="AutoPlay" desc="Choose what happens with media" />
        <DisabledRow icon="🔌" title="USB" desc="USB settings, notifications" />
        <DisabledRow icon="👆" title="Touch" desc="Touch sensitivity" />
        <DisabledRow icon="⏺️" title="Wheel" desc="Surface Dial settings" />
        <DisabledRow icon="📱" title="Mobile devices" desc="Link your phone" />
      </>
    )
  }

  // ====== Phone ======
  if (props.category === 'Phone') {
    return (
      <>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 24px 0', lineHeight: '36px' }}>Phone</h1>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 24, lineHeight: 1.6 }}>
          Link your Android, iPhone, or other phone to your PC. Make calls, read texts, view photos, and more — right on your desktop.
        </div>
        <Row icon="📱" title="Your Phone" desc="Link your Android, iPhone">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Add a phone</span>
        </Row>
        <Row icon="📞" title="Calls" desc="Make and receive calls from your PC">
          <ToggleSwitch defaultOn />
        </Row>
        <Row icon="💬" title="Messages" desc="Send and receive SMS">
          <ToggleSwitch defaultOn />
        </Row>
        <Row icon="🖼️" title="Photos" desc="View phone photos on PC">
          <ToggleSwitch defaultOn />
        </Row>
      </>
    )
  }

  // ====== Network & Internet ======
  if (props.category === 'Network & Internet') {
    return (
      <>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 24px 0', lineHeight: '36px' }}>Network & Internet</h1>
        <Row icon="📶" title="Wi-Fi" desc="Connect, manage networks">
          <ToggleSwitch on={props.wifi} onToggle={props.onToggleWifi} />
        </Row>
        <Row icon="🔌" title="Ethernet" desc="Authentication, IP, DNS">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Configure</span>
        </Row>
        <Row icon="🔒" title="VPN" desc="Add, connect, manage">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Add</span>
        </Row>
        <Row icon="📡" title="Mobile hotspot" desc="Share your connection">
          <ToggleSwitch on={props.mobileHotspot} onToggle={props.onToggleMobileHotspot} />
        </Row>
        <Row icon="✈️" title="Airplane mode" desc="Stop all wireless communication">
          <ToggleSwitch on={props.airplane} onToggle={props.onToggleAirplane} />
        </Row>
        <Row icon="🌐" title="Proxy" desc="Proxy server settings">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Configure</span>
        </Row>
        <DisabledRow icon="📊" title="Data usage" desc="View data usage per app" />
        <DisabledRow icon="☎️" title="Dial-up" desc="Set up a dial-up connection" />
        <DisabledRow icon="📞" title="Wi-Fi calling" desc="Make calls over Wi-Fi" />
        <DisabledRow icon="📶" title="Cellular & SIM" desc="Manage cellular data" />
      </>
    )
  }

  // ====== Apps ======
  if (props.category === 'Apps') {
    return (
      <>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 24px 0', lineHeight: '36px' }}>Apps</h1>
        <Row icon="📦" title="Apps & features" desc="Uninstall, change, repair">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Manage</span>
        </Row>
        <Row icon="⭐" title="Default apps" desc="Defaults for email, maps, music">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Configure</span>
        </Row>
        <Row icon="🔧" title="Optional features" desc="Install, uninstall features">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Add</span>
        </Row>
        <Row icon="🌐" title="Apps for websites" desc="Choose apps that open websites">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Configure</span>
        </Row>
        <Row icon="🗺️" title="Offline Maps" desc="Download, manage maps">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Download maps</span>
        </Row>
        <Row icon="🚀" title="Startup" desc="Apps that start automatically">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Manage</span>
        </Row>
        <Row icon="🎬" title="Video playback" desc="HDR, battery options">
          <ToggleSwitch defaultOn />
        </Row>
      </>
    )
  }

  // ====== Accounts ======
  if (props.category === 'Accounts') {
    return (
      <>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 24px 0', lineHeight: '36px' }}>Accounts</h1>
        <Row icon="👤" title="Your info" desc="Account name, picture, settings">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Manage</span>
        </Row>
        <Row icon="📧" title="Email & accounts" desc="Email, calendar, contacts">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Add</span>
        </Row>
        <Row icon="🔐" title="Sign-in options" desc="Windows Hello, password, PIN">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Configure</span>
        </Row>
        <Row icon="👨‍👩‍👧" title="Family & other users" desc="Add, remove accounts">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Add</span>
        </Row>
        <Row icon="🔄" title="Sync your settings" desc="Sync across devices">
          <ToggleSwitch defaultOn />
        </Row>
        <DisabledRow icon="💼" title="Access work or school" desc="Connect to workplace" />
        <DisabledRow icon="🖥️" title="Set up a kiosk" desc="Single-app kiosk mode" />
      </>
    )
  }

  // ====== Gaming ======
  if (props.category === 'Gaming') {
    return (
      <>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 24px 0', lineHeight: '36px' }}>Gaming</h1>
        <Row icon="🎮" title="Game bar" desc="Open, capture, broadcast">
          <ToggleSwitch on={props.gameBar} onToggle={props.onToggleGameBar} />
        </Row>
        <Row icon="🎥" title="Captures" desc="Recording, audio quality">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Configure</span>
        </Row>
        <Row icon="⚡" title="Game Mode" desc="Optimize PC for play">
          <ToggleSwitch on={props.gameMode} onToggle={props.onToggleGameMode} />
        </Row>
        <Row icon="🖥️" title="Game bar settings" desc="Customize shortcuts, layout">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Configure</span>
        </Row>
        <DisabledRow icon="✅" title="TruePlay" desc="Anti-cheat, fair play" />
        <DisabledRow icon="🌐" title="Xbox Networking" desc="Multiplayer connection" />
      </>
    )
  }

  // ====== Ease of Access ======
  if (props.category === 'Ease of Access') {
    return (
      <>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 24px 0', lineHeight: '36px' }}>Ease of Access</h1>
        <Row icon="🖥️" title="Display" desc="Text size, zoom, magnifier">
          <ToggleSwitch on={props.magnifier} onToggle={props.onToggleMagnifier} />
        </Row>
        <Row icon="🖱️" title="Cursor & pointer" desc="Size, color, thickness">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Configure</span>
        </Row>
        <Row icon="🔍" title="Magnifier" desc="Zoom part or all of screen">
          <ToggleSwitch on={props.magnifier} onToggle={props.onToggleMagnifier} />
        </Row>
        <Row icon="🎨" title="High contrast" desc="Theme for readability">
          <ToggleSwitch on={props.highContrast} onToggle={props.onToggleHighContrast} />
        </Row>
        <Row icon="🔊" title="Audio" desc="Closed captions, mono">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Configure</span>
        </Row>
        <DisabledRow icon="🎙️" title="Narrator" desc="Screen reader" />
        <DisabledRow icon="🗣️" title="Speech recognition" desc="Voice control" />
        <DisabledRow icon="👁️" title="Eye control" desc="Eye tracker settings" />
        <DisabledRow icon="⌨️" title="Keyboard" desc="Sticky, filter keys" />
        <DisabledRow icon="🖱️" title="Mouse" desc="Mouse keys, size" />
      </>
    )
  }

  // ====== Privacy ======
  if (props.category === 'Privacy') {
    return (
      <>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 24px 0', lineHeight: '36px' }}>Privacy</h1>
        <Row icon="⚙️" title="General" desc="General privacy settings">
          <ToggleSwitch defaultOn={false} />
        </Row>
        <Row icon="📍" title="Location" desc="App access to location">
          <ToggleSwitch on={props.location} onToggle={props.onToggleLocation} />
        </Row>
        <Row icon="📷" title="Camera" desc="App access to camera">
          <ToggleSwitch on={props.camera} onToggle={props.onToggleCamera} />
        </Row>
        <Row icon="🎤" title="Microphone" desc="App access to microphone">
          <ToggleSwitch on={props.microphone} onToggle={props.onToggleMicrophone} />
        </Row>
        <Row icon="🔔" title="Notifications" desc="App access to notifications">
          <ToggleSwitch defaultOn />
        </Row>
        <Row icon="📊" title="Account info" desc="App access to account info">
          <ToggleSwitch defaultOn={false} />
        </Row>
        <DisabledRow icon="👥" title="Contacts" desc="App access to contacts" />
        <DisabledRow icon="📅" title="Calendar" desc="App access to calendar" />
        <DisabledRow icon="📞" title="Call history" desc="App access to call history" />
        <DisabledRow icon="📧" title="Email" desc="App access to email" />
        <DisabledRow icon="✅" title="Tasks" desc="App access to tasks" />
        <DisabledRow icon="💬" title="Messaging" desc="App access to messages" />
        <DisabledRow icon="📻" title="Radios" desc="Control radios" />
        <DisabledRow icon="📲" title="Other devices" desc="Sync with devices" />
        <DisabledRow icon="🔄" title="Background apps" desc="Apps running in background" />
        <DisabledRow icon="🔬" title="App diagnostics" desc="Diagnostic info" />
        <DisabledRow icon="📥" title="Automatic file downloads" desc="Auto file downloads" />
        <DisabledRow icon="🗣️" title="Speech" desc="Online speech recognition" />
        <DisabledRow icon="✍️" title="Inking & typing" desc="Inking & typing personalization" />
        <DisabledRow icon="📊" title="Diagnostics & feedback" desc="Diagnostic data, feedback" />
        <DisabledRow icon="🕐" title="Activity history" desc="Timeline activity" />
      </>
    )
  }

  // ====== Update & Security ======
  if (props.category === 'Update & Security') {
    return (
      <>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 24px 0', lineHeight: '36px' }}>Update & Security</h1>
        <Row icon="🔄" title="Windows Update" desc="Check for updates, history">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Check for updates</span>
        </Row>
        <Row icon="🛡️" title="Windows Security" desc="Antivirus, firewall, browser">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Open</span>
        </Row>
        <Row icon="💾" title="Backup" desc="File History, restore files">
          <ToggleSwitch on={props.backup} onToggle={props.onToggleBackup} />
        </Row>
        <Row icon="🔧" title="Troubleshoot" desc="Resolve problems">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Run</span>
        </Row>
        <Row icon="↩️" title="Recovery" desc="Reset, restore, advanced startup">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Configure</span>
        </Row>
        <Row icon="🔑" title="Activation" desc="Windows activation status">
          <span style={{ fontSize: 12, color: '#E91E63' }}>View</span>
        </Row>
        <Row icon="📍" title="Find my device" desc="Locate your device">
          <ToggleSwitch defaultOn />
        </Row>
        <Row icon="👨‍💻" title="For developers" desc="Developer mode, sideload">
          <ToggleSwitch defaultOn={false} />
        </Row>
        <Row icon="📦" title="Delivery Optimization" desc="Download from other PCs">
          <ToggleSwitch defaultOn />
        </Row>
        <Row icon="🔐" title="Device security" desc="Security processor, isolation">
          <span style={{ fontSize: 12, color: '#E91E63' }}>View</span>
        </Row>
        <Row icon="🔒" title="Device encryption" desc="BitLocker, encryption">
          <span style={{ fontSize: 12, color: '#E91E63' }}>View</span>
        </Row>
        <Row icon="🧪" title="Windows Insider Program" desc="Get preview builds">
          <span style={{ fontSize: 12, color: '#E91E63' }}>Get started</span>
        </Row>
      </>
    )
  }

  // Fallback (ไม่ควรถึง)
  return (
    <>
      <h1 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 24px 0', lineHeight: '36px' }}>{props.category}</h1>
      <div style={{ fontSize: 13, color: '#666', marginBottom: 24, lineHeight: 1.6 }}>
        This is the {props.category} settings page.
      </div>
    </>
  )
}


// ============================================================
// Notepad Content
// ============================================================
function NotepadContent({ text, onTextChange }: { text: string; onTextChange: (t: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, backgroundColor: '#fff' }}>
      {/* Menu bar */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 0,
          padding: '4px 8px', backgroundColor: '#f0f0f0',
          borderBottom: '1px solid #e5e5e5', fontSize: 12, color: '#1F1F1F',
          userSelect: 'none',
        }}
      >
        {['File', 'Edit', 'Format', 'View', 'Help'].map((m) => (
          <div
            key={m}
            style={{ padding: '4px 10px', cursor: 'default' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e5e5e5')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {m}
          </div>
        ))}
      </div>

      {/* Text area */}
      <textarea
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Type here..."
        style={{
          flex: 1, border: 'none', outline: 'none', resize: 'none',
          padding: 12, fontFamily: 'Consolas, "Courier New", monospace',
          fontSize: 14, color: '#1F1F1F', backgroundColor: '#fff',
          lineHeight: 1.5,
        }}
        autoFocus
      />
    </div>
  )
}

// ============================================================
// Calculator Content
// ============================================================
function CalculatorContent({
  data, onDataChange,
}: {
  data: { display?: string; prev?: number | null; op?: string | null; waiting?: boolean }
  onDataChange: (data: { display?: string; prev?: number | null; op?: string | null; waiting?: boolean }) => void
}) {
  const display = data.display ?? '0'
  const prev = data.prev ?? null
  const op = data.op ?? null
  const waiting = data.waiting ?? false

  const update = (next: { display?: string; prev?: number | null; op?: string | null; waiting?: boolean }) => {
    onDataChange({ ...data, ...next })
  }

  const inputDigit = (d: string) => {
    if (waiting) {
      update({ display: d, waiting: false })
    } else {
      update({ display: display === '0' ? d : display + d })
    }
  }

  const inputDot = () => {
    if (waiting) {
      update({ display: '0.', waiting: false })
    } else if (!display.includes('.')) {
      update({ display: display + '.' })
    }
  }

  const clear = () => {
    update({ display: '0', prev: null, op: null, waiting: false })
  }

  const calc = (a: number, b: number, o: string): number => {
    switch (o) {
      case '+': return a + b
      case '-': return a - b
      case '*': return a * b
      case '/': return b === 0 ? 0 : a / b
      default: return b
    }
  }

  const performOp = (nextOp: string) => {
    const cur = parseFloat(display)
    let newPrev = prev
    let newDisplay = display
    if (prev === null) {
      newPrev = cur
    } else if (op) {
      const result = calc(prev, cur, op)
      newDisplay = String(result)
      newPrev = result
    }
    // update ครั้งเดียวให้ถูกต้อง
    onDataChange({ ...data, display: newDisplay, prev: newPrev, op: nextOp, waiting: true })
  }

  const equals = () => {
    if (op !== null && prev !== null) {
      const cur = parseFloat(display)
      const result = calc(prev, cur, op)
      onDataChange({ ...data, display: String(result), prev: null, op: null, waiting: true })
    }
  }

  const btnStyle: React.CSSProperties = {
    border: '1px solid #e5e5e5', background: '#fafafa',
    fontSize: 18, color: '#1F1F1F', cursor: 'default',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background-color 0.1s', userSelect: 'none',
  }
  const opBtnStyle: React.CSSProperties = { ...btnStyle, background: '#f0f0f0', fontWeight: 500 }
  const eqBtnStyle: React.CSSProperties = { ...btnStyle, background: '#E91E63', color: '#fff' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, backgroundColor: '#f3f3f3' }}>
      {/* Display */}
      <div
        style={{
          padding: '20px 16px', textAlign: 'right',
          fontSize: 36, color: '#1F1F1F', backgroundColor: '#fff',
          borderBottom: '1px solid #e5e5e5', fontFamily: 'Segoe UI, sans-serif',
          fontWeight: 300, minHeight: 80, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
          overflow: 'hidden', userSelect: 'none',
        }}
      >
        {display}
      </div>

      {/* Buttons grid */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', gap: 1, padding: 1 }}>
        <button style={opBtnStyle} onClick={clear}>C</button>
        <button style={opBtnStyle} onClick={() => update({ display: String(-parseFloat(display)) })}>±</button>
        <button style={opBtnStyle} onClick={() => update({ display: String(parseFloat(display) / 100) })}>%</button>
        <button style={opBtnStyle} onClick={() => performOp('/')}>÷</button>

        <button style={btnStyle} onClick={() => inputDigit('7')}>7</button>
        <button style={btnStyle} onClick={() => inputDigit('8')}>8</button>
        <button style={btnStyle} onClick={() => inputDigit('9')}>9</button>
        <button style={opBtnStyle} onClick={() => performOp('*')}>×</button>

        <button style={btnStyle} onClick={() => inputDigit('4')}>4</button>
        <button style={btnStyle} onClick={() => inputDigit('5')}>5</button>
        <button style={btnStyle} onClick={() => inputDigit('6')}>6</button>
        <button style={opBtnStyle} onClick={() => performOp('-')}>−</button>

        <button style={btnStyle} onClick={() => inputDigit('1')}>1</button>
        <button style={btnStyle} onClick={() => inputDigit('2')}>2</button>
        <button style={btnStyle} onClick={() => inputDigit('3')}>3</button>
        <button style={opBtnStyle} onClick={() => performOp('+')}>+</button>

        <button style={btnStyle} onClick={() => inputDigit('0')}>0</button>
        <button style={btnStyle} onClick={inputDot}>.</button>
        <button style={eqBtnStyle} onClick={equals}>=</button>
      </div>
    </div>
  )
}

// ============================================================
// Main Page
// ============================================================
export default function Home() {
  const [wallpaper, setWallpaperState] = useState<WallpaperConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wallpaper')
      if (saved) { try { return JSON.parse(saved) } catch {} }
    }
    return DEFAULT_WALLPAPER
  })
  const setWallpaper = useCallback((wp: WallpaperConfig) => {
    setWallpaperState(wp)
    try { localStorage.setItem('wallpaper', JSON.stringify(wp)) } catch {}
  }, [])
  const [time, setTime] = useState(new Date())
  const [volume, setVolume] = useState(80)
  const [muted, setMuted] = useState(false)
  const [showVolumeSlider, setShowVolumeSlider] = useState(false)
  const [tabletMode, setTabletMode] = useState(true) // Tablet Mode 100% by default

  // Settings state (ใช้งานได้จริง)
  const [brightness, setBrightness] = useState(80)
  const [nightLight, setNightLight] = useState(false)
  const [autoTime, setAutoTime] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  // ====== Settings toggles (ใช้งานได้จริง) ======
  const [wifi, setWifi] = useState(true)
  const [bluetooth, setBluetooth] = useState(false)
  const [airplane, setAirplane] = useState(false)
  const [mobileHotspot, setMobileHotspot] = useState(false)
  const [touchpad, setTouchpad] = useState(true)
  const [typing, setTyping] = useState(true)
  const [gameBar, setGameBar] = useState(true)
  const [gameMode, setGameMode] = useState(true)
  const [magnifier, setMagnifier] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [location, setLocation] = useState(true)
  const [camera, setCamera] = useState(true)
  const [microphone, setMicrophone] = useState(true)
  const [backup, setBackup] = useState(false)

  // Windows state (window manager)
  const [windows, setWindows] = useState<Record<string, WindowState>>(() => {
    const initial: Record<string, WindowState> = {}
    APPS.forEach((app) => {
      initial[app.id] = {
        id: app.id,
        title: app.title,
        icon: app.icon,
        iconType: app.iconType,
        open: false,
        minimized: false,
        maximized: false,
        focused: false,
        position: { ...app.defaultPosition },
        size: { ...app.defaultSize },
        opening: false,
        closing: false,
        minAnim: false,
        switchIn: false,
        switchOut: false,
        switchWaiting: false,
        data: {},
      }
    })
    return initial
  })

  // Refs
  const taskbarBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number; winId: string } | null>(null)
  const resizeRef = useRef<{ startX: number; startY: number; origX: number; origY: number; origW: number; origH: number; edge: string; winId: string } | null>(null)
  // timeout refs สำหรับล้าง timeout เก่าก่อนตั้งใหม่
  const animTimeoutsRef = useRef<Set<number>>(new Set())
  const isAnimatingRef = useRef<boolean>(false)
  const volumeBtnRef = useRef<HTMLButtonElement>(null)
  const volumePanelRef = useRef<HTMLDivElement>(null)

  // helper: setTimeout ที่ track ID เพื่อล้างได้
  const setTrackedTimeout = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      animTimeoutsRef.current.delete(id)
      fn()
    }, ms)
    animTimeoutsRef.current.add(id)
    return id
  }, [])

  // helper: ล้าง timeout ทั้งหมด
  const clearAllAnimTimeouts = useCallback(() => {
    animTimeoutsRef.current.forEach((id) => clearTimeout(id))
    animTimeoutsRef.current.clear()
  }, [])

  // ====== Update window helper ======
  const updateWindow = useCallback((id: string, partial: Partial<WindowState>) => {
    setWindows((prev) => ({ ...prev, [id]: { ...prev[id], ...partial } }))
  }, [])

  // ====== Open / close / minimize / maximize ======
  const openApp = useCallback((id: string) => {
    // Lock — ถ้ากำลัง animation อยู่ ไม่รับ input
    if (isAnimatingRef.current) return
    isAnimatingRef.current = true

    const w = windows[id]
    if (!w) {
      isAnimatingRef.current = false
      return
    }

    // ล้าง animation state ที่ค้างอยู่ทั้งหมด + timeouts
    clearAllAnimTimeouts()
    setWindows((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((k) => {
        next[k] = {
          ...next[k],
          opening: false,
          closing: false,
          minAnim: false,
          switchIn: false,
          switchOut: false,
          switchWaiting: false,
        }
      })
      return next
    })

    // คำนวณว่าจะเป็น switch หรือ open ปกติ
    const otherOpenIds = (w.open && w.minimized)
      ? Object.keys(windows).filter((k) => k !== id && windows[k].open && !windows[k].minimized)
      : (!w.open)
        ? Object.keys(windows).filter((k) => k !== id && windows[k].open && !windows[k].minimized)
        : []
    const isSwitch = otherOpenIds.length > 0
    // unlock: open ปกติ 650ms, switch 950ms (300+600+50 buffer)
    setTrackedTimeout(() => { isAnimatingRef.current = false }, isSwitch ? 950 : 650)

    if (w.open && !w.minimized) {
      // เปิดอยู่ → ไม่ทำอะไร
      isAnimatingRef.current = false
      return
    } else if (w.open && w.minimized) {
      // minimized → restore + minimize แอปอื่นที่เปิดอยู่
      if (isSwitch) {
        // ====== Overlap switch ======
        setWindows((prev) => {
          const next = { ...prev }
          otherOpenIds.forEach((k) => { next[k] = { ...next[k], switchOut: true, focused: false } })
          next[id] = { ...next[id], minimized: false, switchWaiting: true, focused: true }
          return next
        })
        setTrackedTimeout(() => {
          setWindows((prev) => {
            const next = { ...prev }
            next[id] = { ...next[id], switchWaiting: false, switchIn: true }
            return next
          })
        }, SWITCH_IN_START)
        setTrackedTimeout(() => {
          setWindows((prev) => {
            const next = { ...prev }
            otherOpenIds.forEach((k) => { next[k] = { ...next[k], minimized: true, switchOut: false } })
            return next
          })
        }, D_SWITCH_OUT)
        setTrackedTimeout(() => {
          updateWindow(id, { switchIn: false })
        }, SWITCH_IN_START + D_SWITCH_IN)
      } else {
        // restore ปกติ — 600ms
        updateWindow(id, { minimized: false, opening: true, focused: true })
        setTrackedTimeout(() => updateWindow(id, { opening: false }), 600)
      }
    } else {
      // ปิด → เปิดใหม่
      if (isSwitch) {
        // ====== Overlap switch ======
        setWindows((prev) => {
          const next = { ...prev }
          otherOpenIds.forEach((k) => { next[k] = { ...next[k], switchOut: true, focused: false } })
          next[id] = { ...next[id], open: true, minimized: false, switchWaiting: true, focused: true }
          return next
        })
        setTrackedTimeout(() => {
          setWindows((prev) => {
            const next = { ...prev }
            next[id] = { ...next[id], switchWaiting: false, switchIn: true }
            return next
          })
        }, SWITCH_IN_START)
        setTrackedTimeout(() => {
          setWindows((prev) => {
            const next = { ...prev }
            otherOpenIds.forEach((k) => { next[k] = { ...next[k], minimized: true, switchOut: false } })
            return next
          })
        }, D_SWITCH_OUT)
        setTrackedTimeout(() => {
          updateWindow(id, { switchIn: false })
        }, SWITCH_IN_START + D_SWITCH_IN)
      } else {
        // Open ปกติ — 600ms
        updateWindow(id, { open: true, minimized: false, opening: true, focused: true })
        setTrackedTimeout(() => updateWindow(id, { opening: false }), 600)
      }
    }
  }, [windows, updateWindow, clearAllAnimTimeouts, setTrackedTimeout])

  const closeApp = useCallback((id: string) => {
    clearAllAnimTimeouts()
    isAnimatingRef.current = true
    // ตั้ง open: false ทันที เพื่อให้ highlight bar หายทันที
    // แต่เก็บ closing: true ไว้เพื่อเล่น close animation
    updateWindow(id, { open: false, closing: true, focused: false })
    setTrackedTimeout(() => {
      // reset state เมื่อ animation จบ
      updateWindow(id, { closing: false, data: {} })
      isAnimatingRef.current = false
    }, 600)
  }, [updateWindow, clearAllAnimTimeouts, setTrackedTimeout])

  const minimizeApp = useCallback((id: string) => {
    updateWindow(id, { minAnim: true, focused: false })
    setTrackedTimeout(() => updateWindow(id, { minimized: true, minAnim: false }), 600)
  }, [updateWindow, setTrackedTimeout])

  const maximizeApp = useCallback((id: string) => {
    setWindows((prev) => ({ ...prev, [id]: { ...prev[id], maximized: !prev[id].maximized } }))
  }, [])

  const focusApp = useCallback((id: string) => {
    setWindows((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((k) => { next[k] = { ...next[k], focused: k === id } })
      return next
    })
  }, [])

  // ====== Drag ======
  const onDragStart = useCallback((id: string, e: React.MouseEvent) => {
    const w = windows[id]
    if (!w || w.maximized || tabletMode) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: w.position.x, origY: w.position.y, winId: id }
  }, [windows, tabletMode])

  const onDragMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return
    const { startX, startY, origX, origY, winId } = dragRef.current
    const dx = e.clientX - startX
    const dy = e.clientY - startY
    updateWindow(winId, { position: { x: origX + dx, y: origY + dy } })
  }, [updateWindow])

  const onDragEnd = useCallback(() => { dragRef.current = null }, [])

  // ====== Resize ======
  const onResizeStart = useCallback((id: string, edge: string, e: React.MouseEvent) => {
    const w = windows[id]
    if (!w || w.maximized || tabletMode) return
    resizeRef.current = {
      startX: e.clientX, startY: e.clientY,
      origX: w.position.x, origY: w.position.y,
      origW: w.size.w, origH: w.size.h,
      edge, winId: id,
    }
  }, [windows, tabletMode])

  // Global mousemove/up สำหรับ resize + drag
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      // Resize
      if (resizeRef.current) {
        const r = resizeRef.current
        const dx = e.clientX - r.startX
        const dy = e.clientY - r.startY
        let newX = r.origX, newY = r.origY, newW = r.origW, newH = r.origH

        if (r.edge.includes('e')) newW = Math.max(MIN_W, r.origW + dx)
        if (r.edge.includes('s')) newH = Math.max(MIN_H, r.origH + dy)
        if (r.edge.includes('w')) {
          const maxDx = r.origW - MIN_W
          const actualDx = Math.max(-maxDx, Math.min(dx, 0))
          newX = r.origX + actualDx
          newW = r.origW - actualDx
        }
        if (r.edge.includes('n')) {
          const maxDy = r.origH - MIN_H
          const actualDy = Math.max(-maxDy, Math.min(dy, 0))
          newY = r.origY + actualDy
          newH = r.origH - actualDy
        }
        setWindows((prev) => ({ ...prev, [r.winId]: { ...prev[r.winId], position: { x: newX, y: newY }, size: { w: newW, h: newH } } }))
      }
      // Drag (ผ่าน global ด้วยเผื่อเมาส์เลื่อนเร็ว)
      if (dragRef.current) {
        const d = dragRef.current
        const dx = e.clientX - d.startX
        const dy = e.clientY - d.startY
        setWindows((prev) => ({ ...prev, [d.winId]: { ...prev[d.winId], position: { x: d.origX + dx, y: d.origY + dy } } }))
      }
    }
    const onUp = () => {
      resizeRef.current = null
      dragRef.current = null
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  // ====== Clock ======
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // ====== Mond Clock widget (draggable + localStorage + settings) ======
  const [clockPos, setClockPos] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('clockPos')
      if (saved) { try { return JSON.parse(saved) } catch {} }
    }
    return { x: 80, y: 80 }
  })
  const [clockSettings, setClockSettings] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('clockSettings')
      if (saved) { try { return JSON.parse(saved) } catch {} }
    }
    return { showDay: true, showDate: true, showTime: true, scale: 1, center: false }
  })
  const [clockMenuOpen, setClockMenuOpen] = useState(false)
  const clockDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  const updateClockSettings = (partial: Partial<typeof clockSettings>) => {
    setClockSettings((prev) => {
      const next = { ...prev, ...partial }
      localStorage.setItem('clockSettings', JSON.stringify(next))
      return next
    })
  }

  // บันทึกตำแหน่งนาฬิกาเมื่อปล่อยเมาส์
  const onClockDragEnd = useCallback(() => {
    if (clockDragRef.current) {
      clockDragRef.current = null
      localStorage.setItem('clockPos', JSON.stringify(clockPos))
    }
  }, [clockPos])

  const onClockDragStart = useCallback((e: React.MouseEvent) => {
    clockDragRef.current = { startX: e.clientX, startY: e.clientY, origX: clockPos.x, origY: clockPos.y }
  }, [clockPos])

  const onClockDragMove = useCallback((e: React.MouseEvent) => {
    if (!clockDragRef.current) return
    const dx = e.clientX - clockDragRef.current.startX
    const dy = e.clientY - clockDragRef.current.startY
    setClockPos({
      x: Math.max(0, Math.min(window.innerWidth - 300, clockDragRef.current.origX + dx)),
      y: Math.max(0, Math.min(window.innerHeight - 200, clockDragRef.current.origY + dy)),
    })
  }, [])

  // ====== Right-click: เปิด context menu บน desktop ======
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      e.preventDefault()
      // เปิด context menu เฉพาะตอนคลิกขวาบน desktop (ไม่ใช่บน window)
      const target = e.target as HTMLElement
      if (target.closest('[data-window]') || target.closest('[data-popup]')) return
      const x = Math.min(e.clientX, window.innerWidth - 230)
      const y = Math.min(e.clientY, window.innerHeight - 320)
      setContextMenu({ x, y })
    }
    document.addEventListener('contextmenu', handler)
    return () => document.removeEventListener('contextmenu', handler)
  }, [])

  // ปิด context menu เมื่อคลิกที่อื่น
  useEffect(() => {
    const onClick = () => { setContextMenu(null); setClockMenuOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setContextMenu(null); setClockMenuOpen(false) } }
    window.addEventListener('click', onClick)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('click', onClick); window.removeEventListener('keydown', onKey) }
  }, [])

  // ปิด volume flyout เมื่อคลิกที่อื่น
  useEffect(() => {
    if (!showVolumeSlider) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        volumePanelRef.current && !volumePanelRef.current.contains(target) &&
        volumeBtnRef.current && !volumeBtnRef.current.contains(target)
      ) {
        setShowVolumeSlider(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showVolumeSlider])

  // ====== Volume control ======
  const applyVolume = (vol: number, isMuted: boolean) => {
    const effective = isMuted ? 0 : vol / 100
    document.querySelectorAll('video, audio').forEach((el) => {
      const htmlEl = el as HTMLVideoElement | HTMLAudioElement
      htmlEl.volume = effective
      htmlEl.muted = isMuted
    })
  }
  const onVolumeChange = (v: number) => {
    setVolume(v); setMuted(v === 0); applyVolume(v, v === 0)
  }
  const toggleMute = () => {
    const next = !muted; setMuted(next); applyVolume(volume, next)
  }

  // ====== Time format ======
  const hh = time.getHours().toString().padStart(2, '0')
  const mm = time.getMinutes().toString().padStart(2, '0')
  const dateStr = time.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
  const timeStr = time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  // ====== Wallpaper render ======
  const renderWallpaper = () => {
    if (wallpaper.type === 'video' && wallpaper.src) {
      return (
        <video
          autoPlay loop muted playsInline src={wallpaper.src}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}
        />
      )
    }
    if (wallpaper.type === 'solid' && wallpaper.src) {
      return (
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundColor: wallpaper.src, zIndex: 0,
          }}
        />
      )
    }
    if (wallpaper.type === 'image' && wallpaper.src) {
      return (
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${wallpaper.src})`,
            backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0,
            imageRendering: 'auto',
            backgroundRepeat: 'no-repeat',
          }}
        />
      )
    }
    return (
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, #0a3d62 0%, #1e6091 30%, #3a7bd5 60%, #5b9bd5 100%)',
          zIndex: 0,
        }}
      />
    )
  }

  // ====== App icon render ======
  const renderAppIcon = (app: AppDef, size = 20) => {
    if (app.iconType === 'img') {
      return (
        <img
          src={app.icon} alt={app.title} width={size} height={size}
          style={{ objectFit: 'contain', pointerEvents: 'none', width: size, height: size }} draggable={false}
        />
      )
    }
    return <span style={{ fontSize: size }}>{app.icon}</span>
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, overflow: 'hidden', background: '#000',
        fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
        userSelect: 'none',
      }}
    >
      {/* ====== Desktop ====== */}
      <div
        style={{ position: 'absolute', inset: 0 }}
        onClick={() => {
          // คลิก desktop → unfocus ทุก window
          setWindows((prev) => {
            const next = { ...prev }
            Object.keys(next).forEach((k) => { next[k] = { ...next[k], focused: false } })
            return next
          })
        }}
      >
        {renderWallpaper()}
      </div>

      {/* ====== Windows ====== */}
      {APPS.map((app) => {
        const w = windows[app.id]
        if (!w || (!w.open && !w.closing)) return null
        return (
          <AppWindow
            key={app.id}
            state={w}
            tabletMode={tabletMode}
            taskbarBtnRef={{ current: taskbarBtnRefs.current[app.id] || null } as React.RefObject<HTMLButtonElement>}
            onMinimize={() => minimizeApp(app.id)}
            onMaximize={() => maximizeApp(app.id)}
            onClose={() => closeApp(app.id)}
            onFocus={() => focusApp(app.id)}
            onDragStart={(e) => onDragStart(app.id, e)}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onResizeStart={(edge, e) => onResizeStart(app.id, edge, e)}
            onResizeMove={() => {}}
            onResizeEnd={() => { resizeRef.current = null }}
          >
            {app.id === 'settings' && (
              <SettingsContent
                category={w.data?.category || ''}
                onCategoryChange={(c) => updateWindow(app.id, { data: { ...w.data, category: c, subPage: '' } })}
                subPage={w.data?.subPage || ''}
                onSubPageChange={(s) => updateWindow(app.id, { data: { ...w.data, subPage: s } })}
                tabletMode={tabletMode}
                onToggleTabletMode={() => setTabletMode((v) => !v)}
                wallpaper={wallpaper.src}
                onWallpaperChange={(wp, t) => setWallpaper({ type: (t as WallpaperType) || 'image', src: wp })}
                brightness={brightness}
                onBrightnessChange={setBrightness}
                volume={volume}
                onVolumeChange={onVolumeChange}
                nightLight={nightLight}
                onToggleNightLight={() => setNightLight((v) => !v)}
                autoTime={autoTime}
                onToggleAutoTime={() => setAutoTime((v) => !v)}
                darkMode={darkMode}
                onToggleDarkMode={() => setDarkMode((v) => !v)}
                wifi={wifi} onToggleWifi={() => setWifi((v) => !v)}
                bluetooth={bluetooth} onToggleBluetooth={() => setBluetooth((v) => !v)}
                airplane={airplane} onToggleAirplane={() => setAirplane((v) => !v)}
                mobileHotspot={mobileHotspot} onToggleMobileHotspot={() => setMobileHotspot((v) => !v)}
                touchpad={touchpad} onToggleTouchpad={() => setTouchpad((v) => !v)}
                typing={typing} onToggleTyping={() => setTyping((v) => !v)}
                gameBar={gameBar} onToggleGameBar={() => setGameBar((v) => !v)}
                gameMode={gameMode} onToggleGameMode={() => setGameMode((v) => !v)}
                magnifier={magnifier} onToggleMagnifier={() => setMagnifier((v) => !v)}
                highContrast={highContrast} onToggleHighContrast={() => setHighContrast((v) => !v)}
                location={location} onToggleLocation={() => setLocation((v) => !v)}
                camera={camera} onToggleCamera={() => setCamera((v) => !v)}
                microphone={microphone} onToggleMicrophone={() => setMicrophone((v) => !v)}
                backup={backup} onToggleBackup={() => setBackup((v) => !v)}
              />
            )}
            {app.id === 'notepad' && (
              <NotepadContent
                text={w.data?.text || ''}
                onTextChange={(t) => updateWindow(app.id, { data: { ...w.data, text: t } })}
              />
            )}
            {app.id === 'calculator' && (
              <CalculatorContent
                data={w.data?.calc || {}}
                onDataChange={(d) => updateWindow(app.id, { data: { ...w.data, calc: d } })}
              />
            )}
            {/* เพิ่ม content ของแอปอื่น ๆ ตรงนี้ */}
          </AppWindow>
        )
      })}

      {/* ====== Taskbar ====== */}
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, height: 45,
          backgroundColor: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: 'none', borderTop: 'none', outline: 'none', boxShadow: 'none',
          display: 'flex', alignItems: 'center', zIndex: 1000,
        }}
      >
        {/* Noise overlay 10% — เหมือน Win10 จริง (acrylic texture) */}
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: `url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
            opacity: 0.3,
            mixBlendMode: 'overlay',
            backgroundSize: '100px 100px',
            zIndex: 0,
          }}
        />
        {/* ====== LEFT: Start | Search | Task View ====== */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', flexShrink: 0, position: 'relative', zIndex: 1 }}>
          <TaskbarIconButton label="Start">
            <img
              src="/win10-start-icon.png" alt="Start" width={20} height={20}
              style={{ objectFit: 'contain', transform: 'perspective(60px) rotateY(-12deg) translateX(-1px)', pointerEvents: 'none' }}
              draggable={false}
            />
          </TaskbarIconButton>

          {/* Search box */}
          <div
            style={{
              height: '100%', width: 320,
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              border: '1px solid rgba(120, 120, 120, 0.5)',
              borderRadius: 0, display: 'flex', alignItems: 'center',
              padding: '0 12px', gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="#666" strokeWidth="2" />
              <path d="M16 16l4 4" stroke="#666" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              type="text" placeholder="Type here to search" aria-label="Search"
              style={{
                border: 'none', outline: 'none', background: 'transparent',
                fontSize: 14, flex: 1, color: '#444', fontFamily: 'inherit',
              }}
              onFocus={(e) => { e.currentTarget.parentElement.style.backgroundColor = 'rgba(255, 255, 255, 1)' }}
              onBlur={(e) => { e.currentTarget.parentElement.style.backgroundColor = 'rgba(255, 255, 255, 0.85)' }}
            />
          </div>

          {/* Task View */}
          <TaskbarIconButton label="Task View">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1F1F1F" strokeWidth="1.5" strokeLinejoin="round">
              <rect x="8" y="3" width="13" height="13" fill="none" />
              <rect x="3" y="8" width="13" height="13" fill="rgba(255,255,255,0.85)" />
              <rect x="3" y="8" width="13" height="13" fill="none" />
            </svg>
          </TaskbarIconButton>
        </div>

        {/* 4px gap */}
        <div style={{ width: 4, height: '100%', flexShrink: 0 }} />

        {/* ====== CENTER: App icons ====== */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', height: '100%', gap: 2, flexShrink: 0, position: 'relative', zIndex: 1 }}>
          {APPS.filter((a) => a.pinned).map((app) => {
            const w = windows[app.id]
            const isOpen = w?.open
            const isFocused = isOpen && w?.focused && !w?.minimized
            return (
              <TaskbarIconButton
                key={app.id}
                label={app.title}
                width={49}
                centerStyle
                buttonRef={(el) => { taskbarBtnRefs.current[app.id] = el }}
                isOpen={isOpen}
                isFocused={isFocused}
                showHighlight={w?.open}
                highlightColor="#FF4081"
                onClick={() => openApp(app.id)}
                onMiddleClick={() => {
                  // คลิกเมาส์กลาง: ถ้าเปิดอยู่ → ปิด, ถ้าปิด → เปิดใหม่
                  if (w?.open) closeApp(app.id)
                  else openApp(app.id)
                }}
                onWheel={(deltaY) => {
                  // scroll wheel: ปรับ volume (เหมือน Windows 10)
                  const delta = deltaY > 0 ? -5 : 5
                  const newVol = Math.max(0, Math.min(100, volume + delta))
                  onVolumeChange(newVol)
                }}
              >
                {renderAppIcon(app, app.iconType === 'img' ? 25 : 18)}
              </TaskbarIconButton>
            )
          })}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1, height: '100%' }} />

        {/* ====== RIGHT: Volume + Clock ====== */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', flexShrink: 0, position: 'relative', zIndex: 1 }}>
          <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
            <TaskbarIconButton
              label="Volume"
              onClick={() => setShowVolumeSlider((s) => !s)}
              buttonRef={volumeBtnRef}
              onWheel={(deltaY) => {
                const delta = deltaY > 0 ? -5 : 5
                const newVol = Math.max(0, Math.min(100, volume + delta))
                onVolumeChange(newVol)
              }}
            >
              {muted || volume === 0 ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9v6h4l5 5V4L7 9H3z" fill="#1F1F1F" />
                  <path d="M16 9l5 6M21 9l-5 6" stroke="#1F1F1F" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              ) : volume < 50 ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9v6h4l5 5V4L7 9H3z" fill="#1F1F1F" />
                  <path d="M15 9a3 3 0 010 6" stroke="#1F1F1F" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M3 9v6h4l5 5V4L7 9H3z" fill="#1F1F1F" />
                  <path d="M15 9a3 3 0 010 6M17.5 7a6 6 0 010 10" stroke="#1F1F1F" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                </svg>
              )}
            </TaskbarIconButton>

            {showVolumeSlider && (
              <div
                ref={volumePanelRef}
                onWheel={(e) => {
                  const delta = e.deltaY > 0 ? -5 : 5
                  const newVol = Math.max(0, Math.min(100, volume + delta))
                  onVolumeChange(newVol)
                }}
                style={{
                  position: 'fixed',
                  right: 0,
                  bottom: 45, // ติด taskbar (ความสูง taskbar = 45)
                  width: 400,
                  height: 100,
                  backgroundColor: '#f3f3f3',
                  border: '1px solid rgba(0, 0, 0, 0.12)',
                  borderRight: 'none',
                  borderBottom: 'none',
                  borderRadius: 0,
                  boxShadow: '-3px 0 10px rgba(0, 0, 0, 0.18), 0 -3px 10px rgba(0, 0, 0, 0.18)',
                  zIndex: 999, // อยู่หลัง taskbar (taskbar = 1000)
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: '0 20px',
                  gap: 14,
                  animation: 'volumeFlyoutIn 500ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {/* Speaker icon at left — click to mute */}
                <button
                  onClick={toggleMute}
                  aria-label={muted ? 'Unmute' : 'Mute'}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {muted || volume === 0 ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M3 9v6h4l5 5V4L7 9H3z" fill="#1F1F1F" />
                      <path d="M16 9l5 6M21 9l-5 6" stroke="#1F1F1F" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  ) : volume < 50 ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M3 9v6h4l5 5V4L7 9H3z" fill="#1F1F1F" />
                      <path d="M15 9a3 3 0 010 6" stroke="#1F1F1F" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M3 9v6h4l5 5V4L7 9H3z" fill="#1F1F1F" />
                      <path d="M15 9a3 3 0 010 6M17.5 7a6 6 0 010 10" stroke="#1F1F1F" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                    </svg>
                  )}
                </button>

                {/* Horizontal slider */}
                <input
                  type="range"
                  min={0} max={100}
                  value={muted ? 0 : volume}
                  onChange={(e) => onVolumeChange(Number(e.target.value))}
                  aria-label="Volume level"
                  style={{
                    flex: 1,
                    width: '100%',
                    height: 4,
                    accentColor: '#E91E63',
                    cursor: 'pointer',
                  }}
                />

                {/* Volume percentage text at right */}
                <div style={{
                  fontSize: 12,
                  color: '#1F1F1F',
                  fontWeight: 500,
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: 36,
                  textAlign: 'right',
                  flexShrink: 0,
                }}>
                  {muted ? '0%' : `${volume}%`}
                </div>
              </div>
            )}
          </div>

          {/* Clock */}
          <div
            style={{
              height: 45, display: 'flex', alignItems: 'center', padding: '0 12px',
              color: '#1F1F1F', fontSize: 12, userSelect: 'none', cursor: 'default',
              textAlign: 'right', lineHeight: 1.25,
            }}
          >
            <div>
              <div>{dateStr}</div>
              <div>{timeStr}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ====== Mond Clock Widget (draggable on desktop) ====== */}
      <div
        onMouseDown={onClockDragStart}
        onMouseMove={onClockDragMove}
        onMouseUp={onClockDragEnd}
        onMouseLeave={onClockDragEnd}
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); setClockMenuOpen(true) }}
        style={{
          position: 'absolute',
          left: clockSettings.center ? '50%' : clockPos.x,
          top: clockSettings.center ? '50%' : clockPos.y,
          transform: clockSettings.center ? 'translate(-50%, -50%)' : 'none',
          zIndex: 50, cursor: 'grab', userSelect: 'none',
          textAlign: 'center', pointerEvents: 'auto',
        }}
      >
        {clockSettings.showDay && (
          <div style={{
            fontFamily: 'Anurati, "Segoe UI", sans-serif',
            fontSize: 32 * clockSettings.scale, fontWeight: 400,
            color: '#fff', letterSpacing: 10 * clockSettings.scale,
            marginBottom: 2,
          }}>
            {time.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}
          </div>
        )}
        {clockSettings.showDate && (
          <div style={{
            fontFamily: 'Quicksand, "Segoe UI", sans-serif',
            fontSize: 14 * clockSettings.scale, fontWeight: 400,
            color: '#fff', marginBottom: 4,
          }}>
            {time.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        )}
        {clockSettings.showTime && (
          <div style={{
            fontFamily: 'Quicksand, "Segoe UI", sans-serif',
            fontSize: 42 * clockSettings.scale, fontWeight: 600,
            color: '#fff', lineHeight: 1,
          }}>
            {timeStr}
          </div>
        )}
      </div>

      {/* ====== Clock Settings Menu ====== */}
      {clockMenuOpen && (
        <div
          data-popup="clock-menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', left: clockPos.x, top: clockPos.y + 100,
            width: 220, backgroundColor: 'rgba(243, 243, 243, 0.98)',
            border: '1px solid rgba(0, 0, 0, 0.15)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            padding: 16, zIndex: 3500,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#323130' }}>Clock Settings</div>

          {/* Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#323130', cursor: 'pointer' }}>
              <input type="checkbox" checked={clockSettings.showDay} onChange={(e) => updateClockSettings({ showDay: e.target.checked })} style={{ accentColor: '#E91E63' }} />
              Show day
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#323130', cursor: 'pointer' }}>
              <input type="checkbox" checked={clockSettings.showDate} onChange={(e) => updateClockSettings({ showDate: e.target.checked })} style={{ accentColor: '#E91E63' }} />
              Show date
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#323130', cursor: 'pointer' }}>
              <input type="checkbox" checked={clockSettings.showTime} onChange={(e) => updateClockSettings({ showTime: e.target.checked })} style={{ accentColor: '#E91E63' }} />
              Show time
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#323130', cursor: 'pointer' }}>
              <input type="checkbox" checked={clockSettings.center} onChange={(e) => updateClockSettings({ center: e.target.checked })} style={{ accentColor: '#E91E63' }} />
              Center on screen
            </label>
          </div>

          {/* Size slider */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: '#323130', marginBottom: 4 }}>Size: {Math.round(clockSettings.scale * 100)}%</div>
            <input
              type="range" min={0.5} max={2} step={0.1} value={clockSettings.scale}
              onChange={(e) => updateClockSettings({ scale: Number(e.target.value) })}
              style={{ width: '100%', accentColor: '#E91E63' }}
            />
          </div>

          {/* Close */}
          <button onClick={() => setClockMenuOpen(false)} style={{ width: '100%', padding: '6px', fontSize: 13, border: '1px solid #ccc', backgroundColor: '#fff', cursor: 'pointer', borderRadius: 4 }}>
            Close
          </button>
        </div>
      )}

      {/* ====== Desktop right-click context menu ====== */}
      {contextMenu && (
        <div
          data-popup="context-menu"
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', left: contextMenu.x, top: contextMenu.y,
            minWidth: 220, backgroundColor: 'rgba(243, 243, 243, 0.98)',
            border: '1px solid rgba(0, 0, 0, 0.15)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
            padding: '4px 0', zIndex: 3000,
          }}
        >
          <div onClick={() => { setContextMenu(null) }} style={{ padding: '8px 16px', fontSize: 13, cursor: 'default', color: '#323130' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
            View ›
          </div>
          <div onClick={() => { setContextMenu(null) }} style={{ padding: '8px 16px', fontSize: 13, cursor: 'default', color: '#323130' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
            Sort by ›
          </div>
          <div onClick={() => { setContextMenu(null) }} style={{ padding: '8px 16px', fontSize: 13, cursor: 'default', color: '#323130' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
            Refresh
          </div>
          <div style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.08)', margin: '4px 0' }} />
          <div onClick={() => { setContextMenu(null); openApp('settings'); /* TODO: set category=Personalization, subPage=Background */ }} style={{ padding: '8px 16px', fontSize: 13, cursor: 'default', color: '#323130' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
            Change background
          </div>
          <div style={{ height: 1, backgroundColor: 'rgba(0,0,0,0.08)', margin: '4px 0' }} />
          <div onClick={() => { setContextMenu(null); openApp('settings') }} style={{ padding: '8px 16px', fontSize: 13, cursor: 'default', color: '#323130' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
            Display settings
          </div>
          <div onClick={() => { setContextMenu(null); openApp('settings') }} style={{ padding: '8px 16px', fontSize: 13, cursor: 'default', color: '#323130' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
            Personalize
          </div>
        </div>
      )}

      {/* ====== Styles ====== */}
      <style>{`
        @keyframes settingsIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes settingsSwitch {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes volumeFlyoutIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        input[aria-label="Search"]::placeholder { color: #555; }
        /* ปิด text selection ทั้งหน้า ยกเว้น input/textarea */
        * { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }
        input, textarea { -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text; }
      `}</style>
    </div>
  )
}
