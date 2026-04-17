import { mastra } from '../mastra'

const editor = mastra.getEditor()!

await editor.prompt.update({
  id: 'brand-voice',
  content: 'You write in a friendly, concise tone. Always greet the user by name when available.',
})
