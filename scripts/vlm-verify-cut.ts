import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()
  const icons = ['display', 'sound', 'notifications', 'focus', 'power', 'storage', 'multitasking', 'projecting']

  for (const name of icons) {
    const img = fs.readFileSync(`/home/z/my-project/public/win10-icons/${name}.png`).toString('base64')
    const r = await zai.chat.completions.createVision({
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'What do you see in this image? Is it an icon or is it blank/empty? Describe in 1 sentence.' },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${img}` } },
        ],
      }],
      thinking: { type: 'disabled' },
    })
    console.log(`${name}: ${r.choices[0]?.message?.content?.trim()}`)
  }
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
