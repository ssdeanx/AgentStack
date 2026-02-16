import { Footer } from '@/app/components/footer'
import { BlogList } from '@/app/components/blog-list'

export default function BlogPage() {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <main className="flex-1">
                <BlogList />
            </main>
            <Footer />
        </div>
    )
}
