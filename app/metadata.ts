import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'AgentStack | Multi-Agent Framework',
    description:
        'Production-grade multi-agent framework for AI applications with 22+ agents, 30+ tools, 10 workflows, and 4 networks.',
    applicationName: 'AgentStack',
    authors: [{ name: 'AgentStack Team', url: 'https://deanmachines.com' }],
    keywords: [
        'AI',
        'Agents',
        'Multi-Agent Systems',
        'RAG',
        'Observability',
        'Governance',
        'AgentStack',
    ],
    referrer: 'origin-when-cross-origin',
    openGraph: {
        title: 'AgentStack | Multi-Agent Framework',
        description:
            'Production-grade multi-agent framework for AI applications with 22+ agents, 30+ tools, 10 workflows, and 4 networks.',
        url: 'https://deanmachines.com',
        siteName: 'AgentStack',
        images: [
            {
                url: 'https://deanmachines.com/og-image.png',
                width: 1200,
                height: 630,
                alt: 'AgentStack',
            },
        ],
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'AgentStack | Multi-Agent Framework',
        description:
            'Production-grade multi-agent framework for AI applications.',
        images: ['https://deanmachines.com/og-image.png'],
    },
    metadataBase: new URL('https://deanmachines.com'),
}
