import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Agent registry
  agents: defineTable({
    name: v.string(),
    role: v.string(),
    emoji: v.string(),
    sessionKey: v.string(),
    status: v.union(
      v.literal("idle"),
      v.literal("active"),
      v.literal("blocked")
    ),
    currentTaskId: v.optional(v.id("tasks")),
    lastHeartbeat: v.optional(v.number()),
    level: v.union(
      v.literal("intern"),
      v.literal("specialist"),
      v.literal("lead")
    ),
  }).index("by_session", ["sessionKey"]),

  // Task board
  tasks: defineTable({
    title: v.string(),
    description: v.string(),
    brief: v.optional(v.string()),
    status: v.union(
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done"),
      v.literal("blocked")
    ),
    priority: v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    assigneeIds: v.array(v.id("agents")),
    createdBy: v.optional(v.id("agents")),
    projectId: v.optional(v.id("projects")),
    parentTaskId: v.optional(v.id("tasks")),
    dueDate: v.optional(v.number()),
    tags: v.array(v.string()),
  }).index("by_status", ["status"])
    .index("by_project", ["projectId"]),

  // Projects (group of tasks)
  projects: defineTable({
    name: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("archived")
    ),
    leadAgentId: v.optional(v.id("agents")),
  }).index("by_status", ["status"]),

  // Comments/messages on tasks
  messages: defineTable({
    taskId: v.id("tasks"),
    fromAgentId: v.optional(v.id("agents")),
    fromHuman: v.optional(v.boolean()),
    content: v.string(),
    attachments: v.optional(v.array(v.id("documents"))),
    mentions: v.optional(v.array(v.id("agents"))),
  }).index("by_task", ["taskId"]),

  // Activity feed
  activities: defineTable({
    type: v.union(
      v.literal("task_created"),
      v.literal("task_updated"),
      v.literal("task_completed"),
      v.literal("message_sent"),
      v.literal("document_created"),
      v.literal("agent_heartbeat"),
      v.literal("project_created"),
      v.literal("status_change"),
      v.literal("idea_created"),
      v.literal("idea_approved"),
      v.literal("idea_building"),
      v.literal("idea_deployed"),
      v.literal("idea_deleted"),
      v.literal("idea_reset")
    ),
    agentId: v.optional(v.id("agents")),
    agent: v.optional(v.any()), // TEMP: for backward compat with old data
    taskId: v.optional(v.id("tasks")),
    projectId: v.optional(v.id("projects")),
    message: v.string(),
    createdAt: v.optional(v.number()), // TEMP: for backward compat
  }).index("by_type", ["type"]),

  // Documents and deliverables
  documents: defineTable({
    title: v.string(),
    content: v.string(),
    type: v.union(
      v.literal("deliverable"),
      v.literal("research"),
      v.literal("brief"),
      v.literal("design"),
      v.literal("code"),
      v.literal("copy"),
      v.literal("protocol")
    ),
    taskId: v.optional(v.id("tasks")),
    projectId: v.optional(v.id("projects")),
    authorId: v.optional(v.id("agents")),
    version: v.optional(v.number()),
  }).index("by_task", ["taskId"])
    .index("by_project", ["projectId"]),

  // Notifications
  notifications: defineTable({
    mentionedAgentId: v.id("agents"),
    fromAgentId: v.optional(v.id("agents")),
    taskId: v.optional(v.id("tasks")),
    content: v.string(),
    delivered: v.boolean(),
    read: v.boolean(),
  }).index("by_agent", ["mentionedAgentId"])
    .index("by_undelivered", ["delivered"]),

  // Ideas pipeline - for Nightly Idea Pipeline system
  ideas: defineTable({
    title: v.string(),
    description: v.string(),
    targetAudience: v.string(),
    mvpScope: v.string(),
    potential: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("moonshot")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("building"),
      v.literal("done")
    ),
    createdAt: v.number(),
    approvedAt: v.optional(v.number()),
    deployedUrl: v.optional(v.string()),
    source: v.optional(v.string()), // e.g., "reddit", "producthunt", "scout"
    tags: v.optional(v.array(v.string())),
    scoutAgentId: v.optional(v.id("agents")),
  }).index("by_status", ["status"])
    .index("by_potential", ["potential"])
    .index("by_created", ["createdAt"]),

  // Rejected/deleted ideas - to prevent duplicates
  rejectedIdeas: defineTable({
    title: v.string(),
    description: v.string(),
    rejectedAt: v.number(),
    reason: v.optional(v.string()),
  }).index("by_title", ["title"])
    .index("by_rejected", ["rejectedAt"]),

  // AI Subscription Optimizer tables
  subscriptions: defineTable({
    name: v.string(),
    provider: v.string(),
    cost: v.number(),
    billingCycle: v.union(v.literal("monthly"), v.literal("yearly")),
    usage: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    renewalDate: v.string(),
    category: v.string(),
    iconName: v.string(),
    description: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_provider", ["provider"])
    .index("by_category", ["category"])
    .index("by_renewal_date", ["renewalDate"]),

  usageWindows: defineTable({
    subscriptionId: v.id("subscriptions"),
    name: v.string(),
    durationMs: v.number(),
    used: v.number(),
    limit: v.number(),
    unit: v.string(),
    resetAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_subscription", ["subscriptionId"]),
});
