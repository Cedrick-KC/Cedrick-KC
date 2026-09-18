/**
 * MongoDB Models for NEXA
 */

import mongoose, { Schema, Document } from 'mongoose';

// ==========================================
// USER MODEL
// ==========================================

export interface IUser extends Document {
  email: string;
  name: string;
  github?: {
    username: string;
    id: string;
    accessToken?: string;
  };
  profile: {
    country?: string;
    interests?: string[];
    skills?: string[];
    education?: string;
    goals?: string[];
  };
  preferences: {
    notifications: boolean;
    proactiveDiscovery: boolean;
    discoveryFrequency: 'daily' | 'weekly' | 'monthly';
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  github: {
    username: String,
    id: String,
    accessToken: String,
  },
  profile: {
    country: String,
    interests: [String],
    skills: [String],
    education: String,
    goals: [String],
  },
  preferences: {
    notifications: { type: Boolean, default: true },
    proactiveDiscovery: { type: Boolean, default: true },
    discoveryFrequency: { type: String, default: 'weekly' },
  },
}, { timestamps: true });

export const UserModel = mongoose.model<IUser>('User', UserSchema);

// ==========================================
// OPPORTUNITY MODEL
// ==========================================

export interface IOpportunity extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  organization: string;
  country?: string;
  type: 'scholarship' | 'internship' | 'fellowship' | 'competition' | 'grant' | 'program';
  deadline?: Date;
  eligibility: string[];
  funding?: string;
  requirements: string[];
  applicationUrl?: string;
  status: 'discovered' | 'reviewing' | 'applying' | 'applied' | 'accepted' | 'rejected' | 'expired';
  eligible: boolean;
  matchScore?: number;
  matchReason?: string;
  missingRequirements?: string[];
  discoveredAt: Date;
  source?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OpportunitySchema = new Schema<IOpportunity>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  organization: { type: String, required: true },
  country: String,
  type: { type: String, enum: ['scholarship', 'internship', 'fellowship', 'competition', 'grant', 'program'], required: true },
  deadline: Date,
  eligibility: [String],
  funding: String,
  requirements: [String],
  applicationUrl: String,
  status: { type: String, enum: ['discovered', 'reviewing', 'applying', 'applied', 'accepted', 'rejected', 'expired'], default: 'discovered' },
  eligible: { type: Boolean, default: false },
  matchScore: Number,
  matchReason: String,
  missingRequirements: [String],
  discoveredAt: { type: Date, default: Date.now },
  source: String,
  notes: String,
}, { timestamps: true });

OpportunitySchema.index({ userId: 1, deadline: 1 });
OpportunitySchema.index({ userId: 1, status: 1 });

export const OpportunityModel = mongoose.model<IOpportunity>('Opportunity', OpportunitySchema);

// ==========================================
// PROJECT MODEL
// ==========================================

export interface IProject extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  repository: string;
  language?: string;
  stars?: number;
  issues?: number;
  lastCommit?: Date;
  status: 'active' | 'inactive' | 'slow' | 'needs-attention' | 'completed';
  githubData?: {
    fullName: string;
    private: boolean;
    fork: boolean;
  };
  analysis?: {
    health: 'excellent' | 'good' | 'needs-attention' | 'critical';
    insights: string[];
    recommendations: string[];
    priority: 'high' | 'medium' | 'low';
    nextMilestone?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: String,
  repository: { type: String, required: true, unique: true },
  language: String,
  stars: Number,
  issues: Number,
  lastCommit: Date,
  status: { type: String, enum: ['active', 'inactive', 'slow', 'needs-attention', 'completed'], default: 'active' },
  githubData: {
    fullName: String,
    private: Boolean,
    fork: Boolean,
  },
  analysis: {
    health: { type: String, enum: ['excellent', 'good', 'needs-attention', 'critical'] },
    insights: [String],
    recommendations: [String],
    priority: { type: String, enum: ['high', 'medium', 'low'] },
    nextMilestone: String,
  },
}, { timestamps: true });

