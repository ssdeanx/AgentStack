import { mastra } from '../mastra'

const editor = mastra.getEditor()!

await editor.prompt.create({
  id: 'brand-voice',
  name: 'Brand voice',
  description: 'Acme Inc. tone and style guidelines',
  content:
    'You write in a friendly, concise tone. Always address the user as {{userName || "there"}}.',
})