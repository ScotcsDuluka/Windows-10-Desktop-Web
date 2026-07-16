import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()
  const img = fs.readFileSync('/home/z/my-project/upload/Screenshot 2026-07-15 115526.png').toString('base64')

  const response = await zai.chat.completions.createVision({
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Describe this screenshot. What page is this? What do you see? Is it the right-click context menu on desktop? What options are shown?' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${img}` } },
      ],
    }],
    thinking: { type: 'disabled' },
  })
  console.log(response.choices[0]?.message?.content)
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