ProjectSchema.index({ userId: 1, status: 1 });

export const ProjectModel = mongoose.model<IProject>('Project', ProjectSchema);

// ==========================================
// TASK MODEL
// ==========================================

export interface ITask extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  projectId?: mongoose.Types.ObjectId;
  projectName?: string;
  opportunityId?: mongoose.Types.ObjectId;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  deadline?: Date;
  source: 'user' | 'github' | 'opportunity' | 'planning' | 'agent';
  sourceUrl?: string;
  dependencies?: mongoose.Types.ObjectId[];
  createdBy: string;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  projectId: { type: Schema.Types.ObjectId, ref: 'Project' },
  projectName: String,
  opportunityId: { type: Schema.Types.ObjectId, ref: 'Opportunity' },
  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
  status: { type: String, enum: ['pending', 'in-progress', 'completed', 'cancelled'], default: 'pending' },
  deadline: Date,
  source: { type: String, enum: ['user', 'github', 'opportunity', 'planning', 'agent'], required: true },
  sourceUrl: String,
  dependencies: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
  createdBy: { type: String, required: true },
  completedAt: Date,
}, { timestamps: true });

TaskSchema.index({ userId: 1, status: 1, deadline: 1 });

export const TaskModel = mongoose.model<ITask>('Task', TaskSchema);

// ==========================================
// GOAL MODEL
// ==========================================

export interface IGoal extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  category: 'education' | 'career' | 'project' | 'business' | 'personal';
  targetDate?: Date;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  progress: number; // 0-100
  milestones?: {
    title: string;
    completed: boolean;
    completedAt?: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const GoalSchema = new Schema<IGoal>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: String,
  category: { type: String, enum: ['education', 'career', 'project', 'business', 'personal'], required: true },
  targetDate: Date,
  status: { type: String, enum: ['active', 'completed', 'paused', 'cancelled'], default: 'active' },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  milestones: [{
    title: String,
    completed: { type: Boolean, default: false },
    completedAt: Date,
  }],
}, { timestamps: true });

export const GoalModel = mongoose.model<IGoal>('Goal', GoalSchema);

// ==========================================
// AGENT RUN MODEL (for audit trail)
// ==========================================

export interface IAgentRun extends Document {
  userId: mongoose.Types.ObjectId;
  agent: string;
  userRequest: string;
  intent: string;
  plan: any;
  toolsUsed: string[];
  results: any;
  errors?: any[];
  sources?: string[];
  actionsTaken: string[];
  memoryUpdated: string[];
  status: 'success' | 'failed' | 'partial';
  executionTime: number;
  createdAt: Date;
}

const AgentRunSchema = new Schema<IAgentRun>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  agent: { type: String, required: true },
  userRequest: String,
  intent: String,
  plan: Schema.Types.Mixed,
  toolsUsed: [String],
  results: Schema.Types.Mixed,
  errors: [Schema.Types.Mixed],
  sources: [String],
  actionsTaken: [String],
  memoryUpdated: [String],
  status: { type: String, enum: ['success', 'failed', 'partial'], required: true },
  executionTime: Number,
}, { timestamps: true });

AgentRunSchema.index({ userId: 1, createdAt: -1 });

export const AgentRunModel = mongoose.model<IAgentRun>('AgentRun', AgentRunSchema);

// ==========================================
// MEMORY MODEL
// ==========================================

export interface IMemory extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'conversation' | 'decision' | 'fact' | 'preference';
  content: string;
  metadata?: any;
  relevanceScore?: number;
  lastAccessed?: Date;
  accessCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const MemorySchema = new Schema<IMemory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['conversation', 'decision', 'fact', 'preference'], required: true },
  content: { type: String, required: true },
  metadata: Schema.Types.Mixed,
  relevanceScore: Number,
  lastAccessed: Date,
  accessCount: { type: Number, default: 0 },
}, { timestamps: true });

MemorySchema.index({ userId: 1, type: 1 });

export const MemoryModel = mongoose.model<IMemory>('Memory', MemorySchema);
