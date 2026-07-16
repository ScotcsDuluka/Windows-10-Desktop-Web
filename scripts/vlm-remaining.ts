import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()
  const real = fs.readFileSync('/home/z/my-project/upload/Screenshot 2026-07-15 090755.png').toString('base64')
  const mine = fs.readFileSync('/home/z/my-project/download/settings-final-v2.png').toString('base64')

  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: `Image 1 = REAL Win10 Settings. Image 2 = MY clone. 

List ONLY the remaining differences that still need fixing. Skip anything that already matches. Be specific with exact values.

Focus on:
- Colors (exact hex)
- Sizes (exact px)
- Spacing/padding
- Missing elements
- Layout structure
- Text content

Format: "FIX: [area] — real has X, mine has Y, should be Z"` },
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
