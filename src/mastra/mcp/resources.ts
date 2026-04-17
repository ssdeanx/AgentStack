import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import type { MCPServerResources, Resource } from '@mastra/mcp'
import { log } from '../config/logger'

const NOTES_DIR = path.join(process.cwd(), 'notes')

const listNoteFiles = async (): Promise<Resource[]> => {
    try {
        await fs.mkdir(NOTES_DIR, { recursive: true })
        const files = await fs.readdir(NOTES_DIR)
        return files
            .filter((file) => file.endsWith('.md'))
            .map((file) => {
                const title = file.replace('.md', '')
                return {
                    uri: `notes://${title}`,
                    name: title,
                    description: `A note about ${title}`,
                    mime_type: 'text/markdown',
                }
            })
    } catch (error) {
        log.error('Error listing note resources', {
            error: error instanceof Error ? error.message : String(error),
        })
        return []
    }
}

interface ErrnoException extends Error {
    code?: string
    errno?: number
    syscall?: string
    path?: string
}

function isNodeErrorWithCode(error: unknown): error is ErrnoException {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof (error as { code?: unknown }).code === 'string'
    )
}

const readNoteFile = async (uri: string): Promise<string | null> => {
    const title = uri.replace('notes://', '')
    const notePath = path.join(NOTES_DIR, `${title}.md`)
    try {
        return await fs.readFile(notePath, 'utf-8')
    } catch (error) {
        if (!isNodeErrorWithCode(error) || error.code !== 'ENOENT') {
            log.error(`Error reading resource ${uri}`, {
                error: error instanceof Error ? error.message : String(error),
            })
        }
        return null
    }
}

export const resourceHandlers: MCPServerResources = {
    listResources: listNoteFiles,
    getResourceContent: async ({ uri }: { uri: string }) => {
        const content = await readNoteFile(uri)
        if (content === null) {
            return { text: '' }
        }
        return { text: content }
    },
}
