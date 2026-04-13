'use client'

import Link from 'next/link'

import {
    EnvironmentVariable,
    EnvironmentVariableCopyButton,
    EnvironmentVariableGroup,
    EnvironmentVariableName,
    EnvironmentVariableRequired,
    EnvironmentVariableValue,
    EnvironmentVariables,
    EnvironmentVariablesContent,
    EnvironmentVariablesHeader,
    EnvironmentVariablesTitle,
    EnvironmentVariablesToggle,
} from '@/src/components/ai-elements/environment-variables'
import { LogoutButton } from '@/app/chat/_components/logout-button'
import { useAuthQuery } from '@/lib/hooks/use-auth-query'
import {
    usePersistentStore,
    type PersistentStoreResult,
} from '@/lib/hooks/use-persistent-store'
import { Button } from '@/ui/button'
import { Input } from '@/ui/input'
import { Label } from '@/ui/label'

type ProviderId = 'openai' | 'anthropic' | 'google' | 'groq' | 'mistral'

type ProviderDescriptor = {
    id: ProviderId
    name: string
    envName: string
    modelLabel: string
    placeholderModel: string
}

type ProviderEntry = {
    apiKey: string
    model: string
}

type ProviderSettings = {
    activeProvider: ProviderId
    providers: Record<ProviderId, ProviderEntry>
}

const providerDescriptors: readonly ProviderDescriptor[] = [
    {
        id: 'openai',
        name: 'OpenAI',
        envName: 'OPENAI_API_KEY',
        modelLabel: 'Default model',
        placeholderModel: 'gpt-4.1-mini',
    },
    {
        id: 'anthropic',
        name: 'Anthropic',
        envName: 'ANTHROPIC_API_KEY',
        modelLabel: 'Default model',
        placeholderModel: 'claude-sonnet-4-0',
    },
    {
        id: 'google',
        name: 'Google',
        envName: 'GOOGLE_GENERATIVE_AI_API_KEY',
        modelLabel: 'Default model',
        placeholderModel: 'gemini-2.5-flash',
    },
    {
        id: 'groq',
        name: 'Groq',
        envName: 'GROQ_API_KEY',
        modelLabel: 'Default model',
        placeholderModel: 'llama-3.3-70b-versatile',
    },
    {
        id: 'mistral',
        name: 'Mistral',
        envName: 'MISTRAL_API_KEY',
        modelLabel: 'Default model',
        placeholderModel: 'mistral-large-latest',
    },
] as const

const initialProviderSettings: ProviderSettings = {
    activeProvider: 'openai',
    providers: {
        openai: {
            apiKey: '',
            model: 'gpt-4.1-mini',
        },
        anthropic: {
            apiKey: '',
            model: 'claude-sonnet-4-0',
        },
        google: {
            apiKey: '',
            model: 'gemini-2.5-flash',
        },
        groq: {
            apiKey: '',
            model: 'llama-3.3-70b-versatile',
        },
        mistral: {
            apiKey: '',
            model: 'mistral-large-latest',
        },
    },
}

function updateProviderEntry(
    store: PersistentStoreResult<ProviderSettings>,
    providerId: ProviderId,
    field: keyof ProviderEntry,
    value: string,
) {
    store.setValue((current) => ({
        ...current,
        providers: {
            ...current.providers,
            [providerId]: {
                ...current.providers[providerId],
                [field]: value,
            },
        },
    }))
}

/**
 * Admin settings surface for chat operators and provider/API key management.
 */
