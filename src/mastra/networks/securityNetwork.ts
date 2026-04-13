import { Agent } from '@mastra/core/agent'
import { createScorer } from '@mastra/core/evals'
import {
  extractAgentResponseMessages,
  extractInputMessages,
  extractToolCalls,
  getAssistantMessageFromRunOutput,
  getCombinedSystemPrompt,
  getReasoningFromRunOutput,
  getSystemMessagesFromRunInput,
  getUserMessageFromRunInput,
} from '@mastra/evals/scorers/utils'
import { codeReviewerAgent } from '../agents/codingAgents'
import { evaluationAgent } from '../agents/evaluationAgent'
import { reportAgent } from '../agents/reportAgent'
import { researchAgent } from '../agents/researchAgent'
import { googleAI3 } from '../config/google'
import { log } from '../config/logger'
import { LibsqlMemory } from '../config/libsql'

log.info('Initializing Security Network...')

/**
 * Checks that the security network returns a concrete assessment, mitigation,
 * or reporting outcome instead of only generic security posture language.
 */
const securityNetworkTaskCompleteScorer = createScorer({
  id: 'security-network-task-complete',
  name: 'Security Network Task Completeness',
  description:
    'Checks whether the security network returned actionable security findings or mitigation guidance.',
  type: 'agent',
})
  .preprocess(({ run }) => {
    const userMessage = getUserMessageFromRunInput(run.input)
    const inputMessages = extractInputMessages(run.input)
    const systemMessages = getSystemMessagesFromRunInput(run.input)
    const systemPrompt = getCombinedSystemPrompt(run.input)
    const response = getAssistantMessageFromRunOutput(run.output)
    const responseMessages = extractAgentResponseMessages(run.output)
    const reasoning = getReasoningFromRunOutput(run.output)
    const { tools, toolCallInfos } = extractToolCalls(run.output)

    return {
      userMessage,
      inputMessages,
      systemMessages,
      systemPrompt,
      response,
      responseMessages,
      reasoning,
      tools,
      toolCallInfos,
    }
  })
  .analyze(({ results }) => {
    const {
      userMessage,
      inputMessages,
      systemMessages,
      systemPrompt,
      response,
      responseMessages,
      reasoning,
      tools,
      toolCallInfos,
    } = results.preprocessStepResult

    const responseText = (response ?? responseMessages.join('\n')).trim()

    return {
      hasUserMessage: Boolean(userMessage),
      inputMessageCount: inputMessages.length,
      systemMessageCount: systemMessages.length,
      systemPromptLength: systemPrompt.length,
      responseLength: responseText.length,
      hasResponse: responseText.length > 0,
      hasReasoning: Boolean(reasoning),
      toolCount: tools.length,
      toolCallCount: toolCallInfos.length,
      hasSecurityLanguage:
        /security|vulnerability|risk|mitigation|compliance|incident|control|assessment|finding/i.test(
          responseText
        ),
      hasStructure:
        /^[-*]\s|^\d+\.\s|^#{1,6}\s/m.test(responseText),
    }
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) return 0

    let score = 0
    if (analysis.responseLength >= 80) score += 0.2
    if (analysis.responseLength >= 160) score += 0.1
    if (analysis.hasSecurityLanguage) score += 0.4
    if (analysis.hasStructure) score += 0.15
    if (analysis.hasReasoning) score += 0.05
    if (analysis.toolCount > 0) score += 0.05

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) return 'No usable security response was produced.'

    const parts: string[] = []
    if (analysis.hasSecurityLanguage) parts.push('it includes security or risk language')
    if (analysis.hasStructure) parts.push('it is structured for handoff')

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This security response is strong because ${parts.join(', ')}.` : 'The response is present but still needs mitigation detail.'}`
  })

/**
 * Checks that the security answer is remediation-ready with priority, impact,
 * and next mitigation actions.
 */
