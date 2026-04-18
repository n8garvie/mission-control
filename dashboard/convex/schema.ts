import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Agent registry
  agents: defineTable({
    name: v.string(),
    role: v.string(),
    emoji: v.string(),
    sessionKey: v.optional(v.string()),
    status: v.union(
      v.literal("idle"),
      v.literal("working"),
      v.literal("blocked"),
      v.literal("offline")
    ),
    currentTaskId: v.optional(v.id("tasks")),
    currentIdeaId: v.optional(v.id("ideas")),
    lastHeartbeat: v.optional(v.number()),
    level: v.union(
      v.literal("intern"),
      v.literal("specialist"),
      v.literal("lead")
    ),
    skills: v.array(v.string()),
    canScout: v.boolean(),
    canBuild: v.boolean(),
    tasksCompleted: v.optional(v.number()),
    ideasScouted: v.optional(v.number()),
  }).index("by_session", ["sessionKey"]),

  // Task board (for non-idea tasks)
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
      v.literal("idea_scouted"),
      v.literal("idea_approved"),
      v.literal("idea_rejected"),
      v.literal("idea_archived"),
      v.literal("build_started"),
      v.literal("build_stage_changed"),
      v.literal("agent_spawn_started"),
      v.literal("agent_spawn_completed"),
      v.literal("agent_spawn_failed"),
      v.literal("agent_spawn_manual_required"),
      v.literal("agent_output_received"),
      v.literal("build_locally_completed"),
      v.literal("github_pushed"),
      v.literal("vercel_deployed"),
      v.literal("build_failed")
    ),
    agentId: v.optional(v.id("agents")),
    agentName: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
    ideaId: v.optional(v.id("ideas")),
    projectId: v.optional(v.id("projects")),
    message: v.string(),
    metadata: v.optional(v.any()),
    createdAt: v.optional(v.number()),
  }).index("by_type", ["type"])
    .index("by_idea", ["ideaId"]),

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

  // UNIFIED: Ideas pipeline + Mission Control task system
  ideas: defineTable({
    // Basic info
    title: v.string(),
    description: v.string(),
    problem: v.optional(v.string()),
    solution: v.optional(v.string()),
    targetAudience: v.string(),
    mvpScope: v.string(),
    
    // Categorization
    tags: v.array(v.string()),
    category: v.union(
      v.literal("saas"),
      v.literal("developer-tools"),
      v.literal("productivity"),
      v.literal("ai"),
      v.literal("other")
    ),
    potential: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("moonshot")
    ),
    
    // Discovery metadata
    source: v.union(v.literal("scout"), v.literal("manual"), v.literal("agent")),
    scoutedBy: v.string(),
    scoutedAt: v.number(),
    discoverySource: v.union(
      v.literal("hn"),
      v.literal("reddit"),
      v.literal("twitter"),
      v.literal("manual"),
      v.literal("agent")
    ),
    discoveryUrl: v.optional(v.string()),
    discoveryContext: v.optional(v.string()),
    
    // Pipeline workflow (for Pipeline UI)
    pipelineStatus: v.union(
      v.literal("scouted"),
      v.literal("reviewing"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("archived")
    ),
    approvedAt: v.optional(v.number()),
    approvedBy: v.optional(v.string()),
    
    // Execution workflow (for Dashboard UI)
    taskStatus: v.union(
      v.literal("backlog"),
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("built"),
      v.literal("deployed"),
      v.literal("blocked")
    ),
    priority: v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    
    // Assignment
    assignedAgents: v.array(v.id("agents")),
    squadLead: v.optional(v.id("agents")),
    
    // Build tracking (granular stages)
    buildStage: v.union(
      v.literal("not_started"),
      v.literal("agents_spawning"),
      v.literal("agents_working"),
      v.literal("building_locally"),
      v.literal("pushing_to_github"),
      v.literal("deploying_to_vercel"),
      v.literal("completed"),
      v.literal("failed")
    ),
    buildId: v.optional(v.string()),
    buildStartedAt: v.optional(v.number()),
    buildCompletedAt: v.optional(v.number()),
    buildFailedAt: v.optional(v.number()),
    buildError: v.optional(v.string()),
    
    // Agent spawning tracking (per-agent status)
    agentSpawns: v.optional(v.array(v.object({
      agentId: v.string(),
      agentName: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("spawning"),
        v.literal("spawned"),
        v.literal("working"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("manual_intervention_required")
      ),
      spawnCommand: v.optional(v.string()),
      sessionKey: v.optional(v.string()),
      spawnStartedAt: v.optional(v.number()),
      spawnCompletedAt: v.optional(v.number()),
      spawnFailedAt: v.optional(v.number()),
      spawnError: v.optional(v.string()),
      lastHeartbeatAt: v.optional(v.number()),
      outputLocation: v.optional(v.string()),
    }))),
    
    // Output tracking
    outputLocation: v.optional(v.string()),
    githubRepoUrl: v.optional(v.string()),
    githubPushedAt: v.optional(v.number()),
    deployedUrl: v.optional(v.string()),
    deployedAt: v.optional(v.number()),
    
    // Activity timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    lastActivityAt: v.number(),
  }).index("by_pipeline_status", ["pipelineStatus"])
    .index("by_task_status", ["taskStatus"])
    .index("by_build_stage", ["buildStage"])
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

  // Dashboard stats
  dashboardStats: defineTable({
    activeAgents: v.number(),
    openTasks: v.number(),
    completedThisWeek: v.number(),
    pendingIdeas: v.number(),
    totalBuilds: v.number(),
    runningBuilds: v.optional(v.number()),
    pipeline: v.optional(v.object({
      buildsStarted: v.number(),
      buildsWithCode: v.number(),
      buildsCommitted: v.number(),
      buildsDeployed: v.number(),
    })),
    sparklines: v.object({
      activeAgents: v.array(v.number()),
      openTasks: v.array(v.number()),
      completedThisWeek: v.array(v.number()),
      pendingIdeas: v.array(v.number()),
    }),
    lastUpdated: v.number(),
  }),
});
