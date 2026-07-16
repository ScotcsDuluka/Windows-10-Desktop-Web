import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()
  const img = fs.readFileSync('/home/z/my-project/download/sidebar-icons-check.png').toString('base64')

  const response = await zai.chat.completions.createVision({
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Look at the left sidebar of this Settings window. List each item from top to bottom. For each: (1) text, (2) does it have an icon? (3) does the icon look correct or broken/wrong?' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${img}` } },
      ],
    }],
    thinking: { type: 'disabled' },
  })
  console.log(response.choices[0]?.message?.content)
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
