import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()
  const real = fs.readFileSync('/home/z/my-project/download/real-win10-settings-1.png').toString('base64')
  const mine = fs.readFileSync('/home/z/my-project/download/settings-fixed.png').toString('base64')

  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'I have 2 images. Image 1 = REAL Windows 10 Settings. Image 2 = MY implementation. Compare them and list SPECIFIC layout differences:\n\n1. Title bar — height, style, transparency\n2. Header area — what elements, where (left/center/right)\n3. Sidebar — width, items, selected style\n4. Content area — padding, title size, row layout\n5. Overall window — background color, borders, transparency\n6. What makes mine look "cheap/fake" compared to real?\n\nBe brutally honest and specific.' },
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
