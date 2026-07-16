import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()
  const real = fs.readFileSync('/home/z/my-project/upload/Screenshot 2026-07-15 090755.png').toString('base64')
  const mine = fs.readFileSync('/home/z/my-project/download/for-user-display.png').toString('base64')

  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: `Image 1 = REAL Win10. Image 2 = MINE.

Focus ONLY on SPACING. Compare every gap, padding, margin between the two images.

For each spacing issue, give me:
- Where: [specific area]
- Real: [approx px]
- Mine: [approx px]  
- Fix: [what to change]

Check:
- Title to first section gap
- Section title to content gap
- Between rows gap
- Sidebar item height/padding
- Search bar to first item gap
- Content left padding
- Content top padding
- Between sections gap
- Slider to checkbox gap
- Row internal padding

Be EXHAUSTIVE on spacing only.` },
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
