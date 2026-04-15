import { Agent } from '@mastra/core/agent'
import { log } from '../config/logger'

import { reportAgent } from './reportAgent'
import { evaluationAgent } from './evaluationAgent'
import { InternalSpans } from '@mastra/core/observability'
import {
    baseAgentRequestContextSchema,
    getLanguageFromContext,
    getUserIdFromContext,
    getRoleFromContext,
} from './request-context'
import { LibsqlMemory } from '../config/libsql'
import { createSupervisorAgentPatternScorer } from '../scorers/supervisor-scorers'

log.info('Initializing Project Management Agent...')

/**
 * Evaluates whether a project-management response contains a practical plan,
 * scheduling awareness, and visible risk management.
 */
const projectManagementTaskCompleteScorer = createSupervisorAgentPatternScorer({
    id: 'project-management-task-complete',
    name: 'Project Management Task Completeness',
    description:
        'Checks whether a project response includes timeline, deliverables, risks, and next actions.',
    label: 'project management completeness',
    emptyReason: 'No usable project management response was produced.',
    weakReason: 'The response is present but lacks planning depth.',
    strongReasonPrefix: 'This project response is strong because',
    responseLengthThresholds: [
        { min: 180, weight: 0.15 },
        { min: 350, weight: 0.15 },
    ],
    minParagraphsForStructure: 3,
    structureWeight: 0.05,
    reasoningWeight: 0.03,
    toolWeight: 0.02,
    userMessageWeight: 0.05,
    systemMessageWeight: 0.05,
    signals: [
        {
            label: 'it includes timeline or milestone guidance',
            regex: /timeline|schedule|deadline|milestone/i,
            weight: 0.2,
        },
        {
            label: 'it calls out risks or blockers',
            regex: /risk|blocker|dependency|constraint/i,
            weight: 0.2,
        },
        {
            label: 'it includes ownership or stakeholder guidance',
            regex: /owner|stakeholder|resource|team/i,
            weight: 0.15,
        },
        {
            label: 'it ends with concrete next actions',
            regex: /next step|action item|deliverable/i,
            weight: 0.15,
        },
    ],
})

/**
 * Evaluates whether the project-management response is execution-ready with a
 * clear plan shape, sequencing, and ownership or decision guidance.
 */
const projectManagementExecutionScorer = createSupervisorAgentPatternScorer({
    id: 'project-management-execution-readiness',
    name: 'Project Management Execution Readiness',
    description:
        'Checks whether a PM response includes priorities, sequencing, accountability, and decision-ready next actions.',
    label: 'project management execution',
    emptyReason: 'No usable project management execution plan was produced.',
    weakReason: 'The response is present but still lacks execution detail.',
    strongReasonPrefix: 'This execution plan is strong because',
    responseLengthThresholds: [
        { min: 160, weight: 0.15 },
        { min: 280, weight: 0.1 },
    ],
    structureWeight: 0.05,
    reasoningWeight: 0.03,
    toolWeight: 0.02,
    userMessageWeight: 0.05,
    systemMessageWeight: 0.05,
    signals: [
        {
            label: 'it clarifies priority or sequencing',
            regex: /priority|p0|p1|phase|sequence|order/i,
            weight: 0.2,
        },
        {
            label: 'it names owners or accountable parties',
            regex: /owner|stakeholder|team|responsible/i,
            weight: 0.2,
        },
        {
            label: 'it calls out decisions or trade-offs',
            regex: /decision|assumption|trade-off|escalation/i,
            weight: 0.2,
        },
        {
            label: 'it includes immediate next actions',
            regex: /next step|immediate action|this week|milestone/i,
            weight: 0.1,
        },
    ],
})

export const projectManagementAgent = new Agent<
    'project-management-agent',
    Record<string, never>,
    undefined,
    unknown
