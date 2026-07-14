'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ============================================================
// Windows 10 Desktop — Window Manager Edition
// ============================================================

// ---------- Types ----------
type WallpaperType = 'image' | 'video'
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
const DEFAULT_WALLPAPER: WallpaperConfig = { type: 'image', src: '/win10-wallpaper.jpg' }

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
    icon: '📝',
    iconType: 'emoji',
    defaultSize: { w: 500, h: 400 },
    defaultPosition: { x: 200, y: 120 },
    pinned: true,
  },
  {
    id: 'calculator',
    title: 'Calculator',
    icon: '🧮',
    iconType: 'emoji',
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
      style={{
        position: 'absolute', left: winLeft, top: winTop,
        width: winWidth, height: winHeight, zIndex: 500,
        backgroundColor: '#f3f3f3', border: '1px solid #ccc',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.25)',
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
      {/* ====== Title Bar ====== */}
      <div
        style={{
          height: 32, backgroundColor: '#f0f0f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 0 0 12px', flexShrink: 0,
          borderBottom: '1px solid #e5e5e5', cursor: 'default',
          userSelect: 'none',
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
          >
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1,1 L9,9 M9,1 L1,9" stroke="currentColor" strokeWidth="1.2" /></svg>
          </button>
        </div>
      </div>

      {/* ====== Body ====== */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', userSelect: 'none' }}>
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
  { id: 'System', icon: '🖥️' },
  { id: 'Devices', icon: '🖱️' },
  { id: 'Phone', icon: '📱' },
  { id: 'Network & Internet', icon: '🌐' },
  { id: 'Personalization', icon: '🎨' },
  { id: 'Apps', icon: '📦' },
  { id: 'Accounts', icon: '👤' },
  { id: 'Time & Language', icon: '🕐' },
  { id: 'Gaming', icon: '🎮' },
  { id: 'Ease of Access', icon: '♿' },
  { id: 'Privacy', icon: '🔒' },
  { id: 'Update & Security', icon: '🔄' },
]

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
        width: 40, height: 20,
        backgroundColor: current ? '#0078D7' : '#ccc',
        borderRadius: 10, position: 'relative', cursor: 'default',
        transition: 'background-color 0.2s',
      }}
    >
      <div
        style={{
          position: 'absolute', top: 3, left: current ? 23 : 3,
          width: 14, height: 14, backgroundColor: '#fff', borderRadius: '50%',
          transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}
      />
    </div>
  )
}

function SettingsContent({
  category, onCategoryChange, tabletMode, onToggleTabletMode,
  wallpaper, onWallpaperChange, brightness, onBrightnessChange,
  volume, onVolumeChange, nightLight, onToggleNightLight,
  autoTime, onToggleAutoTime, darkMode, onToggleDarkMode,
}: {
  category: string
  onCategoryChange: (c: string) => void
  tabletMode: boolean
  onToggleTabletMode: () => void
  wallpaper: string
  onWallpaperChange: (w: string) => void
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
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, backgroundColor: '#f3f3f3' }}>
      {/* ====== Header (Win10 style) ====== */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '14px 24px', backgroundColor: '#f3f3f3',
          borderBottom: '1px solid #e5e5e5', flexShrink: 0,
        }}
      >
        {/* User profile circle */}
        <div
          style={{
            width: 40, height: 40, borderRadius: '50%',
            backgroundColor: '#0078D7', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 500, userSelect: 'none',
          }}
        >
          U
        </div>
        <div style={{ fontSize: 13, color: '#1F1F1F' }}>
          <div style={{ fontWeight: 500 }}>User</div>
          <div style={{ color: '#666', fontSize: 11 }}>user@windows10.local</div>
        </div>
        {/* Search box */}
        <div
          style={{
            marginLeft: 'auto', height: 32, width: 280,
            backgroundColor: '#fff', border: '1px solid #ccc',
            display: 'flex', alignItems: 'center', padding: '0 10px', gap: 8,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#666" strokeWidth="2" />
            <path d="M16 16l4 4" stroke="#666" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            placeholder="Find a setting"
            style={{
              border: 'none', outline: 'none', background: 'transparent',
              fontSize: 12, flex: 1, color: '#1F1F1F', fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* ====== Body: Sidebar + Content ====== */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <div
          style={{
            width: 240, backgroundColor: '#f3f3f3',
            borderRight: '1px solid #e5e5e5', padding: '8px 0',
            overflowY: 'auto', color: '#1F1F1F', fontSize: 13, userSelect: 'none',
          }}
        >
          {SETTINGS_CATEGORIES.map((c) => (
            <div
              key={c.id}
              onClick={() => onCategoryChange(c.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 16px', cursor: 'default',
                backgroundColor: category === c.id ? '#cce4f7' : 'transparent',
                borderLeft: category === c.id ? '3px solid #0078D7' : '3px solid transparent',
                transition: 'background-color 0.1s',
              }}
              onMouseEnter={(e) => { if (category !== c.id) e.currentTarget.style.backgroundColor = '#eaeaea' }}
              onMouseLeave={(e) => { if (category !== c.id) e.currentTarget.style.backgroundColor = 'transparent' }}
            >
              <span style={{ fontSize: 16 }}>{c.icon}</span>
              <span>{c.id}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1, backgroundColor: '#fff', padding: '24px 32px',
            overflowY: 'auto', color: '#1F1F1F', userSelect: 'none',
          }}
        >
          <SettingsPage
            category={category}
            tabletMode={tabletMode}
            onToggleTabletMode={onToggleTabletMode}
            wallpaper={wallpaper}
            onWallpaperChange={onWallpaperChange}
            brightness={brightness}
            onBrightnessChange={onBrightnessChange}
            volume={volume}
            onVolumeChange={onVolumeChange}
            nightLight={nightLight}
            onToggleNightLight={onToggleNightLight}
            autoTime={autoTime}
            onToggleAutoTime={onToggleAutoTime}
            darkMode={darkMode}
            onToggleDarkMode={onToggleDarkMode}
          />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Settings Page (แต่ละหมวด)
// ============================================================
function SettingsPage(props: {
  category: string
  tabletMode: boolean
  onToggleTabletMode: () => void
  wallpaper: string
  onWallpaperChange: (w: string) => void
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
}) {
  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 0', borderBottom: '1px solid #eee',
  }
  const titleStyle: React.CSSProperties = { fontSize: 14, fontWeight: 500, marginBottom: 2 }
  const descStyle: React.CSSProperties = { fontSize: 12, color: '#777' }
  const iconBoxStyle: React.CSSProperties = {
    width: 32, height: 32, backgroundColor: '#f0f0f0', borderRadius: 4,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 16, flexShrink: 0,
  }

  const Row = ({ icon, title, desc, children }: { icon: string; title: string; desc: string; children?: React.ReactNode }) => (
    <div style={rowStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
        <div style={iconBoxStyle}>{icon}</div>
        <div>
          <div style={titleStyle}>{title}</div>
          <div style={descStyle}>{desc}</div>
        </div>
      </div>
      {children}
    </div>
  )

  if (props.category === 'System') {
    return (
      <>
        <h1 style={{ fontSize: 24, fontWeight: 400, margin: '0 0 24px 0' }}>System</h1>
        <Row icon="🖥️" title="Display" desc="Monitors, brightness, night light, display profile">
          <span style={{ fontSize: 12, color: '#0078D7' }}>Configure</span>
        </Row>
        <Row icon="🔊" title="Sound" desc="Volume levels, output, input, sound devices">
          <span style={{ fontSize: 12, color: '#0078D7' }}>Configure</span>
        </Row>
        <Row icon="🔔" title="Notifications & actions" desc="Notifications, quick actions">
          <ToggleSwitch />
        </Row>
        <Row icon="🔋" title="Power & sleep" desc="Sleep, screen, power mode">
          <span style={{ fontSize: 12, color: '#0078D7' }}>Configure</span>
        </Row>
        <Row icon="💾" title="Storage" desc="Storage space, drives, configuration rules">
          <span style={{ fontSize: 12, color: '#0078D7' }}>Configure</span>
        </Row>
        <Row icon="🪟" title="Multitasking" desc="Snap windows, virtual desktops, Task view">
          <ToggleSwitch defaultOn />
        </Row>
        <Row icon="📱" title="Tablet mode" desc="Make Windows more touch-friendly">
          <ToggleSwitch on={props.tabletMode} onToggle={props.onToggleTabletMode} />
        </Row>
        <Row icon="ℹ️" title="About" desc="Device specifications, Windows specifications">
          <span style={{ fontSize: 12, color: '#0078D7' }}>View</span>
        </Row>
      </>
    )
  }

  if (props.category === 'Personalization') {
    return (
      <>
        <h1 style={{ fontSize: 24, fontWeight: 400, margin: '0 0 24px 0' }}>Personalization</h1>
        <Row icon="🖼️" title="Background" desc="Picture, solid color, slideshow">
          <span style={{ fontSize: 12, color: '#0078D7' }}>Browse</span>
        </Row>
        <Row icon="🎨" title="Colors" desc="Light, dark, accent color">
          <ToggleSwitch on={props.darkMode} onToggle={props.onToggleDarkMode} />
        </Row>
        <Row icon="🔒" title="Lock screen" desc="Background, status, screen timeout">
          <span style={{ fontSize: 12, color: '#0078D7' }}>Configure</span>
        </Row>
        <Row icon="🎭" title="Themes" desc="Install, save, switch">
          <span style={{ fontSize: 12, color: '#0078D7' }}>Browse</span>
        </Row>
        <Row icon="🚀" title="Start" desc="Layout, folders, recent apps">
          <ToggleSwitch defaultOn />
        </Row>
      </>
    )
  }

  if (props.category === 'Time & Language') {
    return (
      <>
        <h1 style={{ fontSize: 24, fontWeight: 400, margin: '0 0 24px 0' }}>Time & Language</h1>
        <Row icon="🕐" title="Date & time" desc="Time zone, automatic time">
          <ToggleSwitch on={props.autoTime} onToggle={props.onToggleAutoTime} />
        </Row>
        <Row icon="🌍" title="Region" desc="Country, regional format">
          <span style={{ fontSize: 12, color: '#0078D7' }}>Configure</span>
        </Row>
        <Row icon="🗣️" title="Language" desc="Display, preferred languages">
          <span style={{ fontSize: 12, color: '#0078D7' }}>Add</span>
        </Row>
        <Row icon="🎤" title="Speech" desc="Microphone, voice packages">
          <span style={{ fontSize: 12, color: '#0078D7' }}>Configure</span>
        </Row>
      </>
    )
  }

  // Default: หมวดอื่น ๆ (UI เฉย ๆ)
  return (
    <>
      <h1 style={{ fontSize: 24, fontWeight: 400, margin: '0 0 24px 0' }}>{props.category}</h1>
      <div style={{ fontSize: 13, color: '#666', marginBottom: 24, lineHeight: 1.6 }}>
        This is the {props.category} settings page.
      </div>
      {(SETTING_ROWS[props.category] || []).map((row, i) => (
        <Row key={i} icon="⚙️" title={row.title} desc={row.desc}>
          {row.type === 'toggle' ? <ToggleSwitch defaultOn={row.defaultOn} /> : <span style={{ fontSize: 12, color: '#0078D7' }}>{row.action || 'Configure'}</span>}
        </Row>
      ))}
    </>
  )
}

const SETTING_ROWS: Record<string, { title: string; desc: string; type?: 'toggle'; defaultOn?: boolean; action?: string }[]> = {
  Devices: [
    { title: 'Bluetooth & other devices', desc: 'Mouse, keyboard, pen, audio', action: 'Add' },
    { title: 'Printers & scanners', desc: 'Printers, scanners, fax', action: 'Add' },
    { title: 'Mouse', desc: 'Buttons, wheel, pointer', action: 'Configure' },
    { title: 'Touchpad', desc: 'Gestures, sensitivity', type: 'toggle', defaultOn: true },
    { title: 'Typing', desc: 'Autocorrect, suggestions', type: 'toggle', defaultOn: true },
  ],
  Phone: [
    { title: 'Your Phone', desc: 'Link your Android, iPhone', action: 'Add' },
  ],
  'Network & Internet': [
    { title: 'Wi-Fi', desc: 'Connect, manage networks', type: 'toggle', defaultOn: true },
    { title: 'Ethernet', desc: 'Authentication, IP, DNS', action: 'Configure' },
    { title: 'VPN', desc: 'Add, connect, manage', action: 'Add' },
    { title: 'Mobile hotspot', desc: 'Share connection', type: 'toggle', defaultOn: false },
    { title: 'Airplane mode', desc: 'Stop wireless communication', type: 'toggle', defaultOn: false },
  ],
  Apps: [
    { title: 'Apps & features', desc: 'Uninstall, defaults', action: 'Manage' },
    { title: 'Default apps', desc: 'Defaults for email, maps', action: 'Configure' },
    { title: 'Optional features', desc: 'Install, uninstall', action: 'Add' },
    { title: 'Startup', desc: 'Apps that start automatically', type: 'toggle', defaultOn: false },
  ],
  Accounts: [
    { title: 'Your info', desc: 'Account name, picture', action: 'Manage' },
    { title: 'Email & accounts', desc: 'Email, calendar, contacts', action: 'Add' },
    { title: 'Sign-in options', desc: 'Windows Hello, password, PIN', action: 'Configure' },
    { title: 'Family & other users', desc: 'Add, remove accounts', action: 'Add' },
  ],
  Gaming: [
    { title: 'Game bar', desc: 'Open, capture, broadcast', type: 'toggle', defaultOn: true },
    { title: 'Captures', desc: 'Recording, audio quality', action: 'Configure' },
    { title: 'Game Mode', desc: 'Optimize PC for play', type: 'toggle', defaultOn: true },
  ],
  'Ease of Access': [
    { title: 'Display', desc: 'Text size, zoom', action: 'Configure' },
    { title: 'Cursor & pointer', desc: 'Size, color, thickness', action: 'Configure' },
    { title: 'Magnifier', desc: 'Zoom part of screen', type: 'toggle', defaultOn: false },
    { title: 'High contrast', desc: 'Theme for readability', type: 'toggle', defaultOn: false },
  ],
  Privacy: [
    { title: 'General', desc: 'General privacy settings', type: 'toggle', defaultOn: false },
    { title: 'Location', desc: 'App access to location', type: 'toggle', defaultOn: true },
    { title: 'Camera', desc: 'App access to camera', type: 'toggle', defaultOn: true },
    { title: 'Microphone', desc: 'App access to microphone', type: 'toggle', defaultOn: true },
  ],
  'Update & Security': [
    { title: 'Windows Update', desc: 'Check for updates', action: 'Check' },
    { title: 'Windows Security', desc: 'Antivirus, firewall', action: 'Open' },
    { title: 'Backup', desc: 'File History, restore', type: 'toggle', defaultOn: false },
    { title: 'Troubleshoot', desc: 'Resolve problems', action: 'Run' },
    { title: 'Recovery', desc: 'Reset, restore, advanced startup', action: 'Configure' },
  ],
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
  const eqBtnStyle: React.CSSProperties = { ...btnStyle, background: '#0078D7', color: '#fff' }

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
  const [wallpaper, setWallpaper] = useState<WallpaperConfig>(DEFAULT_WALLPAPER)
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
    updateWindow(id, { closing: true, focused: false })
    setTrackedTimeout(() => {
      // reset state เมื่อปิดแอป (data หายไป กลับเป็นค่า default)
      updateWindow(id, { open: false, closing: false, data: {} })
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

  // ====== Block right-click ======
  useEffect(() => {
    const handler = (e: MouseEvent) => { e.preventDefault(); return false }
    document.addEventListener('contextmenu', handler)
    return () => document.removeEventListener('contextmenu', handler)
  }, [])

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
  const dateStr = time.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })

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
    if (wallpaper.type === 'image' && wallpaper.src) {
      return (
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${wallpaper.src})`,
            backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 0,
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
          style={{ objectFit: 'contain', pointerEvents: 'none' }} draggable={false}
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
        if (!w || !w.open) return null
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
                category={w.data?.category || 'System'}
                onCategoryChange={(c) => updateWindow(app.id, { data: { ...w.data, category: c } })}
                tabletMode={tabletMode}
                onToggleTabletMode={() => setTabletMode((v) => !v)}
                wallpaper={wallpaper.src}
                onWallpaperChange={(wp) => setWallpaper({ type: 'image', src: wp })}
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
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundBlendMode: 'overlay',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: 'none', borderTop: 'none', outline: 'none', boxShadow: 'none',
          display: 'flex', alignItems: 'center', zIndex: 1000,
        }}
      >
        {/* ====== LEFT: Start | Search | Task View ====== */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', flexShrink: 0 }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', height: '100%', gap: 2, flexShrink: 0 }}>
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
                {renderAppIcon(app, 20)}
              </TaskbarIconButton>
            )
          })}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1, height: '100%' }} />

        {/* ====== RIGHT: Volume + Clock ====== */}
        <div style={{ display: 'flex', alignItems: 'center', height: '100%', flexShrink: 0 }}>
          <div
            style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <TaskbarIconButton label="Volume" onClick={toggleMute}>
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
                style={{
                  position: 'absolute', bottom: 52, right: 0,
                  backgroundColor: 'rgba(243, 243, 243, 0.95)',
                  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(0, 0, 0, 0.15)', borderRadius: 0,
                  padding: '12px 10px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  zIndex: 1001, animation: 'fadeInUp 0.18s ease-out',
                }}
              >
                <div style={{ fontSize: 11, color: '#666', fontWeight: 500 }}>{muted ? 'Muted' : `${volume}%`}</div>
                <input
                  type="range" min={0} max={100} value={muted ? 0 : volume}
                  onChange={(e) => onVolumeChange(Number(e.target.value))}
                  style={{ writingMode: 'vertical-lr' as any, direction: 'rtl', width: 8, height: 100, cursor: 'default', accentColor: '#0078D7' }}
                  aria-label="Volume level"
                />
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
              <div>{hh}:{mm}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ====== Styles ====== */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(4px); }
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
