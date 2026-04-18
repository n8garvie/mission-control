import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// DEPRECATED: This file is kept for backward compatibility
// The unified system now uses the `ideas` table directly for build tracking
// Use api.ideas.* functions instead

// Get all builds (redirects to ideas with build info)
export const list = query({
  args: {},
  handler: async (ctx) => {
    const ideas = await ctx.db.query("ideas").order("desc").collect();
    // Map ideas to build-like structure for backward compatibility
    return ideas.map((idea: any) => ({
      _id: idea._id,
      buildId: idea.buildId || idea._id,
      title: idea.title,
      description: idea.description,
      status: mapBuildStageToStatus(idea.buildStage),
      stage: mapBuildStageToNumber(idea.buildStage),
      potential: idea.potential,
      githubUrl: idea.githubRepoUrl,
      vercelUrl: idea.deployedUrl,
      ideaId: idea._id,
      startedAt: idea.buildStartedAt || idea.createdAt,
      completedAt: idea.buildCompletedAt,
      agents: idea.agentSpawns ? Object.fromEntries(
        idea.agentSpawns.map((s: any) => [s.agentName, s.status])
      ) : {},
    }));
  },
});

// Get builds by status (redirects to ideas)
export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("pending"),
      v.literal("building"),
      v.literal("agent_complete"),
      v.literal("github_pushed"),
      v.literal("vercel_deployed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    const ideas = await ctx.db.query("ideas").collect();
    const filtered = ideas.filter((idea: any) => 
      mapBuildStageToStatus(idea.buildStage) === args.status
    );
    return filtered.map((idea: any) => ({
      _id: idea._id,
      buildId: idea.buildId || idea._id,
      title: idea.title,
      status: mapBuildStageToStatus(idea.buildStage),
    }));
  },
});

// Get pipeline stats (from ideas)
export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const ideas = await ctx.db.query("ideas").collect();
    
    return {
      total: ideas.length,
      pending: ideas.filter((i: any) => i.buildStage === "not_started").length,
      building: ideas.filter((i: any) => 
        i.buildStage === "agents_spawning" || 
        i.buildStage === "agents_working" ||
        i.buildStage === "building_locally"
      ).length,
      agentComplete: ideas.filter((i: any) => i.buildStage === "building_locally").length,
      githubPushed: ideas.filter((i: any) => i.buildStage === "pushing_to_github").length,
      vercelDeployed: ideas.filter((i: any) => i.buildStage === "completed").length,
      failed: ideas.filter((i: any) => i.buildStage === "failed").length,
    };
  },
});

// Create or update a build (redirects to ideas)
export const upsert = mutation({
  args: {
    buildId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("building"),
      v.literal("agent_complete"),
      v.literal("github_pushed"),
      v.literal("vercel_deployed"),
      v.literal("failed")
    ),
    stage: v.number(),
    potential: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("moonshot"))),
    githubUrl: v.optional(v.string()),
    vercelUrl: v.optional(v.string()),
    ideaId: v.optional(v.id("ideas")),
  },
  handler: async (ctx, args) => {
    // Find the idea by buildId or ideaId
    let idea: any = null;
    
    if (args.ideaId) {
      idea = await ctx.db.get(args.ideaId);
    }
    
    if (!idea) {
      const ideas = await ctx.db.query("ideas").collect();
      idea = ideas.find((i: any) => i.buildId === args.buildId);
    }

    if (idea) {
      // Update existing idea
      await ctx.db.patch(idea._id, {
        buildId: args.buildId,
        buildStage: mapStatusToBuildStage(args.status),
        githubRepoUrl: args.githubUrl,
        deployedUrl: args.vercelUrl,
      });
      return idea._id;
    } else {
      // Create new idea with build info
      return await ctx.db.insert("ideas", {
        title: args.title,
        description: args.description || "",
        targetAudience: "",
        mvpScope: "",
        potential: args.potential || "medium",
        source: "manual",
        scoutedBy: "system",
        scoutedAt: Date.now(),
        pipelineStatus: "approved",
        taskStatus: "in_progress",
        buildStage: mapStatusToBuildStage(args.status),
        buildId: args.buildId,
        assignedAgents: [],
        agentSpawns: [],
        tags: [],
        category: "other",
        discoverySource: "manual",
        priority: "medium",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastActivityAt: Date.now(),
      });
    }
  },
});

// Update agent status (redirects to ideas)
export const updateAgentStatus = mutation({
  args: {
    buildId: v.string(),
    agent: v.union(v.literal("forge"), v.literal("pixel"), v.literal("echo"), v.literal("integrator"), v.literal("lens")),
    status: v.union(v.literal("pending"), v.literal("running"), v.literal("complete"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    const ideas = await ctx.db.query("ideas").collect();
    const idea = ideas.find((i: any) => i.buildId === args.buildId);

    if (!idea) throw new Error("Build not found");

    // Update agent spawn status
    const agentSpawns = idea.agentSpawns || [];
    const existingSpawn = agentSpawns.find((s: any) => s.agentName === args.agent);
    
    const spawnStatus = 
      args.status === "pending" ? "pending" :
      args.status === "running" ? "working" :
      args.status === "complete" ? "completed" :
      "failed";

    if (existingSpawn) {
      existingSpawn.status = spawnStatus;
    } else {
      agentSpawns.push({
        agentId: args.agent,
        agentName: args.agent,
        status: spawnStatus,
      });
    }

    await ctx.db.patch(idea._id, { agentSpawns });
    return idea._id;
  },
});

// Delete all builds (redirects to ideas)
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

// Helper functions
function mapBuildStageToStatus(stage: string | undefined): string {
  switch (stage) {
    case "not_started": return "pending";
    case "agents_spawning":
    case "agents_working":
    case "building_locally": return "building";
    case "pushing_to_github": return "github_pushed";
    case "deploying_to_vercel": return "vercel_deployed";
    case "completed": return "vercel_deployed";
    case "failed": return "failed";
    default: return "pending";
  }
}

function mapBuildStageToNumber(stage: string | undefined): number {
  switch (stage) {
    case "not_started": return 0;
    case "agents_spawning": return 1;
    case "agents_working": return 2;
    case "building_locally": return 3;
    case "pushing_to_github": return 4;
    case "deploying_to_vercel": return 5;
    case "completed": return 6;
    case "failed": return -1;
    default: return 0;
  }
}

function mapStatusToBuildStage(status: string): "not_started" | "agents_spawning" | "agents_working" | "building_locally" | "pushing_to_github" | "deploying_to_vercel" | "completed" | "failed" {
  switch (status) {
    case "pending": return "not_started";
    case "building": return "agents_working";
    case "agent_complete": return "building_locally";
    case "github_pushed": return "pushing_to_github";
    case "vercel_deployed": return "completed";
    case "failed": return "failed";
    default: return "not_started";
  }
}