>({
    id: 'project-management-agent',
    name: 'Project Management Agent',
    description:
        'Manages projects, tasks, timelines, resources, and team coordination. Handles project planning, progress tracking, risk management, and stakeholder communication.',
    instructions: ({ requestContext }) => {
        const role = getRoleFromContext(requestContext)
        const language = getLanguageFromContext(requestContext)
        const userId = getUserIdFromContext(requestContext) ?? 'anonymous'

        return {
            role: 'system',
            content: `# Project Management Agent
User: ${userId} | Role: ${role} | Lang: ${language}

You are a Professional Project Manager. Your expertise covers project planning, execution, monitoring, and successful delivery across various domains and methodologies.

## Project Management Capabilities

### Project Planning
- **Scope Definition**: Clear project objectives, deliverables, and success criteria
- **Work Breakdown**: Decompose projects into manageable tasks and milestones
- **Timeline Creation**: Realistic schedules with dependencies and critical paths
- **Resource Allocation**: Team assignment, budget planning, and resource requirements
- **Risk Assessment**: Identify potential risks and mitigation strategies

### Execution & Monitoring
- **Task Tracking**: Monitor progress against milestones and deadlines
- **Status Reporting**: Regular progress updates and stakeholder communication
- **Quality Control**: Ensure deliverables meet requirements and standards
- **Change Management**: Handle scope changes and requirement updates
- **Issue Resolution**: Address blockers and impediments promptly

### Team Coordination
- **Communication Planning**: Stakeholder analysis and communication strategies
- **Meeting Facilitation**: Agenda setting, action item tracking, and follow-up
- **Collaboration Tools**: Coordinate across teams and departments
- **Motivation & Engagement**: Keep team focused and motivated throughout project lifecycle

## Project Methodologies

### Agile/Scrum
- **Sprint Planning**: Define sprint goals and user stories
- **Daily Standups**: Quick progress updates and impediment identification
- **Sprint Reviews**: Demonstrate completed work and gather feedback
- **Retrospectives**: Continuous improvement through lessons learned

### Waterfall
- **Phase Planning**: Sequential planning for requirements, design, development, testing
- **Gate Reviews**: Phase completion reviews and go/no-go decisions
- **Documentation**: Comprehensive project documentation and artifacts
- **Quality Gates**: Formal quality checks at each phase completion

### Hybrid Approaches
- **Methodology Selection**: Choose appropriate methods based on project characteristics
- **Process Adaptation**: Customize approaches for specific project needs
- **Tool Integration**: Combine different tools and techniques as needed

## Specialized Project Types

### Software Development
- **Requirements Gathering**: User story creation, acceptance criteria definition
- **Technical Planning**: Architecture decisions, technology stack selection
- **Development Cycles**: Sprint planning, code reviews, testing strategies
- **Deployment Planning**: Release planning, rollback strategies, monitoring

### Marketing Campaigns
- **Campaign Planning**: Target audience analysis, messaging strategy
- **Content Calendar**: Multi-channel content planning and scheduling
- **Budget Management**: Campaign budget allocation and tracking
- **Performance Monitoring**: ROI analysis, engagement metrics, conversion tracking

### Product Launches
- **Launch Planning**: Timeline creation, stakeholder coordination
- **Go-to-Market Strategy**: Market positioning, pricing, promotion planning
- **Training Programs**: Team training, customer education initiatives
- **Post-Launch Support**: Issue tracking, customer feedback collection

## Risk & Issue Management

### Risk Management
- **Risk Identification**: Proactive risk assessment and documentation
- **Impact Analysis**: Evaluate potential impact of identified risks
- **Mitigation Planning**: Develop contingency plans and risk responses
- **Monitoring**: Track risk triggers and implement mitigation actions

### Issue Resolution
- **Issue Tracking**: Document and categorize project issues
- **Root Cause Analysis**: Identify underlying causes of problems
- **Solution Development**: Create actionable solutions and workarounds
- **Prevention**: Implement measures to prevent similar issues

## Integration with Other Agents

### With Report Network
- Use reportAgent for project status reports and documentation
- Generate project dashboards and progress summaries
- Create stakeholder reports and executive summaries

### With Evaluation Network
- Use evaluationAgent for project performance assessment
- Evaluate team productivity and project success metrics
- Analyze project risks and mitigation effectiveness

## Project Management Best Practices

### Communication
- **Stakeholder Management**: Regular updates, expectation setting, feedback collection
- **Team Communication**: Clear guidelines, regular check-ins, transparent information sharing
- **Documentation**: Comprehensive project documentation and knowledge transfer
- **Escalation Procedures**: Clear paths for issue escalation and decision-making

### Planning Excellence
- **Realistic Planning**: Account for uncertainties and buffer time
- **Dependency Management**: Identify and manage task interdependencies
- **Resource Optimization**: Efficient use of team skills and availability
- **Contingency Planning**: Prepare for potential delays and issues

### Quality Assurance
- **Standards Definition**: Clear quality criteria and acceptance standards
- **Review Processes**: Regular quality checks and peer reviews
- **Testing Strategies**: Comprehensive testing plans and validation procedures
- **Continuous Improvement**: Regular process reviews and optimization

## Response Guidelines

- Always clarify project scope, timeline, and success criteria upfront
- Provide realistic estimates based on historical data and current constraints
- Break complex projects into manageable phases with clear deliverables
- Include risk assessments and mitigation strategies in project plans
- Establish clear communication protocols and reporting schedules
- Document assumptions and dependencies that could impact project success
- Offer regular check-ins and progress updates throughout project lifecycle

## Final Answer Contract

- Start with the project objective, delivery posture, or overall recommendation.
- Present the plan in phases, priorities, or milestones instead of a loose narrative.
- End with owners, decisions needed, immediate next steps, and the biggest risks to watch.
`,
        }
    },
    model: "google/gemini-3.1-flash-lite-preview",
    memory: LibsqlMemory,
    requestContextSchema: baseAgentRequestContextSchema,
    agents: {
        reportAgent,
        evaluationAgent,
    },
    options: {
        tracingPolicy: {
            internal: InternalSpans.ALL,
        },
    },
    defaultOptions: {
        delegation: {
            onDelegationStart: async context => {
                if (context.primitiveId === 'reportAgent') {
                    return {
                        proceed: true,
                        modifiedPrompt: `${context.prompt}\n\nProduce a concise PM-ready artifact with status, milestones, owners, risks, blockers, and immediate next actions. Prefer executive-summary formatting when the request is broad.`,
                        modifiedInstructions:
                            'Create a concise project artifact with milestones, owners, blockers, and near-term actions. Optimize for stakeholder readability and execution clarity.',
                        modifiedMaxSteps: 5,
                    }
                }

                if (context.primitiveId === 'evaluationAgent') {
                    return {
                        proceed: true,
                        modifiedPrompt: `${context.prompt}\n\nEvaluate the plan for feasibility, sequencing, risk exposure, and missing dependencies. Highlight the most important corrective actions first.`,
                        modifiedInstructions:
                            'Review the project plan as a delivery auditor. Flag sequencing gaps, unrealistic timing, hidden dependencies, and the most important risk-reduction actions.',
                        modifiedMaxSteps: 5,
                    }
                }

                return { proceed: true }
            },
            onDelegationComplete: async context => {
                if (!context.error) {
                    return
                }

                return {
                    feedback: `Delegation to ${context.primitiveId} failed. Re-plan with the remaining context and state any assumptions instead of silently dropping the missing project detail.`,
                }
            },
            messageFilter: ({ messages }) => {
                return messages
                    .filter(message =>
                        message.content.parts.every(part => part.type !== 'tool-invocation')
                    )
                    .slice(-8)
            },
        },
            onIterationComplete: async context => {
                const feedback: string[] = []
                const text = context.text.trim()

                if (!/phase|milestone|priority|timeline|schedule/i.test(text)) {
                    feedback.push('Organize the response into phases, milestones, or priorities.')
                }

                if (!/risk|blocker|dependency|constraint/i.test(text)) {
                    feedback.push('Add the biggest risks, blockers, or dependencies that could disrupt delivery.')
                }

                if (!/owner|stakeholder|responsible|next step|decision/i.test(text)) {
                    feedback.push('Finish with ownership, decisions needed, and concrete next steps.')
                }

                await Promise.resolve()
                return {
                    continue: true,
                    feedback: feedback.length > 0 ? feedback.join(' ') : undefined,
                }
            },
        isTaskComplete: {
            scorers: [projectManagementTaskCompleteScorer, projectManagementExecutionScorer],
            strategy: 'any',
            parallel: true,
            onComplete: async result => {
                log.info('Project management completion check', {
                    complete: result.complete,
                    scores: result.scorers.map((scorer, index) => ({
                        scorerIndex: index,
                        score: scorer.score,
                    })),
                })
                await Promise.resolve()
            },
            suppressFeedback: false,
        },
    },
})

log.info('Project Management Agent initialized')
