import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useState, type SubmitEvent } from 'react'
import type { AgentDataPart } from '@mastra/ai-sdk'

export function NestedAgentChat() {
    const [input, setInput] = useState('')
    const { messages, sendMessage, status } = useChat({
        transport: new DefaultChatTransport({
            api: 'http://localhost:4111/chat/weatherAgent',
            credentials: 'include',
        }),
    })

    const handleSubmit = (e: SubmitEvent<HTMLFormElement>) => {
        e.preventDefault()
        // Use a self-invoking async function to avoid returning a Promise from the event handler
        void (async () => {
            try {
                await sendMessage({ text: input })
            } catch (err) {
                // Log the error and allow the UI to continue
                // eslint-disable-next-line no-console
                console.error('Failed to send message', err)
            } finally {
                setInput('')
            }
        })()
    }

    return (
        <div>
            <form onSubmit={handleSubmit}>
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter a city"
                />
                <button type="submit" disabled={status !== 'ready'}>
                    Get Forecast
                </button>
            </form>

            {messages.map((message) => (
                <div key={message.id}>
                    {message.parts.map((part, index) => {
                        if (part.type === 'text') {
                            return <p key={index}>{part.text}</p>
                        }
                        if (part.type === 'data-tool-agent') {
                            const { id, data } = part as AgentDataPart
                            return (
                                <div key={index} className="nested-agent">
                                    <strong>Nested Agent: {id}</strong>
                                    {data.text && <p>{data.text}</p>}
                                </div>
                            )
                        }
                        return null
                    })}
                </div>
            ))}
        </div>
    )
}
