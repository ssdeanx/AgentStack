import { Agent } from '@mastra/core/agent'
import {
  codeArchitectAgent,
  codeReviewerAgent,
  refactoringAgent,
  testEngineerAgent,
} from '../agents/codingAgents'
import { evaluationAgent } from '../agents/evaluationAgent'
import { danePackagePublisher } from '../agents/package-publisher'
import { projectManagementAgent } from '../agents/projectManagementAgent'
import { log } from '../config/logger'
import { createSupervisorPatternScorer } from '../scorers/supervisor-scorers'
import { confirmationTool } from '../tools/confirmation.tool'
import { LibsqlMemory } from '../config/libsql'
log.info('Initializing DevOps Network...')

/**
 * Checks that the DevOps network returns a deployable, testable, or operable
 * recommendation set instead of generic platform advice.
 */
const devopsNetworkTaskCompleteScorer = createSupervisorPatternScorer({
  id: 'devops-network-task-complete',
  name: 'DevOps Network Task Completeness',
  description:
    'Checks whether the DevOps network returned a concrete delivery, deployment, or operations result.',
  label: 'DevOps response',
  emptyReason: 'No usable DevOps response was produced.',
  weakReason: 'The response is present but still needs delivery detail.',
  strongReasonPrefix: 'This DevOps response is strong because',
  signals: [
    {
      label: 'it includes DevOps-specific guidance',
      regex:
        /deploy|pipeline|release|monitor|infrastructure|ci\/cd|incident|rollback|test|package/i,
      weight: 0.35,
    },
    {
      label: 'it includes operational or rollout detail',
      regex: /monitor|rollback|incident|deploy|release|rollback|health|validation/i,
      weight: 0.1,
    },
  ],
  responseLengthThresholds: [
    { min: 80, weight: 0.2 },
    { min: 160, weight: 0.1 },
  ],
  minParagraphsForStructure: 999,
  structureWeight: 0.15,
  reasoningWeight: 0.05,
  toolWeight: 0.05,
})

/**
 * Checks that the DevOps answer is operationally actionable with rollout,
 * validation, and risk-management guidance.
 */
const devopsNetworkExecutionScorer = createSupervisorPatternScorer({
  id: 'devops-network-execution-readiness',
  name: 'DevOps Network Execution Readiness',
  description:
    'Checks whether the DevOps response includes rollout steps, validation gates, and operational risk guidance.',
  label: 'DevOps execution response',
  emptyReason: 'No usable DevOps execution response was produced.',
  weakReason: 'The response is present but still lacks operational detail.',
  strongReasonPrefix: 'This execution plan is strong because',
  signals: [
    {
      label: 'it includes deployment or rollout guidance',
      regex: /deploy|release|rollout|pipeline|gate/i,
      weight: 0.25,
    },
    {
      label: 'it includes validation gates or checks',
      regex: /monitor|verify|smoke test|rollback|incident/i,
      weight: 0.2,
    },
    {
      label: 'it names owners, milestones, or risks',
      regex: /next step|owner|milestone|risk/i,
      weight: 0.2,
    },
  ],
  responseLengthThresholds: [
    { min: 160, weight: 0.2 },
    { min: 280, weight: 0.1 },
  ],
  minParagraphsForStructure: 999,
  structureWeight: 0.05,
  reasoningWeight: 0.03,
  toolWeight: 0.02,
})

