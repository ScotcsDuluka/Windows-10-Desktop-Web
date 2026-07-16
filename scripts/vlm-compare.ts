import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()
  const real = fs.readFileSync('/home/z/my-project/upload/pasted_image_1784066620215.png').toString('base64')
  const current = fs.readFileSync('/home/z/my-project/download/settings-home-v4.png').toString('base64')

  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Compare two Windows 10 Settings home pages. First image = REAL Windows 10. Second image = my implementation. List SPECIFIC visual differences: header, search bar, tiles, colors, footer, spacing. Be concise.' },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${real}` } },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${current}` } },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  })
  console.log(response.choices[0]?.message?.content)
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
