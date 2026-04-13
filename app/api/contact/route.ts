import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

interface ContactFormData {
    firstName: string
    lastName: string
    email: string
    company?: string
    inquiryType?: string
    subject: string
    message: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function getString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined
}

function parseContactFormData(value: unknown): ContactFormData | null {
    if (!isRecord(value)) {
        return null
    }

    const firstName = getString(value.firstName)
    const lastName = getString(value.lastName)
    const email = getString(value.email)
    const subject = getString(value.subject)
    const message = getString(value.message)

    if (
        !firstName ||
        !lastName ||
        !email ||
        !subject ||
        !message
    ) {
        return null
    }

    return {
        firstName,
        lastName,
        email,
        company: getString(value.company),
        inquiryType: getString(value.inquiryType),
        subject,
        message,
    }
}

export async function POST(request: NextRequest) {
    try {
        const data = parseContactFormData(await request.json())

        if (!data) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(data.email)) {
            return NextResponse.json(
                { error: 'Invalid email address' },
                { status: 400 }
            )
        }

        // Store in database or send email
        // Option 1: Log for now (replace with actual implementation)
        console.log('Contact form submission:', {
            name: `${data.firstName} ${data.lastName}`,
            email: data.email,
            company: data.company?.trim().length ? data.company : 'N/A',
            inquiryType: data.inquiryType?.trim().length ? data.inquiryType : 'general',
            subject: data.subject,
            message: data.message,
            timestamp: new Date().toISOString(),
        })

        // Option 2: Send via email service (uncomment and configure)
        // await sendEmail({
        //   to: process.env.CONTACT_EMAIL || "support@agentstack.ai",
        //   subject: `[Contact Form] ${data.subject}`,
        //   html: `
        //     <h2>New Contact Form Submission</h2>
        //     <p><strong>Name:</strong> ${data.firstName} ${data.lastName}</p>
        //     <p><strong>Email:</strong> ${data.email}</p>
        //     <p><strong>Company:</strong> ${data.company || "N/A"}</p>
        //     <p><strong>Inquiry Type:</strong> ${data.inquiryType || "General"}</p>
        //     <p><strong>Subject:</strong> ${data.subject}</p>
        //     <p><strong>Message:</strong></p>
        //     <p>${data.message}</p>
        //   `,
        // })

        return NextResponse.json(
            { success: true, message: 'Message received successfully' },
            { status: 200 }
        )
    } catch (error: unknown) {
        console.error('Contact form error:', error)
        return NextResponse.json(
            { error: 'Failed to process submission' },
            { status: 500 }
        )
    }
}
