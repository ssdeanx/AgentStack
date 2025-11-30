"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Textarea } from "@/ui/textarea"
import { Label } from "@/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/select"
import {
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  SendIcon,
  CheckCircleIcon,
  LoaderIcon,
  MessageSquareIcon,
  BuildingIcon,
  ClockIcon,
  GlobeIcon,
} from "lucide-react"
import { Badge } from "@/ui/badge"

const INQUIRY_TYPES = [
  { value: "general", label: "General Inquiry" },
  { value: "sales", label: "Sales & Pricing" },
  { value: "support", label: "Technical Support" },
  { value: "partnership", label: "Partnership" },
  { value: "enterprise", label: "Enterprise Solutions" },
  { value: "demo", label: "Request a Demo" },
]

const CONTACT_INFO = [
  {
    icon: MailIcon,
    label: "Email",
    value: "support@agentstack.ai",
    href: "mailto:support@agentstack.ai",
  },
  {
    icon: PhoneIcon,
    label: "Phone",
    value: "+1 (555) 123-4567",
    href: "tel:+15551234567",
  },
  {
    icon: MapPinIcon,
    label: "Office",
    value: "123 AI Boulevard\nSan Francisco, CA 94105",
    href: "https://maps.google.com",
  },
]

const QUICK_STATS = [
  { icon: ClockIcon, label: "Response Time", value: "< 24 hours" },
  { icon: GlobeIcon, label: "Support Hours", value: "24/7 Enterprise" },
  { icon: MessageSquareIcon, label: "Satisfaction", value: "98%" },
]

interface FormData {
  firstName: string
  lastName: string
  email: string
  company: string
  inquiryType: string
  subject: string
  message: string
}

interface FormErrors {
  firstName?: string
  lastName?: string
  email?: string
  subject?: string
  message?: string
}

export function ContactForm() {
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    inquiryType: "",
    subject: "",
    message: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required"
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!formData.subject.trim()) {
      newErrors.subject = "Subject is required"
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required"
    } else if (formData.message.trim().length < 10) {
      newErrors.message = "Message must be at least 10 characters"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target
    setFormData((prev) => ({ ...prev, [id]: value }))
    // Clear error when user starts typing
    if (errors[id as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [id]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setStatus("loading")

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Simulate success
    setStatus("success")
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      inquiryType: "",
      subject: "",
      message: "",
    })

    // Reset after 5 seconds
    setTimeout(() => setStatus("idle"), 5000)
  }

  return (
    <section className="container mx-auto px-4 py-24">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <Badge variant="outline" className="mb-4">
            Get in Touch
          </Badge>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Contact Us
          </h1>
          <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
            Have questions? We'd love to hear from you. Send us a message and we'll
            respond as soon as possible.
          </p>
        </motion.div>

        {/* Quick stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-12 grid grid-cols-3 gap-4 rounded-2xl border border-border bg-muted/30 p-6"
        >
          {QUICK_STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <stat.icon className="size-5" />
              </div>
              <div className="text-lg font-semibold text-foreground">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </motion.div>

        <div className="grid gap-12 lg:grid-cols-3">
          {/* Contact info sidebar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-8 lg:col-span-1"
          >
            <div>
              <h3 className="mb-4 text-lg font-semibold text-foreground">
                Get in touch
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Fill out the form and our team will get back to you within 24 hours.
                For urgent matters, please call us directly.
              </p>
            </div>

            <div className="space-y-6">
              {CONTACT_INFO.map((info) => (
                <a
                  key={info.label}
                  href={info.href}
                  target={info.href.startsWith("http") ? "_blank" : undefined}
                  rel={info.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="group flex items-start gap-4 rounded-lg p-3 -m-3 transition-colors hover:bg-accent"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <info.icon className="size-5" />
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{info.label}</div>
                    <div className="whitespace-pre-line text-sm text-muted-foreground">
                      {info.value}
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {/* Office hours */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-3 flex items-center gap-2">
                <BuildingIcon className="size-5 text-primary" />
                <h4 className="font-semibold text-foreground">Office Hours</h4>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Monday - Friday</span>
                  <span className="font-medium text-foreground">9:00 AM - 6:00 PM PST</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday</span>
                  <span className="font-medium text-foreground">10:00 AM - 4:00 PM PST</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday</span>
                  <span className="text-muted-foreground">Closed</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Contact form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="lg:col-span-2"
          >
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
              {status === "success" ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-green-500/10">
                    <CheckCircleIcon className="size-8 text-green-500" />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold text-foreground">
                    Message Sent!
                  </h3>
                  <p className="max-w-sm text-muted-foreground">
                    Thank you for reaching out. We've received your message and will
                    get back to you within 24 hours.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => setStatus("idle")}
                  >
                    Send Another Message
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name fields */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">
                        First name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={handleChange}
                        className={errors.firstName ? "border-destructive" : ""}
                        disabled={status === "loading"}
                      />
                      {errors.firstName && (
                        <p className="text-sm text-destructive">{errors.firstName}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">
                        Last name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={handleChange}
                        className={errors.lastName ? "border-destructive" : ""}
                        disabled={status === "loading"}
                      />
                      {errors.lastName && (
                        <p className="text-sm text-destructive">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  {/* Email and Company */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={handleChange}
                        className={errors.email ? "border-destructive" : ""}
                        disabled={status === "loading"}
                      />
                      {errors.email && (
                        <p className="text-sm text-destructive">{errors.email}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        placeholder="Your company (optional)"
                        value={formData.company}
                        onChange={handleChange}
                        disabled={status === "loading"}
                      />
                    </div>
                  </div>

                  {/* Inquiry type */}
                  <div className="space-y-2">
                    <Label>Inquiry Type</Label>
                    <Select
                      value={formData.inquiryType}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, inquiryType: value }))
                      }
                      disabled={status === "loading"}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an inquiry type" />
                      </SelectTrigger>
                      <SelectContent>
                        {INQUIRY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subject */}
                  <div className="space-y-2">
                    <Label htmlFor="subject">
                      Subject <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="subject"
                      placeholder="How can we help?"
                      value={formData.subject}
                      onChange={handleChange}
                      className={errors.subject ? "border-destructive" : ""}
                      disabled={status === "loading"}
                    />
                    {errors.subject && (
                      <p className="text-sm text-destructive">{errors.subject}</p>
                    )}
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <Label htmlFor="message">
                      Message <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us more about your project or question..."
                      className={`min-h-[150px] resize-none ${errors.message ? "border-destructive" : ""}`}
                      value={formData.message}
                      onChange={handleChange}
                      disabled={status === "loading"}
                    />
                    {errors.message && (
                      <p className="text-sm text-destructive">{errors.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formData.message.length}/1000 characters
                    </p>
                  </div>

                  {/* Submit button */}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full sm:w-auto"
                    disabled={status === "loading"}
                  >
                    {status === "loading" ? (
                      <>
                        <LoaderIcon className="mr-2 size-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <SendIcon className="mr-2 size-4" />
                        Send Message
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    By submitting this form, you agree to our{" "}
                    <a href="/privacy" className="underline hover:text-foreground">
                      Privacy Policy
                    </a>{" "}
                    and{" "}
                    <a href="/terms" className="underline hover:text-foreground">
                      Terms of Service
                    </a>
                    .
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
