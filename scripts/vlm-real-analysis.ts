import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()
  const img1 = fs.readFileSync('/home/z/my-project/upload/Screenshot 2026-07-15 090706.png').toString('base64')
  const img2 = fs.readFileSync('/home/z/my-project/upload/Screenshot 2026-07-15 090755.png').toString('base64')

  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'These are 2 real Windows 10 screenshots. Describe EXTREMELY detailed for reproduction:\n\nFor EACH image:\n1. What page is this? (Home? System? Display?)\n2. Title bar — height, color, any buttons\n3. Header — what elements, where (left/center/right), profile?\n4. Sidebar — width estimate, items, selected style (color, border)\n5. Content — title size, row layout, spacing, toggles/sliders\n6. Background color (exact hex if possible)\n7. Border style\n8. Any transparency/blur?\n9. Font sizes (estimate)\n10. Icon colors\n\nBe VERY specific with colors, sizes, spacing.' },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${img1}` } },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${img2}` } },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  })
  console.log(response.choices[0]?.message?.content)
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
