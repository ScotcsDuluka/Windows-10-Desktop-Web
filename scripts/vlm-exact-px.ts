import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()
  const real = fs.readFileSync('/home/z/my-project/upload/Screenshot 2026-07-15 095129.png').toString('base64')
  const mine = fs.readFileSync('/home/z/my-project/download/mine-1366-v2.png').toString('base64')

  // Ask VLM to measure EXACT pixel positions of elements in both images
  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: `Both images are 1366x768. Image 1 = REAL Win10. Image 2 = MINE.

I need EXACT pixel measurements. For each element below, estimate the pixel value in BOTH images:

ELEMENT | REAL (px) | MINE (px) | DIFF
---|---|---|---
Window height | ? | ? | 
Title bar height | ? | ? |
Header height (back+breadcrumb) | ? | ? |
Sidebar width | ? | ? |
Sidebar item height | ? | ? |
Search bar height | ? | ? |
Search bar to Home gap | ? | ? |
Home to Category gap | ? | ? |
Category to first sub-item gap | ? | ? |
Sub-item height | ? | ? |
Content left padding | ? | ? |
Content top padding | ? | ? |
Title font size | ? | ? |
Title to first section gap | ? | ? |
Section header font size | ? | ? |
Section header to content gap | ? | ? |
Row height | ? | ? |
Row border-bottom | ? | ? |
Slider width | ? | ? |
Slider to checkbox gap | ? | ? |
Checkbox to night light gap | ? | ? |
Night light row height | ? | ? |
Between sections gap | ? | ? |
Help section padding | ? | ? |
Taskbar height | ? | ? |

Fill in EVERY value. If you can't see it, write "N/A".` },
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
