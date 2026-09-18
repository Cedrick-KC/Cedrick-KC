/**
 * NEXA ORCHESTRATOR
 * 
 * The brain of NEXA - responsible for:
 * - Intent detection
 * - Task planning
 * - Agent routing
 * - Tool selection
 * - Context assembly
 * - Permission checking
 * - Result validation
 */

import { OpenAI } from 'openai';
import { Intent, Task, Context, ExecutionPlan, AgentResult } from '../types';
import { MemoryManager } from '../memory/MemoryManager';
import { OpportunityAgent } from '../agents/OpportunityAgent';
import { ProjectAgent } from '../agents/ProjectAgent';
import { BusinessAgent } from '../agents/BusinessAgent';
import { PlanningAgent } from '../agents/PlanningAgent';
import { logger } from '../utils/logger';

export class NexaOrchestrator {
  private openai: OpenAI;
  private memoryManager: MemoryManager;
  private agents: Map<string, any>;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.memoryManager = new MemoryManager();

    // Initialize all specialist agents
    this.agents = new Map([
      ['opportunity', new OpportunityAgent()],
      ['project', new ProjectAgent()],
      ['business', new BusinessAgent()],
      ['planning', new PlanningAgent()],
    ]);
  }

  /**
   * Main execution method
   * Orchestrates the entire workflow from user request to result
   */
  async execute(userRequest: string, userId: string): Promise<AgentResult> {
    logger.info(`Orchestrator: Processing request for user ${userId}`);

    try {
      // Step 1: Classify intent
      const intent = await this.classifyIntent(userRequest);
      logger.info(`Orchestrator: Detected intent - ${intent.type}`);

      // Step 2: Retrieve relevant memory/context
      const context = await this.retrieveContext(userId, intent);
      logger.info(`Orchestrator: Retrieved context`);

      // Step 3: Create execution plan
      const plan = await this.createExecutionPlan(userRequest, intent, context);
      logger.info(`Orchestrator: Created execution plan with ${plan.steps.length} steps`);

      // Step 4: Select and execute specialist agent
      const agent = this.selectAgent(intent);
      logger.info(`Orchestrator: Selected agent - ${agent.name}`);

      // Step 5: Execute the plan
      const result = await agent.execute(plan, context);
      logger.info(`Orchestrator: Agent execution completed`);

      // Step 6: Update memory
      await this.memoryManager.store(userId, {
        request: userRequest,
        intent: intent.type,
        result,
        timestamp: new Date(),
      });

      // Step 7: Return result
      return {
        success: true,
        data: result,
        metadata: {
          intent: intent.type,
          agent: agent.name,
          executionTime: result.executionTime,
        },
      };

    } catch (error) {
      logger.error('Orchestrator: Execution failed', error);
      return {
        success: false,
        error: error.message,
        metadata: {
          timestamp: new Date(),
        },
      };
    }
  }

  /**
   * Classify user intent using OpenAI
   */
  private async classifyIntent(userRequest: string): Promise<Intent> {
    const systemPrompt = `You are NEXA's intent classifier. Analyze the user request and classify it into one of these categories:

INTENTS:
- EDUCATION_RESEARCH (scholarships, universities, fellowships)
- PROJECT_MANAGEMENT (coding, GitHub, bugs, features)
- BUSINESS_DEVELOPMENT (prospects, clients, outreach)
- TASK_QUERY (show tasks, deadlines, progress)
- GOAL_PLANNING (create plans, break down goals)
- GENERAL_QUERY (other questions)

Return JSON: { "type": "INTENT_NAME", "confidence": 0.0-1.0, "entities": {} }`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userRequest },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const intent = JSON.parse(response.choices[0].message.content);
    return intent;
  }

  /**
   * Retrieve relevant context from memory
   */
  private async retrieveContext(userId: string, intent: Intent): Promise<Context> {
    const userProfile = await this.memoryManager.getUserProfile(userId);
    const recentMemories = await this.memoryManager.getRecent(userId, 5);
    const relevantProjects = intent.type === 'PROJECT_MANAGEMENT'
      ? await this.memoryManager.getProjects(userId)
      : [];

    return {
      user: userProfile,
      recentMemories,
      projects: relevantProjects,
      timestamp: new Date(),
    };
  }

  /**
   * Create execution plan
   */
  private async createExecutionPlan(
    request: string,
    intent: Intent,
    context: Context
  ): Promise<ExecutionPlan> {
    const systemPrompt = `You are NEXA's planning system. Create an execution plan for this request.

User Profile: ${JSON.stringify(context.user)}
Intent: ${intent.type}

Return JSON with:
{
  "steps": [
    { "action": "search_web", "params": {...} },
    { "action": "analyze", "params": {...} }
  ],
  "requiredTools": ["web_search", "github"],
  "expectedDuration": "30s"
}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: request },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const plan = JSON.parse(response.choices[0].message.content);
    return plan;
  }

  /**
   * Select appropriate agent based on intent
   */
  private selectAgent(intent: Intent): any {
    const agentMap = {
      EDUCATION_RESEARCH: 'opportunity',
      PROJECT_MANAGEMENT: 'project',
      BUSINESS_DEVELOPMENT: 'business',
      GOAL_PLANNING: 'planning',
    };

    const agentKey = agentMap[intent.type] || 'planning';
    return this.agents.get(agentKey);
  }

  /**
   * Proactive discovery mode
   * Runs scheduled tasks without user prompt
   */
  async proactiveDiscovery(userId: string): Promise<void> {
    logger.info(`Orchestrator: Running proactive discovery for user ${userId}`);

    const userProfile = await this.memoryManager.getUserProfile(userId);
    
    // Run opportunity discovery
    const opportunityAgent = this.agents.get('opportunity');
    await opportunityAgent.scheduledDiscovery(userProfile);

    // Check project health
    const projectAgent = this.agents.get('project');
    await projectAgent.healthCheck(userProfile);

    logger.info(`Orchestrator: Proactive discovery completed`);
  }
}
