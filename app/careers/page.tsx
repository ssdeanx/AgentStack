import { Footer } from '@/app/components/footer'
import { CareersContent } from '@/app/components/careers-content'

export default function CareersPage() {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <main className="flex-1">
                <CareersContent />
            </main>
            <Footer />
        </div>
    )
}
