import { Footer } from '@/app/components/footer'
import { ContactForm } from '@/app/components/contact-form'

export default function ContactPage() {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <main className="flex-1">
                <ContactForm />
            </main>
            <Footer />
        </div>
    )
}
