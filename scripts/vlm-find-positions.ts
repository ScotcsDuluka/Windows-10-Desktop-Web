import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()
  const img = fs.readFileSync('/home/z/my-project/download/sidebar-full-debug.png').toString('base64')

  const response = await zai.chat.completions.createVision({
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'This is the top 600px of a Win10 Settings sidebar (280px wide). For EACH row of text you see, tell me: (1) the text, (2) the Y position (from top of this image) where the icon starts, (3) the Y position where the text starts. I need exact pixel positions to crop icons. Format: text | iconY | textY' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${img}` } },
      ],
    }],
    thinking: { type: 'disabled' },
  })
  console.log(response.choices[0]?.message?.content)
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
