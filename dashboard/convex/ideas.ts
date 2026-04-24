import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============== PIPELINE VIEW QUERIES ==============

// List ideas by pipeline status (for Pipeline UI) - Simplified flow
export const listByPipelineStatus = query({
  args: {
    status: v.union(
      v.literal("scouted"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("archived")
    ),
  },
  handler: async (ctx, args) => {
    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_pipeline_status", (q) => q.eq("pipelineStatus", args.status))
      .order("desc")
      .collect();
    return ideas;
  },
});

// ============== DASHBOARD VIEW QUERIES ==============

// List ideas by task status (for Dashboard Kanban)
export const listByTaskStatus = query({
  args: {
    status: v.union(
      v.literal("backlog"),
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("built"),
      v.literal("deployed"),
      v.literal("blocked")
    ),
  },
  handler: async (ctx, args) => {
    const ideas = await ctx.db
      .query("ideas")
      .withIndex("by_task_status", (q) => q.eq("taskStatus", args.status))
      .order("desc")
      .collect();
    return ideas;
  },
});

// List all ideas (for admin/debug)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const ideas = await ctx.db.query("ideas").order("desc").collect();
    return ideas;
  },
});

// Get a specific idea
export const get = query({
  args: { id: v.id("ideas") },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.id);
    return idea;
  },
});

// ============== PIPELINE ACTIONS ==============

// Create a new idea (used by Scout agent)
export const create = mutation({
  args: {
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
    problem: v.optional(v.string()),
    solution: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.union(
      v.literal("saas"),
      v.literal("developer-tools"),
      v.literal("productivity"),
      v.literal("ai"),
      v.literal("other")
    )),
    discoverySource: v.optional(v.union(
      v.literal("hn"),
      v.literal("reddit"),
      v.literal("twitter"),
      v.literal("manual"),
      v.literal("agent")
    )),
    discoveryUrl: v.optional(v.string()),
    discoveryContext: v.optional(v.string()),
    scoutedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ideaId = await ctx.db.insert("ideas", {
      ...args,
      source: "scout",
      scoutedBy: args.scoutedBy || "scout",
      scoutedAt: now,
      pipelineStatus: "scouted",
      taskStatus: "backlog",
      priority: "medium",
      tags: args.tags || [],
      category: args.category || "other",
      discoverySource: args.discoverySource || "manual",
      buildStage: "not_started",
      assignedAgents: [],
      agentSpawns: [],
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "idea_scouted",
      ideaId,
      message: `💡 New idea scouted: ${args.title}`,
      createdAt: now,
    });

    return ideaId;
  },
});

// Approve an idea (moves from Pipeline to Dashboard)
export const approve = mutation({
  args: {
    ideaId: v.id("ideas"),
    approvedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");
    if (idea.pipelineStatus !== "scouted") {
      throw new Error("Idea must be scouted to approve");
    }

    const now = Date.now();
    await ctx.db.patch(args.ideaId, {
      pipelineStatus: "approved",
      taskStatus: "backlog",
      approvedAt: now,
      approvedBy: args.approvedBy || "nathan",
      updatedAt: now,
      lastActivityAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "idea_approved",
      ideaId: args.ideaId,
      message: `✅ Idea approved for building: ${idea.title}`,
      createdAt: now,
    });

    return args.ideaId;
  },
});

