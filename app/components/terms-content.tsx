"use client"

import { motion } from "framer-motion"

const TERMS_SECTIONS = [
  {
    title: "Acceptance of Terms",
    content: `By accessing or using AgentStack's services, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing our services.`,
  },
  {
    title: "Use License",
    content: `Permission is granted to temporarily use AgentStack for personal or commercial purposes, subject to the following restrictions:

• You must not modify or copy our materials except for your own backup purposes
• You must not use the materials for any illegal or unauthorized purpose
• You must not attempt to reverse engineer any software contained in AgentStack
• You must not remove any copyright or proprietary notations from the materials`,
  },
  {
    title: "Account Responsibilities",
    content: `You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.

You must provide accurate and complete information when creating an account and keep this information up to date.`,
  },
  {
    title: "Service Availability",
    content: `We strive to provide reliable and uninterrupted service. However, we do not guarantee that our services will be available at all times. We may suspend or terminate access to our services at any time, with or without notice.`,
  },
  {
    title: "Intellectual Property",
    content: `All content, features, and functionality of AgentStack, including but not limited to text, graphics, logos, and software, are the exclusive property of AgentStack and are protected by international copyright, trademark, and other intellectual property laws.`,
  },
  {
    title: "Limitation of Liability",
    content: `AgentStack shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use or inability to use our services, even if we have been advised of the possibility of such damages.`,
  },
  {
    title: "Changes to Terms",
    content: `We reserve the right to modify these terms at any time. We will notify users of any material changes by posting the new Terms of Service on this page and updating the "Last updated" date.`,
  },
  {
    title: "Contact Information",
    content: `If you have any questions about these Terms of Service, please contact us at legal@agentstack.ai or by mail at: AgentStack Inc., 123 AI Boulevard, San Francisco, CA 94105.`,
  },
]

export function TermsContent() {
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
            Terms of Service
          </h1>
          <p className="text-muted-foreground">
            Last updated: November 30, 2025
          </p>
        </motion.div>

        <div className="space-y-12">
          {TERMS_SECTIONS.map((section, index) => (
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
