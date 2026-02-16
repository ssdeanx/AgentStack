import { Footer } from '@/app/components/footer'
import { AboutContent } from '@/app/components/about-content'

export default function AboutPage() {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <main className="flex-1">
                <AboutContent />
            </main>
            <Footer />
        </div>
    )
}
