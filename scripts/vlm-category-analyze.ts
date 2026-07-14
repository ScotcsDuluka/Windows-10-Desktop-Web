import ZAI from 'z-ai-web-dev-sdk'
import fs from 'fs'

async function main() {
  const zai = await ZAI.create()
  const current = fs.readFileSync('/home/z/my-project/download/category-system.png').toString('base64')

  const response = await zai.chat.completions.createVision({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'This is my Windows 10 Settings System category page. Describe EXTREMELY detailed for comparison with real Win10:\n\n1. HEADER: What is at the top? Back button? Profile? Search bar location? Any title?\n\n2. SIDEBAR (left): Width? List items? Each item has icon? Selected state? Hover state?\n\n3. MAIN CONTENT: Title size/color? Each row layout — icon, title, description, action (toggle/link)? Borders between rows?\n\n4. SPACING: Padding, gaps, overall density?\n\n5. COLORS: Background colors (header, sidebar, content), text colors, accent colors?\n\n6. ISSUES: What looks OFF or not like real Windows 10?\n\nBe specific and concise.' },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${current}` } },
        ],
      },
    ],
    thinking: { type: 'disabled' },
  })
  console.log(response.choices[0]?.message?.content)
}
main().catch((e) => { console.error('ERR:', e.message); process.exit(1) })
