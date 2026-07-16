import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()
  const real = fs.readFileSync('/home/z/my-project/upload/Screenshot 2026-07-15 090755.png').toString('base64')
  const mine = fs.readFileSync('/home/z/my-project/download/settings-latest.png').toString('base64')

  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: `Image 1 = REAL Win10 Settings (Display page). Image 2 = MY clone.

List EVERY visual difference you can see, no matter how small. Format:
- Area: Real does X, Mine does Y, FIX: Z

Check ALL of these:
- Title bar color, height, border
- Window border, shadow, corner
- Header: back button size, breadcrumb text/separator
- Sidebar: width, bg color, search bar style, Home item, category item, sub-items indent, selected item style
- Content: bg, padding, title size/color, section headers, rows, sliders, toggles
- Fonts: family, sizes, weights, colors
- Spacing: gaps between everything
- Icons: size, color, style
- Any missing elements

Be EXHAUSTIVE. I want to fix everything.` },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${real}` } },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${mine}` } },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  })
  console.log(response.choices[0]?.message?.content)
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
