import { describe, it, expect } from 'vitest'
import { getAllAgentIds } from '../app/chat/config/agents'

describe('Agent registry', () => {
    const expectedIds = [
        'bgColorAgent',
        'noteTakerAgent',
        'a2aCoordinatorAgent',
        'codingA2ACoordinator',
        'dataPipelineNetwork',
        'reportGenerationNetwork',
        'researchPipelineNetwork',
        'contentCreationNetwork',
        'financialIntelligenceNetwork',
        'learningNetwork',
        'marketingAutomationNetwork',
        'devopsNetwork',
        'businessIntelligenceNetwork',
        'securityNetwork',
        'graphSupervisorAgent',
        'technicalAnalysisAgent',
        'chartJsAgent',
        'mappingAgent',
        'fetchAgent',
        'finnhubAgent',
        'codeGraphAgent',
        'codeMetricsAgent',
        'socialMediaAgent',
        'seoAgent',
        'translationAgent',
        'customerSupportAgent',
        'projectManagementAgent',
    ]

    it('contains newly added agents and networks', () => {
        const ids = getAllAgentIds()
        for (const id of expectedIds) {
            expect(ids).toContain(id)
        }
    })
})
