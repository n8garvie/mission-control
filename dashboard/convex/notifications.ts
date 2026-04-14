import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List notifications for an agent
export const listForAgent = query({
  args: {
    agentId: v.id("agents"),
    includeDelivered: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let notifications;
    
    if (args.includeDelivered) {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_agent", (q) => q.eq("mentionedAgentId", args.agentId))
        .order("desc")
        .collect();
    } else {
      notifications = await ctx.db
        .query("notifications")
        .withIndex("by_undelivered", (q) => q.eq("delivered", false))
        .filter((q) => q.eq(q.field("mentionedAgentId"), args.agentId))
        .collect();
    }

    // Enrich with details
    const enriched = await Promise.all(
      notifications.map(async (notif) => {
        const fromAgent = notif.fromAgentId
          ? await ctx.db.get(notif.fromAgentId)
          : null;
        const task = notif.taskId ? await ctx.db.get(notif.taskId) : null;
        return {
          ...notif,
          fromAgent,
          task,
        };
      })
    );

    return enriched;
  },
});

// List all undelivered notifications
export const listUndelivered = query({
  args: {},
  handler: async (ctx) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_undelivered", (q) => q.eq("delivered", false))
      .collect();

    // Enrich with details
    const enriched = await Promise.all(
      notifications.map(async (notif) => {
        const mentionedAgent = await ctx.db.get(notif.mentionedAgentId);
        const fromAgent = notif.fromAgentId
          ? await ctx.db.get(notif.fromAgentId)
          : null;
        const task = notif.taskId ? await ctx.db.get(notif.taskId) : null;
        return {
          ...notif,
          mentionedAgent,
          fromAgent,
          task,
        };
      })
    );

    return enriched;
  },
});

// Mark notification as delivered
export const markDelivered = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      delivered: true,
    });
    return args.notificationId;
  },
});

// Mark multiple notifications as delivered
export const markManyDelivered = mutation({
  args: {
    notificationIds: v.array(v.id("notifications")),
  },
  handler: async (ctx, args) => {
    for (const id of args.notificationIds) {
      await ctx.db.patch(id, {
        delivered: true,
      });
    }
    return args.notificationIds.length;
  },
});

// Mark notification as read
export const markRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      read: true,
    });
    return args.notificationId;
  },
});

// Create a notification
export const create = mutation({
  args: {
    mentionedAgentId: v.id("agents"),
    content: v.string(),
    fromAgentId: v.optional(v.id("agents")),
    taskId: v.optional(v.id("tasks")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      ...args,
      delivered: false,
      read: false,
    });
  },
});
