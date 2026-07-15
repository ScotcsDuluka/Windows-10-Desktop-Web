import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()
  const real = fs.readFileSync('/home/z/my-project/upload/Screenshot 2026-07-15 090755.png').toString('base64')
  const mine = fs.readFileSync('/home/z/my-project/download/settings-vlm-40.png').toString('base64')

  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: `Image 1 = REAL Win10 Settings. Image 2 = MY clone.

Rate how similar mine is to real on a scale of 0-100%. Then list EVERY single remaining difference with exact fix needed.

Be brutally honest. I want 100% match.

Format:
Overall match: X%
Then list each fix as:
1. [area] — real: X / mine: Y / fix to: Z
2. ...` },
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