// Reject an idea
export const reject = mutation({
  args: {
    ideaId: v.id("ideas"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");

    const now = Date.now();
    await ctx.db.patch(args.ideaId, {
      pipelineStatus: "rejected",
      updatedAt: now,
      lastActivityAt: now,
    });

    // Also add to rejected ideas list to prevent duplicates
    await ctx.db.insert("rejectedIdeas", {
      title: idea.title,
      description: idea.description,
      rejectedAt: now,
      reason: args.reason,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "idea_rejected",
      ideaId: args.ideaId,
      message: `❌ Idea rejected: ${idea.title}${args.reason ? ` - ${args.reason}` : ""}`,
      createdAt: now,
    });

    return args.ideaId;
  },
});

// Archive an idea
export const archive = mutation({
  args: {
    ideaId: v.id("ideas"),
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");

    const now = Date.now();
    await ctx.db.patch(args.ideaId, {
      pipelineStatus: "archived",
      updatedAt: now,
      lastActivityAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "idea_archived",
      ideaId: args.ideaId,
      message: `📦 Idea archived: ${idea.title}`,
      createdAt: now,
    });

    return args.ideaId;
  },
});

// ============== DASHBOARD ACTIONS ==============

// Assign agents to an idea
export const assignAgents = mutation({
  args: {
    ideaId: v.id("ideas"),
    agentIds: v.array(v.id("agents")),
    squadLead: v.optional(v.id("agents")),
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");

    const now = Date.now();
    
    // Initialize agentSpawns for each assigned agent
    const agentSpawns = args.agentIds.map((agentId) => ({
      agentId: agentId.toString(),
      agentName: "", // Will be populated when we fetch agent
      status: "pending" as const,
    }));

    await ctx.db.patch(args.ideaId, {
      assignedAgents: args.agentIds,
      squadLead: args.squadLead,
      taskStatus: "assigned",
      agentSpawns,
      updatedAt: now,
      lastActivityAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "build_started",
      ideaId: args.ideaId,
      message: `👥 Agents assigned to: ${idea.title}`,
      createdAt: now,
    });

    return args.ideaId;
  },
});

// ============== BUILD STAGE TRACKING ==============

// Start build (initialize agent spawning)
export const startBuild = mutation({
  args: {
    ideaId: v.id("ideas"),
    buildId: v.string(),
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");

    const now = Date.now();
    await ctx.db.patch(args.ideaId, {
      buildId: args.buildId,
      buildStage: "agents_spawning",
      taskStatus: "in_progress",
      buildStartedAt: now,
      updatedAt: now,
      lastActivityAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "build_started",
      ideaId: args.ideaId,
      message: `🔨 Build started for: ${idea.title}`,
      metadata: { buildId: args.buildId },
      createdAt: now,
    });

    return args.ideaId;
  },
});

// Update build stage
export const updateBuildStage = mutation({
  args: {
    ideaId: v.id("ideas"),
    stage: v.union(
      v.literal("not_started"),
      v.literal("agents_spawning"),
      v.literal("agents_working"),
      v.literal("building_locally"),
      v.literal("pushing_to_github"),
      v.literal("deploying_to_vercel"),
      v.literal("completed"),
      v.literal("failed")
    ),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");

    const now = Date.now();
    await ctx.db.patch(args.ideaId, {
      buildStage: args.stage,
      updatedAt: now,
      lastActivityAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "build_stage_changed",
      ideaId: args.ideaId,
      message: `📊 Build stage: ${args.stage.replace(/_/g, " ")}`,
      metadata: { stage: args.stage, ...args.metadata },
      createdAt: now,
    });

    return args.ideaId;
  },
});

// Update agent spawn status
export const updateAgentSpawn = mutation({
  args: {
    ideaId: v.id("ideas"),
    agentId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("spawning"),
      v.literal("spawned"),
      v.literal("working"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("manual_intervention_required")
    ),
    sessionKey: v.optional(v.string()),
    spawnCommand: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");

    const now = Date.now();
    const agentSpawns = idea.agentSpawns || [];
    
    const existingSpawnIndex = agentSpawns.findIndex(
      (s: any) => s.agentId === args.agentId
    );

    const updatedSpawn = {
      agentId: args.agentId,
      agentName: existingSpawnIndex >= 0 ? agentSpawns[existingSpawnIndex].agentName : "",
      status: args.status,
      sessionKey: args.sessionKey,
      spawnCommand: args.spawnCommand,
      spawnError: args.error,
      ...(args.status === "spawning" && { spawnStartedAt: now }),
      ...(args.status === "spawned" && { spawnCompletedAt: now }),
      ...(args.status === "failed" && { spawnFailedAt: now }),
      ...(args.status === "manual_intervention_required" && { spawnFailedAt: now }),
      lastHeartbeatAt: now,
    };

    if (existingSpawnIndex >= 0) {
      agentSpawns[existingSpawnIndex] = { ...agentSpawns[existingSpawnIndex], ...updatedSpawn };
    } else {
      agentSpawns.push(updatedSpawn);
    }

    await ctx.db.patch(args.ideaId, {
      agentSpawns,
      updatedAt: now,
      lastActivityAt: now,
    });

    // Log activity based on status
    const activityType = 
      args.status === "spawning" ? "agent_spawn_started" :
      args.status === "spawned" ? "agent_spawn_completed" :
      args.status === "failed" ? "agent_spawn_failed" :
      args.status === "manual_intervention_required" ? "agent_spawn_manual_required" :
      "agent_heartbeat";

    await ctx.db.insert("activities", {
      type: activityType,
      ideaId: args.ideaId,
      agentId: args.agentId as Id<"agents">,
      message: 
        args.status === "spawning" ? `🚀 Spawning agent: ${args.agentId}` :
        args.status === "spawned" ? `✅ Agent spawned: ${args.agentId}` :
        args.status === "failed" ? `❌ Agent spawn failed: ${args.agentId}` :
        args.status === "manual_intervention_required" ? `⚠️ Manual spawn required: ${args.agentId}` :
        `💓 Agent heartbeat: ${args.agentId}`,
      metadata: { 
        agentId: args.agentId, 
        status: args.status,
        spawnCommand: args.spawnCommand,
        error: args.error,
      },
      createdAt: now,
    });

    return args.ideaId;
  },
});

// Complete local build
export const completeLocalBuild = mutation({
  args: {
    ideaId: v.id("ideas"),
    outputLocation: v.string(),
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");

    const now = Date.now();
    await ctx.db.patch(args.ideaId, {
      buildStage: "pushing_to_github",
      outputLocation: args.outputLocation,
      taskStatus: "built",
      updatedAt: now,
      lastActivityAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "build_locally_completed",
      ideaId: args.ideaId,
      message: `💻 Build completed locally: ${idea.title}`,
      metadata: { outputLocation: args.outputLocation },
      createdAt: now,
    });

    return args.ideaId;
  },
});

// Push to GitHub
export const pushToGitHub = mutation({
  args: {
    ideaId: v.id("ideas"),
    repoUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");

    const now = Date.now();
    await ctx.db.patch(args.ideaId, {
      buildStage: "deploying_to_vercel",
      githubRepoUrl: args.repoUrl,
      githubPushedAt: now,
      updatedAt: now,
      lastActivityAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "github_pushed",
      ideaId: args.ideaId,
      message: `📤 Pushed to GitHub: ${args.repoUrl}`,
      metadata: { githubRepoUrl: args.repoUrl },
      createdAt: now,
    });

    return args.ideaId;
  },
});

// Deploy to Vercel
export const deployToVercel = mutation({
  args: {
    ideaId: v.id("ideas"),
    deployedUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");

    const now = Date.now();
    await ctx.db.patch(args.ideaId, {
      buildStage: "completed",
      deployedUrl: args.deployedUrl,
      deployedAt: now,
      taskStatus: "deployed",
      buildCompletedAt: now,
      updatedAt: now,
      lastActivityAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "vercel_deployed",
      ideaId: args.ideaId,
      message: `🚀 Deployed to Vercel: ${args.deployedUrl}`,
      metadata: { deployedUrl: args.deployedUrl },
      createdAt: now,
    });

    return args.ideaId;
  },
});

// Fail build
export const failBuild = mutation({
  args: {
    ideaId: v.id("ideas"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");

    const now = Date.now();
    await ctx.db.patch(args.ideaId, {
      buildStage: "failed",
      buildError: args.error,
      buildFailedAt: now,
      taskStatus: "blocked",
      updatedAt: now,
      lastActivityAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "build_failed",
      ideaId: args.ideaId,
      message: `💥 Build failed: ${idea.title} - ${args.error}`,
      metadata: { error: args.error },
      createdAt: now,
    });

    return args.ideaId;
  },
});

// ============== UTILITY FUNCTIONS ==============

// Get ideas stats
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const allIdeas = await ctx.db.query("ideas").collect();
    
    return {
      total: allIdeas.length,
      pipeline: {
        scouted: allIdeas.filter(i => i.pipelineStatus === "scouted").length,
        approved: allIdeas.filter(i => i.pipelineStatus === "approved").length,
        rejected: allIdeas.filter(i => i.pipelineStatus === "rejected").length,
        archived: allIdeas.filter(i => i.pipelineStatus === "archived").length,
      },
      dashboard: {
        backlog: allIdeas.filter(i => i.taskStatus === "backlog").length,
        inbox: allIdeas.filter(i => i.taskStatus === "inbox").length,
        assigned: allIdeas.filter(i => i.taskStatus === "assigned").length,
        inProgress: allIdeas.filter(i => i.taskStatus === "in_progress").length,
        built: allIdeas.filter(i => i.taskStatus === "built").length,
        deployed: allIdeas.filter(i => i.taskStatus === "deployed").length,
        blocked: allIdeas.filter(i => i.taskStatus === "blocked").length,
      },
      buildStages: {
        notStarted: allIdeas.filter(i => i.buildStage === "not_started").length,
        agentsSpawning: allIdeas.filter(i => i.buildStage === "agents_spawning").length,
        agentsWorking: allIdeas.filter(i => i.buildStage === "agents_working").length,
        buildingLocally: allIdeas.filter(i => i.buildStage === "building_locally").length,
        pushingToGitHub: allIdeas.filter(i => i.buildStage === "pushing_to_github").length,
        deployingToVercel: allIdeas.filter(i => i.buildStage === "deploying_to_vercel").length,
        completed: allIdeas.filter(i => i.buildStage === "completed").length,
        failed: allIdeas.filter(i => i.buildStage === "failed").length,
      },
    };
  },
});