export const devopsNetwork = new Agent({
  id: 'devops-network',
  name: 'DevOps Network',
  description:
    'Manages software development lifecycle from planning to deployment, including testing, CI/CD, monitoring, and infrastructure management.',
  instructions: `You are a DevOps Engineering Lead. Your role is to orchestrate the complete software delivery pipeline, from development planning through production deployment and monitoring.

## DevOps Lifecycle Management

### Development Phase
- **Planning & Architecture**: Technical planning, system design, infrastructure requirements
- **Code Development**: Feature development, code reviews, quality assurance
- **Testing Strategy**: Unit testing, integration testing, automated test suites
- **Code Quality**: Static analysis, security scanning, performance optimization

### Integration Phase
- **Continuous Integration**: Automated builds, dependency management, artifact creation
- **Code Review Process**: Automated checks, peer reviews, approval workflows
- **Quality Gates**: Automated testing, security scans, performance benchmarks
- **Merge Management**: Branch strategies, conflict resolution, release planning

### Deployment Phase
- **Release Management**: Version control, release planning, deployment automation
- **Environment Management**: Development, staging, production environment configuration
- **Infrastructure as Code**: Automated infrastructure provisioning and configuration
- **Container Orchestration**: Docker, Kubernetes, service mesh management

### Operations Phase
- **Monitoring & Observability**: System monitoring, log aggregation, performance tracking
- **Incident Management**: Alerting, incident response, post-mortem analysis
- **Security Operations**: Vulnerability management, compliance monitoring, access control
- **Performance Optimization**: System tuning, capacity planning, cost optimization

## Development Workflow Orchestration

### CI/CD Pipeline Management
- **Build Automation**: Compile, test, package, and deploy applications
- **Environment Promotion**: Automated promotion through dev → staging → production
- **Rollback Strategies**: Automated rollback procedures and data recovery
- **Deployment Verification**: Health checks, smoke tests, integration validation

### Quality Assurance Integration
- **Automated Testing**: Unit, integration, end-to-end, and performance testing
- **Security Testing**: SAST, DAST, dependency scanning, container security
- **Code Quality Metrics**: Coverage reports, complexity analysis, maintainability scores
- **Performance Benchmarking**: Load testing, stress testing, scalability validation

### Infrastructure Automation
- **Cloud Resource Management**: Auto-scaling, cost optimization, resource provisioning
- **Configuration Management**: Infrastructure as code, configuration drift detection
- **Service Orchestration**: Microservices coordination, API gateway management
- **Disaster Recovery**: Backup automation, failover procedures, business continuity

## Integration with Development Agents

### Coding Team Network
- Use codeArchitectAgent for system design and technical planning
- Use codeReviewerAgent for automated code quality checks
- Use testEngineerAgent for comprehensive testing strategy development
- Use refactoringAgent for code optimization and technical debt management

### Project Management Network
- Use projectManagementAgent for sprint planning and release coordination
- Integrate development milestones with project timelines
- Coordinate cross-team dependencies and delivery schedules

### Quality Assurance Network
- Use evaluationAgent for code quality assessment and metrics
- Implement automated quality gates and approval processes
- Monitor development velocity and quality trends

### Release Management Network
- Use packagePublisher for automated package publishing and distribution
- Manage version control and release artifact creation
- Coordinate deployment windows and maintenance schedules

## DevOps Best Practices Implementation

### Infrastructure as Code
- **Version Control**: All infrastructure changes versioned and reviewed
- **Automated Provisioning**: Self-service infrastructure provisioning
- **Configuration Drift**: Automated detection and remediation
- **Documentation**: Auto-generated infrastructure documentation

### Continuous Integration
- **Fast Feedback**: Rapid build and test cycles with immediate feedback
- **Parallel Processing**: Concurrent testing and validation pipelines
- **Artifact Management**: Secure artifact storage and distribution
- **Dependency Management**: Automated dependency updates and security patching

### Continuous Deployment
- **Automated Deployments**: Zero-touch deployment to production
- **Feature Flags**: Gradual feature rollout and A/B testing capabilities
- **Canary Deployments**: Risk-free deployment with automatic rollback
- **Blue-Green Deployments**: Zero-downtime deployment strategies

### Monitoring & Observability
- **Application Metrics**: Performance, error rates, user experience tracking
- **Infrastructure Monitoring**: Resource utilization, system health, capacity planning
- **Log Aggregation**: Centralized logging with search and analytics
- **Alert Management**: Intelligent alerting with automated incident response

## Security Integration

### DevSecOps Implementation
- **Security Testing**: Automated security scans in CI/CD pipeline
- **Vulnerability Management**: Automated patching and vulnerability remediation
- **Compliance Automation**: Policy as code, automated compliance checking
- **Access Control**: Role-based access, least privilege principles

### Security Monitoring
- **Threat Detection**: Real-time security monitoring and anomaly detection
- **Incident Response**: Automated incident triage and response procedures
- **Forensic Analysis**: Security event logging and investigation capabilities
- **Compliance Reporting**: Automated security and compliance reporting

## Performance Optimization

### Application Performance
- **Load Testing**: Automated performance testing and bottleneck identification
- **Performance Monitoring**: Real-time performance tracking and alerting
- **Optimization Recommendations**: Automated performance improvement suggestions
- **Capacity Planning**: Predictive scaling based on usage patterns

### Infrastructure Optimization
- **Cost Optimization**: Automated resource right-sizing and cost management
- **Energy Efficiency**: Sustainable infrastructure practices and optimization
- **Scalability Planning**: Automated scaling policies and capacity management
- **Resource Utilization**: Optimal resource allocation and workload placement

## Response Guidelines

- Always assess current development maturity and recommend appropriate DevOps practices
- Provide detailed pipeline architectures with specific tool recommendations
- Include security considerations and compliance requirements in all recommendations
- Suggest monitoring and alerting strategies for each component
- Provide cost-benefit analysis for DevOps investments and automation
- Include migration strategies for organizations moving to DevOps practices
- Recommend training and organizational change management approaches

## Final Answer Contract

- Open with the delivery or operations recommendation.
- Present rollout steps, quality gates, and operational safeguards clearly.
- End with monitoring expectations, rollback posture, and the next execution milestone.
`,
  model: "google/gemini-3.1-flash-lite-preview",
  memory: LibsqlMemory,
  agents: {
    codeArchitectAgent,
    codeReviewerAgent,
    testEngineerAgent,
    refactoringAgent,
    danePackagePublisher,
    projectManagementAgent,
    evaluationAgent,
  },
  options: {},
  tools: { confirmationTool },
  outputProcessors: [
//    new TokenLimiterProcessor(128000),
    //  new BatchPartsProcessor({
    //      batchSize: 20,
    //      maxWaitTime: 100,
    //     emitOnNonText: true,
    //  }),
  ],
  defaultOptions: {
    maxSteps: 20,
    delegation: {
      onDelegationStart: async context => {
        log.info('DevOps network delegating', {
          primitiveId: context.primitiveId,
          iteration: context.iteration,
        })

        await Promise.resolve()

        if (context.primitiveId === 'codeArchitectAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nFocus on delivery architecture, environment boundaries, deployment topology, and operational trade-offs.`,
          }
        }

        if (context.primitiveId === 'codeReviewerAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nPrioritize release blockers, security issues, CI/CD risks, and maintainability concerns that impact shipping safely.`,
          }
        }

        if (context.primitiveId === 'testEngineerAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nReturn an execution-ready test plan covering CI gates, smoke tests, regression risks, and deployment verification steps.`,
          }
        }

        if (context.primitiveId === 'refactoringAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nRefactor toward operational simplicity, automation, and lower release risk without changing intended behavior.`,
          }
        }

        if (context.primitiveId === 'danePackagePublisher') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nReturn packaging and release guidance with versioning, publication risks, and the exact release prerequisites.`,
          }
        }

        if (context.primitiveId === 'projectManagementAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nTranslate the DevOps work into milestones, owners, dependencies, rollout sequencing, and incident-ready contingency steps.`,
          }
        }

        if (context.primitiveId === 'evaluationAgent') {
          return {
            proceed: true,
            modifiedPrompt: `${context.prompt}\n\nEvaluate the plan with delivery risk, quality-gate readiness, and measurable success criteria.`,
          }
        }

        return { proceed: true }
      },
      onDelegationComplete: async context => {
        log.info('DevOps delegation complete', {
          primitiveId: context.primitiveId,
          success: context.success,
          duration: context.duration,
        })

        if (context.error) {
          context.bail()
          await Promise.resolve()
          return {
            feedback: `Delegation to ${context.primitiveId} failed: ${String(context.error)}. Continue with a smaller deployment slice or the next safest operational step.`,
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
      scorers: [devopsNetworkTaskCompleteScorer, devopsNetworkExecutionScorer],
      strategy: 'any',
      parallel: true,
      onComplete: async result => {
        log.info('DevOps completion check', {
          complete: result.complete,
          score: result.scorers[0]?.score,
        })
        await Promise.resolve()
      },
      suppressFeedback: false,
    },
  },
})

log.info('DevOps Network initialized')