const securityNetworkRemediationScorer = createScorer({
  id: 'security-network-remediation-readiness',
  name: 'Security Network Remediation Readiness',
  description:
    'Checks whether the security response includes severity, mitigation, and follow-up guidance.',
  type: 'agent',
})
  .preprocess(({ run }) => {
    const userMessage = getUserMessageFromRunInput(run.input)
    const inputMessages = extractInputMessages(run.input)
    const systemMessages = getSystemMessagesFromRunInput(run.input)
    const systemPrompt = getCombinedSystemPrompt(run.input)
    const response = getAssistantMessageFromRunOutput(run.output)
    const responseMessages = extractAgentResponseMessages(run.output)
    const reasoning = getReasoningFromRunOutput(run.output)
    const { tools, toolCallInfos } = extractToolCalls(run.output)

    return {
      userMessage,
      inputMessages,
      systemMessages,
      systemPrompt,
      response,
      responseMessages,
      reasoning,
      tools,
      toolCallInfos,
    }
  })
  .analyze(({ results }) => {
    const {
      userMessage,
      inputMessages,
      systemMessages,
      systemPrompt,
      response,
      responseMessages,
      reasoning,
      tools,
      toolCallInfos,
    } = results.preprocessStepResult

    const responseText = (response ?? responseMessages.join('\n')).trim()

    return {
      hasUserMessage: Boolean(userMessage),
      inputMessageCount: inputMessages.length,
      systemMessageCount: systemMessages.length,
      systemPromptLength: systemPrompt.length,
      responseLength: responseText.length,
      hasResponse: responseText.length > 0,
      hasReasoning: Boolean(reasoning),
      toolCount: tools.length,
      toolCallCount: toolCallInfos.length,
      hasSeverity:
        /critical|high|medium|low|severity|priority/i.test(responseText),
      hasMitigation:
        /mitigation|fix|control|remediation|contain/i.test(responseText),
      hasFollowUp:
        /next step|owner|monitor|validate|follow-up/i.test(responseText),
      hasStructure:
        /^[-*]\s|^\d+\.\s|^#{1,6}\s/m.test(responseText),
    }
  })
  .generateScore(({ results }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) return 0

    let score = 0
    if (analysis.responseLength >= 160) score += 0.2
    if (analysis.responseLength >= 280) score += 0.1
    if (analysis.hasSeverity) score += 0.2
    if (analysis.hasMitigation) score += 0.25
    if (analysis.hasFollowUp) score += 0.2
    if (analysis.hasStructure) score += 0.05
    if (analysis.hasReasoning) score += 0.03
    if (analysis.toolCount > 0) score += 0.02

    return Math.max(0, Math.min(1, score))
  })
  .generateReason(({ results, score }) => {
    const analysis = results.analyzeStepResult
    if (!analysis?.hasResponse) return 'No usable security remediation response was produced.'

    const parts: string[] = []
    if (analysis.hasSeverity) parts.push('it classifies severity or priority')
    if (analysis.hasMitigation) parts.push('it includes mitigation or remediation guidance')
    if (analysis.hasFollowUp) parts.push('it includes follow-up or monitoring steps')

    return `Score: ${score.toFixed(2)}. ${parts.length > 0 ? `This remediation response is strong because ${parts.join(', ')}.` : 'The response is present but still needs concrete remediation detail.'}`
  })

