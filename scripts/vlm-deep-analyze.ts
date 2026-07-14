import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()
  const real = fs.readFileSync('/home/z/my-project/upload/pasted_image_1784066620215.png').toString('base64')

  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'This is the REAL Windows 10 Settings home page. Please describe with EXTREME detail for reproduction:\n\n1. HEADER: What is at the very top? Is there a title? Where is the search bar (top, center, below title)? What is on the left and right of the search bar? Is there a profile/account circle? Any back button?\n\n2. GRID OF TILES: How many columns? How many rows total? List each tile left-to-right, top-to-bottom with: (a) icon description, (b) title text, (c) description text below title.\n\n3. TILE STYLE: Background color of tile? Border? Padding? Icon color (blue? gray?)? Title color? Description color? Font size estimate?\n\n4. FOOTER: Is there text at the bottom? What does it say? What color?\n\n5. OVERALL: Background color of page? Any sidebar?\n\nBe VERY specific.' },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${real}` } },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  })
  console.log(response.choices[0]?.message?.content)
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