// Check if an idea title was previously rejected
export const isRejected = query({
  args: {
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const rejected = await ctx.db
      .query("rejectedIdeas")
      .withIndex("by_title", (q) => q.eq("title", args.title))
      .first();
    return rejected !== null;
  },
});

// List all rejected ideas (for Scout to check against)
export const listRejected = query({
  args: {},
  handler: async (ctx) => {
    const rejected = await ctx.db
      .query("rejectedIdeas")
      .order("desc")
      .collect();
    return rejected;
  },
});

// Reset idea to approved (for stuck builds)
export const resetToApproved = mutation({
  args: {
    ideaId: v.id("ideas"),
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");

    const now = Date.now();
    await ctx.db.patch(args.ideaId, {
      pipelineStatus: "approved",
      taskStatus: "backlog",
      buildStage: "not_started",
      buildId: undefined,
      buildError: undefined,
      agentSpawns: [],
      updatedAt: now,
      lastActivityAt: now,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "status_change",
      ideaId: args.ideaId,
      message: `↩️ Reset to approved: ${idea.title}`,
      createdAt: now,
    });

    return args.ideaId;
  },
});

// Delete an idea (and add to rejected list)
export const remove = mutation({
  args: {
    ideaId: v.id("ideas"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const idea = await ctx.db.get(args.ideaId);
    if (!idea) throw new Error("Idea not found");

    const now = Date.now();

    // Save to rejected ideas list to prevent future duplicates
    await ctx.db.insert("rejectedIdeas", {
      title: idea.title,
      description: idea.description,
      rejectedAt: now,
      reason: args.reason,
    });

    await ctx.db.delete(args.ideaId);

    // Log activity
    await ctx.db.insert("activities", {
      type: "idea_rejected",
      ideaId: args.ideaId,
      message: `🗑️ Idea removed: ${idea.title}`,
      createdAt: now,
    });

    return args.ideaId;
  },
});

// Remove all ideas (reset)
export const removeAll = mutation({
  args: {},
  handler: async (ctx) => {
    const ideas = await ctx.db.query("ideas").collect();
    for (const idea of ideas) {
      await ctx.db.delete(idea._id);
    }
    return { deleted: ideas.length };
  },
});
