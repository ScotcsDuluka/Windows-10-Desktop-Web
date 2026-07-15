import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()

  // Compare Home pages: real (095129) vs mine
  console.log('=== HOME PAGE: real vs mine ===')
  const realHome = fs.readFileSync('/home/z/my-project/upload/Screenshot 2026-07-15 095129.png').toString('base64')
  const mineHome = fs.readFileSync('/home/z/my-project/download/mine-home-1366.png').toString('base64')
  const r1 = await zai.chat.completions.createVision({
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Image 1 = REAL Win10 Settings HOME page. Image 2 = MY HOME page. Both 1366x768. List top 5 most obvious visual differences only. Be brief.' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${realHome}` } },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${mineHome}` } },
      ],
    }],
    thinking: { type: 'disabled' },
  })
  console.log(r1.choices[0]?.message?.content)

  // Compare Display pages: real (095021) vs mine
  console.log('\n=== DISPLAY PAGE: real vs mine ===')
  const realDisplay = fs.readFileSync('/home/z/my-project/upload/Screenshot 2026-07-15 095021.png').toString('base64')
  const mineDisplay = fs.readFileSync('/home/z/my-project/download/mine-display-1366.png').toString('base64')
  const r2 = await zai.chat.completions.createVision({
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Image 1 = REAL Win10 Settings Display subpage. Image 2 = MY Display subpage. Both 1366x768. List top 5 most obvious visual differences only. Be brief.' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${realDisplay}` } },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${mineDisplay}` } },
      ],
    }],
    thinking: { type: 'disabled' },
  })
  console.log(r2.choices[0]?.message?.content)
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
