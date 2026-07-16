import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()

  // HOME: real (095129) vs mine
  console.log('=== HOME PAGE ===')
  const r1 = await zai.chat.completions.createVision({
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Image 1 = REAL Win10 Settings Home (1366x768). Image 2 = MY Home (1366x768). Rate match 0-100%. Then list ALL remaining differences, no matter how small.' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${fs.readFileSync('/home/z/my-project/upload/Screenshot 2026-07-15 095129.png').toString('base64')}` } },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${fs.readFileSync('/home/z/my-project/download/mine-home-final.png').toString('base64')}` } },
      ],
    }],
    thinking: { type: 'disabled' },
  })
  console.log(r1.choices[0]?.message?.content)

  // DISPLAY: real (095021) vs mine
  console.log('\n=== DISPLAY PAGE ===')
  const r2 = await zai.chat.completions.createVision({
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Image 1 = REAL Win10 Display subpage (1366x768). Image 2 = MY Display subpage (1366x768). Rate match 0-100%. Then list ALL remaining differences, no matter how small.' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${fs.readFileSync('/home/z/my-project/upload/Screenshot 2026-07-15 095021.png').toString('base64')}` } },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${fs.readFileSync('/home/z/my-project/download/mine-display-final.png').toString('base64')}` } },
      ],
    }],
    thinking: { type: 'disabled' },
  })
  console.log(r2.choices[0]?.message?.content)
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
