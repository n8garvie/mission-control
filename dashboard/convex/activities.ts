import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Activity type union matching the schema
const activityType = v.union(
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
);

// List recent activities
export const listRecent = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const activities = await ctx.db
      .query("activities")
      .order("desc")
      .take(limit);

    // Enrich with related data
    const enrichedActivities = await Promise.all(
      activities.map(async (activity) => {
        const agent = activity.agentId
          ? await ctx.db.get(activity.agentId)
          : null;
        const task = activity.taskId ? await ctx.db.get(activity.taskId) : null;
        const project = activity.projectId
          ? await ctx.db.get(activity.projectId)
          : null;
        const idea = activity.ideaId ? await ctx.db.get(activity.ideaId) : null;

        return {
          ...activity,
          agent,
          task,
          project,
          idea,
        };
      })
    );

    return enrichedActivities;
  },
});

// List activities by type
export const listByType = query({
  args: {
    type: activityType,
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .order("desc")
      .take(limit);

    return activities;
  },
});

// List activities by idea
export const listByIdea = query({
  args: {
    ideaId: v.id("ideas"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_idea", (q) => q.eq("ideaId", args.ideaId))
      .order("desc")
      .take(limit);

    return activities;
  },
});

// Create an activity log entry
export const create = mutation({
  args: {
    type: activityType,
    message: v.string(),
    agentId: v.optional(v.id("agents")),
    agentName: v.optional(v.string()),
    taskId: v.optional(v.id("tasks")),
    ideaId: v.optional(v.id("ideas")),
    projectId: v.optional(v.id("projects")),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activities", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Delete all activities (cleanup utility)
export const deleteAll = mutation({
  args: {},
  handler: async (ctx) => {
    const activities = await ctx.db.query("activities").collect();
    let count = 0;
    for (const a of activities) {
      await ctx.db.delete(a._id);
      count++;
    }
    return `Deleted ${count} activities`;
  }
});
