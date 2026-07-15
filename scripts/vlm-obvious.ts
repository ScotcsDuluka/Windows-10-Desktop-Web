import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()
  
  // Real screenshot (Display page)
  const real = fs.readFileSync('/home/z/my-project/upload/Screenshot 2026-07-15 095129.png').toString('base64')
  // Mine (Display page)
  const mine = fs.readFileSync('/home/z/my-project/download/mine-final-1366.png').toString('base64')

  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: `Both images are 1366x768. Image 1 = REAL Win10 Settings. Image 2 = MY clone.

Look at these very carefully. What are the MOST OBVIOUS differences? Don't measure pixels — just tell me what looks WRONG in mine compared to real.

List top 10 most obvious issues. Be direct and specific.` },
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
