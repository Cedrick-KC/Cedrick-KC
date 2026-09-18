/**
 * PROJECT AGENT
 * 
 * Manages software projects with GitHub integration:
 * - Project tracking
 * - Issue monitoring
 * - Code analysis
 * - Bug tracking
 * - Task generation
 * - Development planning
 */

import { Octokit } from '@octokit/rest';
import { OpenAI } from 'openai';
import { ExecutionPlan, Context, Project } from '../types';
import { ProjectModel } from '../models/Project';
import { TaskModel } from '../models/Task';
import { logger } from '../utils/logger';

export class ProjectAgent {
  name = 'ProjectAgent';
  private openai: OpenAI;
  private github: Octokit;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.github = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });
  }

  /**
   * Execute project management tasks
   */
  async execute(plan: ExecutionPlan, context: Context): Promise<any> {
    const startTime = Date.now();
    logger.info('ProjectAgent: Starting execution');

    try {
      // Get user's GitHub projects
      const projects = await this.syncProjects(context.user.github);
      logger.info(`ProjectAgent: Synced ${projects.length} projects`);

      // Analyze each project
      const analyzed = await Promise.all(
        projects.map(p => this.analyzeProject(p))
      );

      // Generate tasks from issues
      const tasks = await this.generateTasks(analyzed, context.user.id);

      const executionTime = Date.now() - startTime;

      return {
        projects: analyzed,
        tasksGenerated: tasks.length,
        executionTime: `${executionTime}ms`,
        nextActions: this.generateNextActions(analyzed),
      };

    } catch (error) {
      logger.error('ProjectAgent: Execution failed', error);
      throw error;
    }
  }

  /**
   * Sync projects from GitHub
   */
  private async syncProjects(githubUsername: string): Promise<Project[]> {
    const { data: repos } = await this.github.repos.listForUser({
      username: githubUsername,
      sort: 'updated',
      per_page: 50,
    });

    const projects: Project[] = [];

    for (const repo of repos) {
      // Get issues
      const { data: issues } = await this.github.issues.listForRepo({
        owner: githubUsername,
        repo: repo.name,
        state: 'open',
      });

      // Get latest commit
      const { data: commits } = await this.github.repos.listCommits({
        owner: githubUsername,
        repo: repo.name,
        per_page: 1,
      });

      const project: Project = {
        name: repo.name,
        description: repo.description || '',
        repository: repo.html_url,
        language: repo.language,
        stars: repo.stargazers_count,
        issues: issues.length,
        lastCommit: commits[0]?.commit.author?.date,
        status: this.determineStatus(repo, issues),
        githubData: {
          fullName: repo.full_name,
          private: repo.private,
          fork: repo.fork,
        },
      };

      projects.push(project);
    }

    // Save to database
    for (const project of projects) {
      await ProjectModel.findOneAndUpdate(
        { repository: project.repository },
        project,
        { upsert: true, new: true }
      );
    }

    return projects;
  }

  /**
   * Analyze project health and status
   */
  private async analyzeProject(project: Project): Promise<Project> {
    const systemPrompt = `You are a project health analyzer. Analyze this GitHub project.

Return JSON with:
{
  "health": "excellent/good/needs-attention/critical",
  "insights": ["insight1", "insight2"],
  "recommendations": ["action1", "action2"],
  "priority": "high/medium/low",
  "nextMilestone": "description"
}`;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: `Analyze project:\n\n${JSON.stringify(project, null, 2)}` 
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const analysis = JSON.parse(response.choices[0].message.content);

    return {
      ...project,
      analysis,
    };
  }

  /**
   * Generate tasks from GitHub issues
   */
  private async generateTasks(projects: Project[], userId: string): Promise<any[]> {
    const tasks = [];

    for (const project of projects) {
      if (!project.githubData) continue;

      const [owner, repo] = project.githubData.fullName.split('/');

      try {
        const { data: issues } = await this.github.issues.listForRepo({
          owner,
          repo,
          state: 'open',
        });

        for (const issue of issues) {
          const task = await TaskModel.create({
            title: issue.title,
            description: issue.body || '',
            projectId: project._id,
            projectName: project.name,
            priority: this.determinePriority(issue),
            status: 'pending',
            source: 'github',
            sourceUrl: issue.html_url,
            userId,
            createdBy: 'ProjectAgent',
          });

          tasks.push(task);
        }
      } catch (error) {
        logger.error(`ProjectAgent: Failed to fetch issues for ${project.name}`, error);
      }
    }

    return tasks;
  }

  /**
   * Determine project status
   */
  private determineStatus(repo: any, issues: any[]): string {
    if (issues.length > 10) return 'needs-attention';
    if (repo.stargazers_count > 50) return 'active';
    
    const daysSinceUpdate = (Date.now() - new Date(repo.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpdate > 30) return 'inactive';
    if (daysSinceUpdate > 7) return 'slow';
    
    return 'active';
  }

  /**
   * Determine task priority from GitHub issue
   */
  private determinePriority(issue: any): string {
    const labels = issue.labels.map((l: any) => l.name.toLowerCase());
    
    if (labels.includes('critical') || labels.includes('urgent')) return 'high';
    if (labels.includes('bug')) return 'high';
    if (labels.includes('enhancement')) return 'medium';
    
    return 'low';
  }

  /**
   * Generate next action recommendations
   */
  private generateNextActions(projects: Project[]): string[] {
    const actions = [];

    const critical = projects.filter(p => p.analysis?.health === 'critical');
    if (critical.length > 0) {
      actions.push(`🚨 ${critical.length} projects need immediate attention`);
    }

    const needsAttention = projects.filter(p => p.analysis?.health === 'needs-attention');
    if (needsAttention.length > 0) {
      actions.push(`⚠️ ${needsAttention.length} projects need attention`);
    }

    const highPriorityProjects = projects.filter(p => p.analysis?.priority === 'high');
    if (highPriorityProjects.length > 0) {
      actions.push(`Focus on: ${highPriorityProjects[0].name}`);
    }

    return actions;
  }

  /**
   * Health check - runs proactively
   */
  async healthCheck(userProfile: any): Promise<void> {
    logger.info('ProjectAgent: Running health check');

    const context: Context = {
      user: userProfile,
      recentMemories: [],
      projects: [],
      timestamp: new Date(),
    };

    const plan: ExecutionPlan = {
      steps: [{ action: 'sync_projects', params: {} }],
      requiredTools: ['github'],
      expectedDuration: '30s',
    };

    await this.execute(plan, context);
  }

  /**
   * Get specific project details
   */
  async getProjectDetails(owner: string, repo: string): Promise<any> {
    const { data: repository } = await this.github.repos.get({ owner, repo });
    const { data: issues } = await this.github.issues.listForRepo({ owner, repo, state: 'all' });
    const { data: pulls } = await this.github.pulls.list({ owner, repo, state: 'all' });
    const { data: commits } = await this.github.repos.listCommits({ owner, repo, per_page: 10 });

    return {
      repository,
      issues,
      pulls,
      recentCommits: commits,
    };
  }
}