export function AdminSettingsPanel() {
    const { data: session } = useAuthQuery()
    const providerSettings = usePersistentStore<ProviderSettings>({
        key: 'agentstack.chat.admin.provider-settings',
        initialValue: initialProviderSettings,
    })

    const user = session?.user
    const isAdmin = user?.role === 'admin'

    return (
        <div className="space-y-6">
            <section className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                            Admin console
                        </p>
                        <h2 className="text-2xl font-semibold text-foreground">
                            Provider keys, models, and access controls
                        </h2>
                        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                            Manage the model/provider API keys used by chat, choose the default
                            provider, and keep the values saved locally until you move them into a
                            server-side secret store.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="secondary">
                            <Link href="/chat">Open chat</Link>
                        </Button>
                        <Button
                            variant="outline"
                            onClick={providerSettings.resetValue}
                            type="button"
                        >
                            Reset provider settings
                        </Button>
                        <LogoutButton variant="outline" />
                    </div>
                </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-3xl border border-border/60 bg-background/80 p-5 shadow-sm">
                    <div className="text-sm font-semibold text-foreground">Current admin</div>
                    <div className="mt-2 text-sm text-muted-foreground">
                        {user?.name ?? 'No account loaded'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {user?.email ?? 'Sign in to continue'}
                    </div>
                    <div className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground/70">
                        Role: {user?.role ?? 'user'}
                    </div>
                    <div className="mt-4 rounded-2xl bg-muted/40 p-3 text-xs text-muted-foreground">
                        {isAdmin
                            ? 'Admin access is enabled for this account.'
                            : 'This view is visible, but admin-only actions should be hidden until the user is promoted to admin.'}
                    </div>
                </div>

                <div className="rounded-3xl border border-border/60 bg-background/80 p-5 shadow-sm">
                    <div className="text-sm font-semibold text-foreground">Active provider</div>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {providerDescriptors.find((entry) => entry.id === providerSettings.value.activeProvider)?.name ??
                            'OpenAI'}
                    </p>
                    <div className="mt-4 grid gap-3">
                        <Label htmlFor="active-provider">Default provider</Label>
                        <select
                            id="active-provider"
                            name="active-provider"
                            title='providers'
                            className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
                            value={providerSettings.value.activeProvider}
                            onChange={(event) => {
                                providerSettings.setValue((current) => ({
                                    ...current,
                                    activeProvider: event.target.value as ProviderId,
                                }))
                            }}
                        >
                            {providerDescriptors.map((entry) => (
                                <option key={entry.id} value={entry.id}>
                                    {entry.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="rounded-3xl border border-border/60 bg-background/80 p-5 shadow-sm">
                    <div className="text-sm font-semibold text-foreground">Security posture</div>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Browser storage keeps the current draft functional today. When you are ready,
                        move the values into a secure backend secret store and keep the same UI.
                    </p>
                </div>
            </section>

            <EnvironmentVariables
                defaultShowValues={false}
                className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm"
            >
                <EnvironmentVariablesHeader className="gap-4">
                    <div className="space-y-1">
                        <EnvironmentVariablesTitle>
                            Provider API key inventory
                        </EnvironmentVariablesTitle>
                        <p className="max-w-3xl text-sm text-muted-foreground">
                            Toggle the values to inspect what is stored locally for each provider.
                        </p>
                    </div>
                    <EnvironmentVariablesToggle />
                </EnvironmentVariablesHeader>

                <EnvironmentVariablesContent>
                    <EnvironmentVariableGroup>
                        {providerDescriptors.map((descriptor) => {
                            const provider = providerSettings.value.providers[descriptor.id]

                            return (
                                <EnvironmentVariable
                                    key={descriptor.id}
                                    name={descriptor.envName}
                                    value={provider.apiKey}
                                    // description={`${descriptor.name} credential saved in browser storage.`}
                                >
                                    <EnvironmentVariableName />
                                    <EnvironmentVariableValue />
                                    <EnvironmentVariableRequired />
                                    <EnvironmentVariableCopyButton />
                                </EnvironmentVariable>
                            )
                        })}
                    </EnvironmentVariableGroup>
                </EnvironmentVariablesContent>
            </EnvironmentVariables>

            <section className="grid gap-4 xl:grid-cols-2">
                {providerDescriptors.map((descriptor) => {
                    const provider = providerSettings.value.providers[descriptor.id]

                    return (
                        <div
                            key={descriptor.id}
                            className="rounded-3xl border border-border/60 bg-background/80 p-5 shadow-sm"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">
                                        {descriptor.name}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {descriptor.envName}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={
                                        providerSettings.value.activeProvider === descriptor.id
                                            ? 'default'
                                            : 'outline'
                                    }
                                    onClick={() => {
                                        providerSettings.setValue((current) => ({
                                            ...current,
                                            activeProvider: descriptor.id,
                                        }))
                                    }}
                                >
                                    {providerSettings.value.activeProvider === descriptor.id
                                        ? 'Active'
                                        : 'Make active'}
                                </Button>
                            </div>

                            <div className="mt-4 space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor={`${descriptor.id}-api-key`}>API key</Label>
                                    <Input
                                        id={`${descriptor.id}-api-key`}
                                        type="password"
                                        value={provider.apiKey}
                                        onChange={(event) => {
                                            updateProviderEntry(
                                                providerSettings,
                                                descriptor.id,
                                                'apiKey',
                                                event.target.value,
                                            )
                                        }}
                                        placeholder={`Paste your ${descriptor.name} API key`}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor={`${descriptor.id}-model`}>
                                        {descriptor.modelLabel}
                                    </Label>
                                    <Input
                                        id={`${descriptor.id}-model`}
                                        value={provider.model}
                                        onChange={(event) => {
                                            updateProviderEntry(
                                                providerSettings,
                                                descriptor.id,
                                                'model',
                                                event.target.value,
                                            )
                                        }}
                                        placeholder={descriptor.placeholderModel}
                                    />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </section>
        </div>
    )
}
