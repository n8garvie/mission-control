import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List messages for a task
export const listByTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_task", (q) => q.eq("taskId", args.taskId))
      .collect();

    // Enrich with agent details
    const enrichedMessages = await Promise.all(
      messages.map(async (msg) => {
        const fromAgent = msg.fromAgentId
          ? await ctx.db.get(msg.fromAgentId)
          : null;
        const mentionedAgents = msg.mentions
          ? await Promise.all(msg.mentions.map((id) => ctx.db.get(id)))
          : [];

        return {
          ...msg,
          fromAgent,
          mentionedAgents: mentionedAgents.filter(Boolean),
        };
      })
    );

    return enrichedMessages;
  },
});

// Create a comment/message on a task
export const create = mutation({
  args: {
    taskId: v.id("tasks"),
    content: v.string(),
    fromAgentId: v.optional(v.id("agents")),
    fromHuman: v.optional(v.boolean()),
    mentions: v.optional(v.array(v.id("agents"))),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("messages", {
      taskId: args.taskId,
      content: args.content,
      fromAgentId: args.fromAgentId,
      fromHuman: args.fromHuman,
      mentions: args.mentions,
    });

    const task = await ctx.db.get(args.taskId);
    const fromAgent = args.fromAgentId
      ? await ctx.db.get(args.fromAgentId)
      : null;
    const fromName = args.fromHuman
      ? "Nathan"
      : fromAgent
      ? `${fromAgent.emoji} ${fromAgent.name}`
      : "System";

    // Log activity
    await ctx.db.insert("activities", {
      type: "message_sent",
      agentId: args.fromAgentId,
      taskId: args.taskId,
      message: `${fromName} commented on "${task?.title}"`,
    });

    // Create notifications for mentions
    if (args.mentions && args.mentions.length > 0) {
      for (const mentionedId of args.mentions) {
        const mentionedAgent = await ctx.db.get(mentionedId);
        await ctx.db.insert("notifications", {
          mentionedAgentId: mentionedId,
          fromAgentId: args.fromAgentId,
          taskId: args.taskId,
          content: `${fromName} mentioned you: "${args.content.substring(0, 100)}..."`,
          delivered: false,
          read: false,
        });
      }
    }

    // Also notify all assignees of the task (unless they're the sender)
    if (task) {
      for (const assigneeId of task.assigneeIds) {
        if (assigneeId !== args.fromAgentId) {
          await ctx.db.insert("notifications", {
            mentionedAgentId: assigneeId,
            fromAgentId: args.fromAgentId,
            taskId: args.taskId,
            content: `${fromName} commented on "${task.title}": "${args.content.substring(0, 100)}..."`,
            delivered: false,
            read: false,
          });
        }
      }
    }

    return messageId;
  },
});

// Parse mentions from content (helper to extract @agent patterns)
export const parseMentions = query({
  args: { content: v.string() },
  handler: async (ctx, args) => {
    // Match @AgentName patterns
    const mentionPattern = /@(\w+)/g;
    const matches = [...args.content.matchAll(mentionPattern)];
    const agentNames = matches.map((m) => m[1].toLowerCase());

    // Find matching agents
    const allAgents = await ctx.db.query("agents").collect();
    const mentionedAgents = allAgents.filter((agent) =>
      agentNames.includes(agent.name.toLowerCase())
    );

    return mentionedAgents.map((agent) => agent._id);
  },
});
