import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()
  
  // Analyze real screenshot 1
  const real1 = fs.readFileSync('/home/z/my-project/upload/Screenshot 2026-07-15 095021.png').toString('base64')
  const r1 = await zai.chat.completions.createVision({
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'What page is this? Is it the Settings Home page (grid of categories) or a subpage (like Display)? Describe what you see in 2 sentences.' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${real1}` } },
      ],
    }],
    thinking: { type: 'disabled' },
  })
  console.log('=== REAL IMAGE 1 (095021) ===')
  console.log(r1.choices[0]?.message?.content)

  // Analyze real screenshot 2
  const real2 = fs.readFileSync('/home/z/my-project/upload/Screenshot 2026-07-15 095129.png').toString('base64')
  const r2 = await zai.chat.completions.createVision({
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'What page is this? Is it the Settings Home page (grid of categories) or a subpage (like Display)? Describe what you see in 2 sentences.' },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${real2}` } },
      ],
    }],
    thinking: { type: 'disabled' },
  })
  console.log('\n=== REAL IMAGE 2 (095129) ===')
  console.log(r2.choices[0]?.message?.content)
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
