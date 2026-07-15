import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()
  // Image 1 = real Win10 (the Display page one)
  const real = fs.readFileSync('/home/z/my-project/upload/Screenshot 2026-07-15 090755.png').toString('base64')
  // Image 2 = my current implementation
  const mine = fs.readFileSync('/home/z/my-project/download/settings-pink-v2.png').toString('base64')

  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: `Compare these 2 images PIXEL BY PIXEL. Image 1 = REAL Win10 Settings. Image 2 = MY clone.

For EACH area below, give me EXACT pixel values or color hex for BOTH images:

1. TITLE BAR: height (px), bg color, border bottom?
2. HEADER AREA: height, bg color, what's left/center/right, back button size?
3. BREADCRUMB: font size, color, separator style
4. SIDEBAR: width (px), bg color, search bar height + border, Home item padding, category item padding, sub-item padding (indent), selected item style (border, bg, text weight)
5. CONTENT: bg color, padding (top/right/bottom/left), title font size + weight + color, section title size, row height, row border, label font size, description font size + color
6. SLIDER: track height, thumb size + color, accent color
7. TOGGLE: width, height, on color, off color, knob size
8. WINDOW: border width + color, shadow, corner radius

Output as a table: Area | Real | Mine | Match?` },
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
