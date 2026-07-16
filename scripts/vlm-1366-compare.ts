import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()
  // Real screenshots (1366x768)
  const real1 = fs.readFileSync('/home/z/my-project/upload/Screenshot 2026-07-15 095021.png').toString('base64')
  const real2 = fs.readFileSync('/home/z/my-project/upload/Screenshot 2026-07-15 095129.png').toString('base64')
  // Mine (1366x768)
  const mine1 = fs.readFileSync('/home/z/my-project/download/mine-1366-home.png').toString('base64')
  const mine2 = fs.readFileSync('/home/z/my-project/download/mine-1366-display.png').toString('base64')

  // Compare Home pages
  console.log('=== HOME PAGE COMPARISON ===')
  const r1 = await zai.chat.completions.createVision({
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Image 1 = REAL Win10 Settings Home (1366x768). Image 2 = MY clone Home (1366x768). List EVERY visual difference. Focus on spacing, sizes, colors, layout. Be specific with px estimates. Format: FIX: [area] — real: X / mine: Y / fix: Z' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${real1}` } },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${mine1}` } },
      ],
    }],
    thinking: { type: 'disabled' },
  })
  console.log(r1.choices[0]?.message?.content)

  console.log('\n=== DISPLAY PAGE COMPARISON ===')
  const r2 = await zai.chat.completions.createVision({
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Image 1 = REAL Win10 Settings Display page (1366x768). Image 2 = MY clone Display page (1366x768). List EVERY visual difference. Focus on spacing, sizes, colors, layout. Be specific with px estimates. Format: FIX: [area] — real: X / mine: Y / fix: Z' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${real2}` } },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${mine2}` } },
      ],
    }],
    thinking: { type: 'disabled' },
  })
  console.log(r2.choices[0]?.message?.content)
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
