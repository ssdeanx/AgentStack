"use client"

import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Textarea } from "@/ui/textarea"
import { Label } from "@/ui/label"
import { MailIcon, MapPinIcon, PhoneIcon } from "lucide-react"

export function ContactForm() {
  return (
    <section className="container mx-auto px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Contact Us
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-1">
            <div>
              <h3 className="mb-4 text-lg font-semibold text-foreground">Get in touch</h3>
              <p className="text-muted-foreground">
                Fill out the form and our team will get back to you within 24 hours.
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <MailIcon className="mt-1 size-5 text-primary" />
                <div>
                  <div className="font-medium text-foreground">Email</div>
                  <div className="text-muted-foreground">support@agentstack.ai</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <PhoneIcon className="mt-1 size-5 text-primary" />
                <div>
                  <div className="font-medium text-foreground">Phone</div>
                  <div className="text-muted-foreground">+1 (555) 123-4567</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <MapPinIcon className="mt-1 size-5 text-primary" />
                <div>
                  <div className="font-medium text-foreground">Office</div>
                  <div className="text-muted-foreground">
                    123 AI Boulevard<br />
                    San Francisco, CA 94105
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm lg:col-span-2">
            <form className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First name</Label>
                  <Input id="first-name" placeholder="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last name</Label>
                  <Input id="last-name" placeholder="Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" placeholder="How can we help?" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us more about your project..."
                  className="min-h-[150px]"
                />
              </div>
              <Button type="submit" size="lg" className="w-full sm:w-auto">
                Send Message
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
