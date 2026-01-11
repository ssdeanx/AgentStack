// @ts-nocheck
import { describe, it, expect, beforeEach } from 'vitest'
import { arxivTool } from '../arxiv.tool'

const fetchMock = vi.fn()
global.fetch = fetchMock

describe('arxivTool', () => {
    beforeEach(() => vi.clearAllMocks())

    it('searches by query and returns parsed papers', async () => {
        const sampleXml = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">
  <opensearch:totalResults>1</opensearch:totalResults>
  <entry>
    <id>http://arxiv.org/abs/2103.00001v1</id>
    <title><![CDATA[Test Paper Title]]></title>
    <updated>2021-03-01T00:00:00Z</updated>
    <published>2021-02-28T00:00:00Z</published>
    <summary><![CDATA[This is an abstract.]]></summary>
    <author><name>Jane Doe</name></author>
    <category term="cs.AI"/>
  </entry>
</feed>`

        fetchMock.mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(sampleXml) })

        const res = await arxivTool.execute({ query: 'test' }, {})

        expect(res.papers.length).toBeGreaterThanOrEqual(1)
        const paper = res.papers[0]
        expect(paper.title).toContain('Test Paper Title')
        expect(paper.authors[0]).toBe('Jane Doe')
        expect(res.total_results).toBe(1)
    })

    it('throws when no search terms provided', async () => {
        await expect(arxivTool.execute({}, {})).rejects.toThrow()
    })
})