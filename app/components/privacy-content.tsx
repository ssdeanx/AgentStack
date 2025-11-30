"use client"

import { motion } from "framer-motion"

const PRIVACY_SECTIONS = [
  {
    title: "Information We Collect",
    content: `We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support. This may include your name, email address, and any other information you choose to provide.

We also automatically collect certain information when you use our services, including your IP address, browser type, operating system, and usage patterns.`,
  },
  {
    title: "How We Use Your Information",
    content: `We use the information we collect to provide, maintain, and improve our services, to communicate with you, to monitor and analyze trends and usage, and to personalize your experience.

We may also use your information to send you technical notices, updates, security alerts, and support messages.`,
  },
  {
    title: "Information Sharing",
    content: `We do not sell, trade, or otherwise transfer your personal information to outside parties. This does not include trusted third parties who assist us in operating our website, conducting our business, or servicing you, as long as those parties agree to keep this information confidential.`,
  },
  {
    title: "Data Security",
    content: `We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure.`,
  },
  {
    title: "Your Rights",
    content: `You have the right to access, correct, or delete your personal information. You may also object to or restrict certain processing of your data. To exercise these rights, please contact us at privacy@agentstack.ai.`,
  },
  {
    title: "Contact Us",
    content: `If you have any questions about this Privacy Policy, please contact us at privacy@agentstack.ai or by mail at: AgentStack Inc., 123 AI Boulevard, San Francisco, CA 94105.`,
  },
]

export function PrivacyContent() {
  return (
    <section className="container mx-auto px-4 py-24">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="text-muted-foreground">
            Last updated: November 30, 2025
          </p>
        </motion.div>

        <div className="space-y-12">
          {PRIVACY_SECTIONS.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <h2 className="mb-4 text-2xl font-bold text-foreground">
                {section.title}
              </h2>
              <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
