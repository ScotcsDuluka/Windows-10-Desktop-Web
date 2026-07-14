# Windows 10 Desktop (Web Edition)

Windows 10 desktop simulation built with Next.js 16, TypeScript, Tailwind CSS.

## Features

- Desktop with wallpaper (image/video)
- Taskbar (45px) with blur + noise effect
- Start button, Search box, Task View, App icons, Volume, Clock
- Window Manager (multi-app support)
- Apps:
  - Settings (Win10 style, 12 categories)
  - Notepad (text editor, persistent state)
  - Calculator (working calc, persistent state)
- Animations:
  - Open: zoom 80→100% + fade 0→100% (500ms)
  - Close: zoom 100→95% + fade 100→0% (500ms)
  - Switch: crossfade between apps
- Tablet Mode (default on) — all windows maximized
- Middle click on taskbar app → close
- Scroll wheel on taskbar app → adjust volume
- Right-click + text selection blocked

## Tech Stack

- Next.js 16 (App Router)
- TypeScript 5
- Tailwind CSS 4
- React 18

## Install

```bash
bun install
bun run dev
```

Open http://localhost:3000

## Deploy

### Vercel (recommended)
1. Push to GitHub
2. Import repo on Vercel
3. Auto deploy

### Manual
```bash
bun run build
bun run start
```
