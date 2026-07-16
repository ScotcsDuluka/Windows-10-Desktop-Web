import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()
  const img = fs.readFileSync('/home/z/my-project/download/settings-blur-real.png').toString('base64')

  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Look at the Settings window. Can you see the desktop wallpaper blurred behind it (acrylic effect)? Or is the background completely opaque/flat? Be specific.' },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${img}` } },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  })
  console.log(response.choices[0]?.message?.content)
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
