"use client"

import { useState } from "react"
import { Button } from "@/ui/button"
import { CheckIcon, XIcon } from "lucide-react"
import { Switch } from "@/ui/switch"
import { Label } from "@/ui/label"
import { motion } from "framer-motion"

const TIERS = [
  {
    name: "Hobby",
    price: { monthly: "$0", yearly: "$0" },
    description: "For personal projects and experiments.",
    features: ["Free forever", "Up to 3 agents", "Community support", "Basic analytics"],
    button: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: { monthly: "$29", yearly: "$290" },
    description: "For professional developers and small teams.",
    features: ["Unlimited agents", "Priority support", "Advanced analytics", "Team collaboration", "Custom workflows"],
    button: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: { monthly: "Custom", yearly: "Custom" },
    description: "For large organizations with specific needs.",
    features: ["Custom integrations", "SLA", "Dedicated account manager", "On-premise deployment", "SSO & Audit logs"],
    button: "Contact Sales",
    popular: false,
  },
]

const COMPARISON_FEATURES = [
  { feature: "Agents", hobby: "Up to 3", pro: "Unlimited", enterprise: "Unlimited" },
  { feature: "Workflows", hobby: "Basic", pro: "Advanced", enterprise: "Custom" },
  { feature: "Support", hobby: "Community", pro: "Priority", enterprise: "Dedicated" },
  { feature: "Analytics", hobby: "Basic", pro: "Advanced", enterprise: "Enterprise" },
  { feature: "Team Collaboration", hobby: false, pro: true, enterprise: true },
  { feature: "Custom Integrations", hobby: false, pro: false, enterprise: true },
  { feature: "SLA", hobby: false, pro: false, enterprise: true },
  { feature: "On-premise Deployment", hobby: false, pro: false, enterprise: true },
  { feature: "SSO & Audit Logs", hobby: false, pro: false, enterprise: true },
]

export function PricingTiers() {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <section className="container mx-auto px-4 py-24">
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Simple, Transparent Pricing
        </h1>
        <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
          Choose the plan that's right for you and start building AI agents today.
        </p>

        <div className="mt-8 flex items-center justify-center gap-4">
          <Label htmlFor="billing-toggle" className={`text-sm font-medium ${!isYearly ? "text-foreground" : "text-muted-foreground"}`}>
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <Label htmlFor="billing-toggle" className={`text-sm font-medium ${isYearly ? "text-foreground" : "text-muted-foreground"}`}>
            Yearly <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-600 dark:bg-green-900/30 dark:text-green-400">Save 20%</span>
          </Label>
        </div>
      </div>

      <div className="@container grid gap-8 @md:grid-cols-3">
        {TIERS.map((tier, index) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            viewport={{ once: true }}
            className={`card-3d relative flex flex-col rounded-2xl border bg-card p-8 shadow-sm transition-all duration-300 ease-spring hover:shadow-lg hover:-translate-y-1 ${tier.popular
                ? "border-primary ring-1 ring-primary"
                : "border-border hover:border-primary/50"
              }`}
          >
            {tier.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground shadow-lg animate-pulse-glow">
                Most Popular
              </div>
            )}

            <h3 className="text-xl font-semibold text-foreground">{tier.name}</h3>
            <div className="mt-4 mb-6">
              <span className="text-4xl font-bold text-foreground">
                {isYearly ? tier.price.yearly : tier.price.monthly}
              </span>
              {tier.price.monthly !== "Custom" && (
                <span className="text-muted-foreground">/{isYearly ? "year" : "month"}</span>
              )}
            </div>
            <p className="mb-6 text-muted-foreground">{tier.description}</p>
            <ul className="mb-8 flex-1 space-y-4">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <CheckIcon className="size-5 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              variant={tier.popular ? "default" : "outline"}
              size="lg"
            >
              {tier.button}
            </Button>
          </motion.div>
        ))}
      </div>

      <div className="mt-24">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground">
            Compare Plans
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Detailed feature comparison to help you choose the right plan.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border bg-card">
            <thead>
              <tr className="border-b border-border">
                <th className="p-4 text-left font-semibold text-foreground">Features</th>
                <th className="p-4 text-center font-semibold text-foreground">Hobby</th>
                <th className="p-4 text-center font-semibold text-foreground">Pro</th>
                <th className="p-4 text-center font-semibold text-foreground">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_FEATURES.map((item) => (
                <tr key={item.feature} className="border-b border-border/50">
                  <td className="p-4 font-medium text-foreground">{item.feature}</td>
                  <td className="p-4 text-center text-muted-foreground">
                    {typeof item.hobby === 'boolean' ? (
                      item.hobby ? <CheckIcon className="mx-auto size-5 text-primary" /> : <XIcon className="mx-auto size-5 text-muted-foreground" />
                    ) : (
                      item.hobby
                    )}
                  </td>
                  <td className="p-4 text-center text-muted-foreground">
                    {typeof item.pro === 'boolean' ? (
                      item.pro ? <CheckIcon className="mx-auto size-5 text-primary" /> : <XIcon className="mx-auto size-5 text-muted-foreground" />
                    ) : (
                      item.pro
                    )}
                  </td>
                  <td className="p-4 text-center text-muted-foreground">
                    {typeof item.enterprise === 'boolean' ? (
                      item.enterprise ? <CheckIcon className="mx-auto size-5 text-primary" /> : <XIcon className="mx-auto size-5 text-muted-foreground" />
                    ) : (
                      item.enterprise
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
