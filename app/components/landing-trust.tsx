'use client'

import {
    ShieldIcon,
    LockIcon,
    CheckCircleIcon,
    ServerIcon,
    GlobeIcon,
    ClockIcon,
    AwardIcon,
    HeartHandshakeIcon,
} from 'lucide-react'
import { Badge } from '@/ui/badge'
import {
    SectionLayout,
    useSectionReveal,
    SECTION_HEADING,
    SECTION_BODY,
    SECTION_LAYOUT,
} from '@/app/components/primitives'

const TRUST_SIGNALS = [
    {
        icon: ShieldIcon,
        title: 'Enterprise Security',
        description:
            'SOC 2 Type II compliant with end-to-end encryption for all data in transit and at rest.',
    },
    {
        icon: LockIcon,
        title: 'Data Privacy',
        description:
            'GDPR and CCPA compliant with zero data retention policies. Your data stays yours.',
    },
    {
        icon: ServerIcon,
        title: '99.9% Uptime SLA',
        description:
            'Enterprise-grade infrastructure with redundancy and automatic failover.',
    },
    {
        icon: GlobeIcon,
        title: 'Global Infrastructure',
        description:
            'Deployed across multiple regions for low latency and high availability worldwide.',
    },
]

const CERTIFICATIONS = [
    { name: 'SOC 2 Type II', icon: AwardIcon },
    { name: 'GDPR Compliant', icon: CheckCircleIcon },
    { name: 'HIPAA Ready', icon: ShieldIcon },
    { name: 'ISO 27001', icon: LockIcon },
]

const TRUST_METRICS = [
    { label: 'Uptime', value: '99.99%', icon: ClockIcon },
    { label: 'Security Score', value: 'A+', icon: ShieldIcon },
    { label: 'Data Centers', value: '12+', icon: ServerIcon },
    { label: 'Support SLA', value: '< 1hr', icon: HeartHandshakeIcon },
]

export function LandingTrust() {
    const revealRef = useSectionReveal<HTMLDivElement>({
        selector: '.trust-header, .trust-grid, .trust-certs, .trust-metrics, .trust-badge',
        stagger: 0.1,
    })

    return (
        <SectionLayout spacing="base" background="muted" borderBottom>
            <div ref={revealRef}>
                {/* Section header */}
                <div className={`trust-header ${SECTION_LAYOUT.headerCenter}`}>
                    <Badge variant="outline" className="mb-4">
                        Security & Compliance
                    </Badge>
                    <h2 className={`mb-4 ${SECTION_HEADING.h2}`}>
                        Built for Enterprise Trust
                    </h2>
                    <p className={SECTION_BODY.subtitleCentered}>
                        Production-ready security, compliance, and reliability
                        that enterprise teams demand.
                    </p>
                </div>

                {/* Trust signals grid */}
                <div className="trust-grid @container mb-16 grid gap-6 @sm:grid-cols-2 @lg:grid-cols-4">
                    {TRUST_SIGNALS.map((signal) => (
                        <div
                            key={signal.title}
                            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
                        >
                            <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl border border-border bg-background shadow-sm text-foreground transition-transform duration-200 group-hover:scale-105 group-hover:border-primary/30 group-hover:text-primary">
                                <signal.icon
                                    className="size-6"
                                    strokeWidth={1.5}
                                />
                            </div>
                            <h3 className="mb-2 text-lg font-semibold text-foreground">
                                {signal.title}
                            </h3>
                            <p className={SECTION_BODY.body}>
                                {signal.description}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Certifications row */}
                <div className="trust-certs mb-16">
                    <h3 className={`mb-6 text-center ${SECTION_BODY.label}`}>
                        Certifications & Compliance
                    </h3>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        {CERTIFICATIONS.map((cert) => (
                            <div
                                key={cert.name}
                                className="flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 shadow-sm transition-all duration-200 ease-spring hover:border-primary/30 hover:shadow-md hover:scale-105"
                            >
                                <cert.icon className="size-4 text-primary" />
                                <span className="text-sm font-medium text-foreground">
                                    {cert.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Trust metrics */}
                <div className="trust-metrics rounded-2xl border border-border bg-card/50 p-8 backdrop-blur-sm">
                    <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                        {TRUST_METRICS.map((metric) => (
                            <div key={metric.label} className="text-center">
                                <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all duration-200 ease-spring hover:bg-primary hover:text-primary-foreground hover:scale-105">
                                    <metric.icon className="size-5" />
                                </div>
                                <div className="text-2xl font-bold text-foreground md:text-3xl">
                                    {metric.value}
                                </div>
                                <div className="mt-1 text-sm text-muted-foreground">
                                    {metric.label}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Open source badge */}
                <div className="trust-badge mt-12 text-center">
                    <div className="inline-flex items-center gap-3 rounded-full border border-green-500/30 bg-green-500/10 px-6 py-3">
                        <div className="flex size-8 items-center justify-center rounded-full bg-green-500/20">
                            <CheckCircleIcon className="size-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="text-left">
                            <div className="text-sm font-semibold text-foreground">
                                Open Source & Auditable
                            </div>
                            <div className="text-xs text-muted-foreground">
                                Transparent codebase with community security
                                reviews
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SectionLayout>
    )
}
