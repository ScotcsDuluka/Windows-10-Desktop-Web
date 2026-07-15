import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()
  const img = fs.readFileSync('/home/z/my-project/download/sidebar-top.png').toString('base64')

  const response = await zai.chat.completions.createVision({
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'This is the top section of a Win10 Settings sidebar. List each item from top to bottom. For each item tell me: (1) the text, (2) does it have an icon? (3) what does the icon look like? (4) approximate Y position in pixels from top of this crop' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${img}` } },
      ],
    }],
    thinking: { type: 'disabled' },
  })
  console.log(response.choices[0]?.message?.content)
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