export const securityNetwork = new Agent({
  id: 'security-network',
  name: 'Security Network',
  description:
    'Provides comprehensive security assessment, vulnerability management, compliance monitoring, and security best practices implementation.',
  instructions: `You are a Chief Information Security Officer (CISO). Your role is to establish and maintain comprehensive security programs that protect organizational assets, ensure compliance, and manage cyber risks.

## Security Assessment Capabilities

### Code Security Analysis
- **Static Application Security Testing (SAST)**: Automated code vulnerability scanning
- **Software Composition Analysis (SCA)**: Third-party component vulnerability assessment
- **Secrets Detection**: API keys, passwords, and sensitive data identification
- **Code Review Security**: Security-focused code review and recommendations

### Infrastructure Security
- **Configuration Management**: Secure configuration validation and hardening
- **Container Security**: Image scanning, runtime protection, and compliance
- **Cloud Security**: CSPM, cloud configuration security, and access management
- **Network Security**: Firewall configuration, intrusion detection, and segmentation

### Compliance & Governance
- **Regulatory Compliance**: GDPR, HIPAA, PCI-DSS, SOX compliance monitoring
- **Security Frameworks**: NIST, ISO 27001, CIS Controls implementation
- **Audit Preparation**: Automated evidence collection and compliance reporting
- **Risk Assessment**: Security risk identification and prioritization

### Threat Detection & Response
- **Vulnerability Management**: Automated scanning, prioritization, and remediation
- **Incident Response**: Automated alerting, triage, and response coordination
- **Threat Intelligence**: External threat monitoring and internal threat hunting
- **Forensic Analysis**: Security event investigation and root cause analysis

## Security Program Management

### Security Operations Center (SOC)
- **24/7 Monitoring**: Continuous security monitoring and alerting
- **Threat Detection**: Advanced threat detection using AI and machine learning
- **Incident Response**: Coordinated incident response and communication
- **Security Analytics**: Log analysis, correlation, and threat pattern identification

### Vulnerability Management
- **Asset Discovery**: Automated asset inventory and classification
- **Vulnerability Scanning**: Regular automated vulnerability assessments
- **Risk Prioritization**: CVSS scoring, exploitability assessment, and business impact analysis
- **Remediation Tracking**: Vulnerability remediation progress and effectiveness monitoring

### Identity & Access Management
- **Access Control**: Role-based access control (RBAC) and least privilege implementation
- **Multi-Factor Authentication**: MFA enforcement and management
- **Identity Governance**: User lifecycle management and access certification
- **Privileged Access Management**: Administrative access control and monitoring

### Data Protection
- **Data Classification**: Sensitive data identification and classification
- **Encryption**: Data at rest and in transit encryption management
- **Data Loss Prevention**: DLP policy enforcement and monitoring
- **Privacy Compliance**: Data privacy regulation compliance and breach notification

## Integration with Security Agents

### Code Security Network
- Use codeReviewerAgent for automated security code reviews
- Integrate security scanning into development pipelines
- Provide security feedback during code development

### Compliance Network
- Use evaluationAgent for compliance assessment and gap analysis
- Automate compliance evidence collection and reporting
- Monitor regulatory changes and update compliance programs

### Threat Intelligence Network
- Use researchAgent for threat intelligence gathering and analysis
- Monitor security advisories and vulnerability disclosures
- Provide threat context and impact assessments

### Reporting Network
- Use reportAgent for security dashboards and executive reporting
- Generate compliance reports and security posture assessments
- Create incident reports and security metrics dashboards

## Security Frameworks & Standards

### NIST Cybersecurity Framework
- **Identify**: Asset management, risk assessment, and supply chain risk management
- **Protect**: Access control, data security, and protective technology implementation
- **Detect**: Continuous monitoring, detection processes, and anomaly detection
- **Respond**: Response planning, communications, and analysis capabilities
- **Recover**: Recovery planning, improvements, and communications

### ISO 27001 Information Security
- **Information Security Policies**: Security policy development and communication
- **Organization of Information Security**: Internal organization and mobile devices
- **Human Resources Security**: Prior to employment, during employment, and termination
- **Asset Management**: Responsibility for assets and information classification
- **Access Control**: Business requirements, user access management, and access rights
- **Cryptography**: Cryptographic controls and key management
- **Physical and Environmental Security**: Secure areas and equipment security
- **Operations Security**: Operational procedures and protections, system acceptance
- **Communications Security**: Network security management and information transfer
- **System Acquisition, Development and Maintenance**: Security requirements and secure development
- **Supplier Relationships**: Information security in supplier relationships
- **Information Security Incident Management**: Reporting and response procedures
- **Information Security Aspects of Business Continuity**: Planning and testing
- **Compliance**: Compliance with legal and regulatory requirements

## DevSecOps Integration

### Security in CI/CD
- **Automated Security Testing**: SAST, DAST, and SCA in pipelines
- **Security Gates**: Automated approval processes for security requirements
- **Vulnerability Remediation**: Automated patching and dependency updates
- **Security Training**: Developer security awareness and training programs

### Infrastructure Security
- **Infrastructure as Code Security**: Secure IaC template validation
- **Container Security**: Image scanning and runtime security monitoring
- **Cloud Security**: Cloud configuration validation and compliance monitoring
- **Network Security**: Automated firewall rule management and validation

## Security Metrics & KPIs

### Security Posture Metrics
- **Mean Time to Detect (MTTD)**: Average time to detect security incidents
- **Mean Time to Respond (MTTR)**: Average time to respond to security incidents
- **Security Incident Volume**: Number and severity of security incidents
- **Vulnerability Remediation Time**: Average time to remediate vulnerabilities

### Compliance Metrics
- **Compliance Score**: Percentage of compliance requirements met
- **Audit Findings**: Number and severity of audit findings
- **Policy Compliance**: Percentage of systems meeting security policies
- **Training Completion**: Percentage of personnel completing security training

### Operational Metrics
- **System Availability**: Uptime and service level agreement compliance
- **Patch Management**: Percentage of systems with current security patches
- **Access Management**: Percentage of accounts with proper access controls
- **Security Awareness**: Employee security awareness and phishing simulation results

## Response Guidelines

- Always assess current security posture and identify critical gaps
- Provide risk-based prioritization for security initiatives
- Include business context and impact assessment in recommendations
- Suggest practical implementation approaches with clear timelines
- Include training and awareness components in security programs
- Provide compliance mapping and regulatory guidance
- Recommend security metrics and monitoring approaches
- Include incident response planning and testing procedures

## Final Answer Contract

- Start with the most important security finding or posture conclusion.
- Present severity, business impact, and remediation options clearly.
- End with the next mitigation step, validation action, or residual-risk note.
`,
  model: googleAI3,
  memory: LibsqlMemory,
  agents: {
    codeReviewerAgent,
    evaluationAgent,
    researchAgent,
    reportAgent,
  },

  //   tools: { confirmationTool },
  options: {},
  //  defaultNetworkOptions: { autoResumeSuspendedTools: true } as unknown as any,
  outputProcessors: [
 //   new TokenLimiterProcessor(128000),
    //  new BatchPartsProcessor({
    //      batchSize: 20,
    //      maxWaitTime: 100,
    //      emitOnNonText: true,
    //  }),
  ],
  defaultOptions: {
    maxSteps: 18,
    delegation: {
      onDelegationStart: async context => {
        log.info('Security network delegating', {
          primitiveId: context.primitiveId,
          iteration: context.iteration,
        })

        await Promise.resolve()

        if (context.primitiveId === 'codeReviewerAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nPrioritize exploitable security findings, severity, impact, and concrete remediation steps over stylistic observations.`,
          }
        }

        if (context.primitiveId === 'evaluationAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nEvaluate the security posture for completeness, control coverage, residual risk, and compliance gaps with explicit rationale.`,
          }
        }

        if (context.primitiveId === 'researchAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nGather security-relevant advisories, standards, and threat context that materially affect the recommendation.`,
          }
        }

        if (context.primitiveId === 'reportAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nProduce an executive-ready security report with prioritized findings, impact, mitigation timeline, and residual risk notes.`,
          }
        }

        return { proceed: true }
      },
      onDelegationComplete: async context => {
        log.info('Security delegation complete', {
          primitiveId: context.primitiveId,
          success: context.success,
          duration: context.duration,
        })

        if (context.error) {
          context.bail()
          await Promise.resolve()
          return {
            feedback: `Delegation to ${context.primitiveId} failed: ${String(context.error)}. Continue with the validated findings and clearly note the remaining security uncertainty.`,
          }
        }

        await Promise.resolve()
      },
      messageFilter: ({ messages }) => {
        return messages
          .filter(
            message =>
              !message.content.parts.some(part => part.type === 'tool-invocation')
          )
          .slice(-6)
      },
    },
    isTaskComplete: {
      scorers: [securityNetworkTaskCompleteScorer, securityNetworkRemediationScorer],
      strategy: 'any',
      parallel: true,
      onComplete: async result => {
        log.info('Security completion check', {
          complete: result.complete,
          score: result.scorers[0]?.score,
        })
        await Promise.resolve()
      },
      suppressFeedback: false,
    },
  },
})

log.info('Security Network initialized')
