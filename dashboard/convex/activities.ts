import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

        return {
          ...activity,
          agent,
          task,
          project,
        };
      })
    );

    return enrichedActivities;
  },
});

// List activities by type
export const listByType = query({
  args: {
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

// Create an activity log entry
export const create = mutation({
  args: {
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
    message: v.string(),
    agentId: v.optional(v.id("agents")),
    taskId: v.optional(v.id("tasks")),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activities", args);
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
