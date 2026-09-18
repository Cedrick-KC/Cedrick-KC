/**
 * OPPORTUNITY AGENT
 * 
 * Discovers and analyzes opportunities:
 * - Scholarships
 * - Universities
 * - Internships
 * - Fellowships
 * - Competitions
 * - Grants
 */

import { OpenAI } from 'openai';
import axios from 'axios';
import { ExecutionPlan, Context, Opportunity } from '../types';
import { WebSearchTool } from '../tools/WebSearchTool';
import { OpportunityModel } from '../models/Opportunity';
import { logger } from '../utils/logger';

export class OpportunityAgent {
  name = 'OpportunityAgent';
  private openai: OpenAI;
  private webSearch: WebSearchTool;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.webSearch = new WebSearchTool();
  }

  /**
   * Execute opportunity discovery and analysis
   */
  async execute(plan: ExecutionPlan, context: Context): Promise<any> {
    const startTime = Date.now();
    logger.info('OpportunityAgent: Starting execution');

    try {
      // Step 1: Search for opportunities
      const searchResults = await this.searchOpportunities(plan, context);
      logger.info(`OpportunityAgent: Found ${searchResults.length} initial results`);

      // Step 2: Extract and structure opportunities
      const opportunities = await this.extractOpportunities(searchResults, context);
      logger.info(`OpportunityAgent: Extracted ${opportunities.length} opportunities`);

      // Step 3: Analyze eligibility
      const analyzed = await this.analyzeEligibility(opportunities, context);
      logger.info(`OpportunityAgent: Analyzed eligibility for all opportunities`);

      // Step 4: Rank by relevance
      const ranked = this.rankOpportunities(analyzed, context);
      logger.info(`OpportunityAgent: Ranked opportunities`);

      // Step 5: Save to database
      await this.saveOpportunities(ranked, context.user.id);
      logger.info(`OpportunityAgent: Saved opportunities to database`);

      const executionTime = Date.now() - startTime;

      return {
        opportunities: ranked.slice(0, 10), // Top 10
        totalFound: ranked.length,
        executionTime: `${executionTime}ms`,
        nextActions: this.generateNextActions(ranked),
      };

    } catch (error) {
      logger.error('OpportunityAgent: Execution failed', error);
      throw error;
    }
  }

  /**
   * Search for opportunities using web search
   */
  private async searchOpportunities(plan: ExecutionPlan, context: Context): Promise<any[]> {
    const userProfile = context.user;
    const queries = this.generateSearchQueries(userProfile);

    const allResults = [];

    for (const query of queries) {
      try {
        const results = await this.webSearch.search(query);
        allResults.push(...results);
      } catch (error) {
        logger.error(`OpportunityAgent: Search failed for query "${query}"`, error);
      }
    }

    return this.deduplicateResults(allResults);
  }

  /**
   * Generate search queries based on user profile
   */
  private generateSearchQueries(userProfile: any): string[] {
    const baseQueries = [
      'fully funded scholarships 2026',
      'international scholarships software engineering',
      'undergraduate scholarships computer science',
      'tech internships for students',
      'fellowships for African students',
      'coding competitions 2026',
    ];

    // Customize based on user profile
    if (userProfile.interests?.includes('AI')) {
      baseQueries.push('AI scholarships 2026');
      baseQueries.push('machine learning internships');
    }

    if (userProfile.country) {
      baseQueries.push(`scholarships for ${userProfile.country} students`);
    }

    return baseQueries;
  }

  /**
   * Extract structured opportunities from search results using AI
   */
  private async extractOpportunities(searchResults: any[], context: Context): Promise<Opportunity[]> {
    const systemPrompt = `You are an expert at extracting scholarship and opportunity information.

Extract structured opportunity data from search results.

For each opportunity, extract:
- title
- organization
- country
- type (scholarship/internship/fellowship/competition)
- deadline (if available)
- eligibility criteria
- funding amount/type
- requirements
- applicationUrl

Return JSON array of opportunities. Skip irrelevant results.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Extract opportunities from these search results:\n\n${JSON.stringify(searchResults.slice(0, 20), null, 2)}` 
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const extracted = JSON.parse(response.choices[0].message.content);
    return extracted.opportunities || [];
  }

  /**
   * Analyze eligibility for each opportunity
   */
  private async analyzeEligibility(opportunities: Opportunity[], context: Context): Promise<Opportunity[]> {
    const userProfile = context.user;

    const systemPrompt = `You are an eligibility analyzer. Compare user profile with opportunity requirements.

User Profile:
${JSON.stringify(userProfile, null, 2)}

For each opportunity, determine:
- eligible: true/false
- matchScore: 0-100
- matchReason: explanation
- missingRequirements: array of what's missing

Return JSON array with analysis for each opportunity.`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Analyze eligibility:\n\n${JSON.stringify(opportunities, null, 2)}` 
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const analyzed = JSON.parse(response.choices[0].message.content);
    
    return opportunities.map((opp, index) => ({
      ...opp,
      ...analyzed.analysis[index],
    }));
  }

  /**
   * Rank opportunities by relevance and match score
   */
  private rankOpportunities(opportunities: Opportunity[], context: Context): Opportunity[] {
    return opportunities.sort((a, b) => {
      // Prioritize eligible opportunities
      if (a.eligible && !b.eligible) return -1;
      if (!a.eligible && b.eligible) return 1;

      // Then by match score
      return (b.matchScore || 0) - (a.matchScore || 0);
    });
  }

  /**
   * Save opportunities to database
   */
  private async saveOpportunities(opportunities: Opportunity[], userId: string): Promise<void> {
    for (const opp of opportunities) {
      try {
        await OpportunityModel.findOneAndUpdate(
          { title: opp.title, organization: opp.organization },
          {
            ...opp,
            userId,
            discoveredAt: new Date(),
            status: 'discovered',
          },
          { upsert: true, new: true }
        );
      } catch (error) {
        logger.error('OpportunityAgent: Failed to save opportunity', error);
      }
    }
  }

  /**
   * Generate next action recommendations
   */
  private generateNextActions(opportunities: Opportunity[]): string[] {
    const actions = [];
    
    const eligible = opportunities.filter(o => o.eligible);
    if (eligible.length > 0) {
      actions.push(`Review ${eligible.length} eligible opportunities`);
    }

    const urgent = opportunities.filter(o => {
      if (!o.deadline) return false;
      const daysUntil = (new Date(o.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return daysUntil <= 30;
    });

    if (urgent.length > 0) {
      actions.push(`Urgent: ${urgent.length} deadlines within 30 days`);
    }

    return actions;
  }

  /**
   * Deduplicate search results
   */
  private deduplicateResults(results: any[]): any[] {
    const seen = new Set();
    return results.filter(result => {
      const key = result.url || result.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Scheduled discovery - runs proactively
   */
  async scheduledDiscovery(userProfile: any): Promise<void> {
    logger.info('OpportunityAgent: Running scheduled discovery');

    const context: Context = {
      user: userProfile,
      recentMemories: [],
      projects: [],
      timestamp: new Date(),
    };

    const plan: ExecutionPlan = {
      steps: [{ action: 'search', params: {} }],
      requiredTools: ['web_search'],
      expectedDuration: '60s',
    };

    await this.execute(plan, context);
  }
}
