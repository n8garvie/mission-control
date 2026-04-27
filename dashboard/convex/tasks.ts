import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List all tasks
export const list = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    
    // Enrich with agent details
    const enrichedTasks = await Promise.all(
      tasks.map(async (task) => {
        const assignees = await Promise.all(
          task.assigneeIds.map((id) => ctx.db.get(id))
        );
        const creator = task.createdBy ? await ctx.db.get(task.createdBy) : null;
        return {
          ...task,
          assignees: assignees.filter(Boolean),
          creator,
        };
      })
    );
    
    return enrichedTasks;
  },
});

// List tasks by status
export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done"),
      v.literal("blocked")
    ),
  },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .collect();

    // Enrich with agent details
    const enrichedTasks = await Promise.all(
      tasks.map(async (task) => {
        const assignees = await Promise.all(
          task.assigneeIds.map((id) => ctx.db.get(id))
        );
        return {
          ...task,
          assignees: assignees.filter(Boolean),
        };
      })
    );

    return enrichedTasks;
  },
});

// Get a specific task
export const get = query({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.id);
    if (!task) return null;

    // Enrich with agent details
    const assignees = await Promise.all(
      task.assigneeIds.map((id) => ctx.db.get(id))
    );
    const creator = task.createdBy ? await ctx.db.get(task.createdBy) : null;

    return {
      ...task,
      assignees: assignees.filter(Boolean),
      creator,
    };
  },
});

// Get tasks assigned to an agent
export const getAssignedToAgent = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const allTasks = await ctx.db.query("tasks").collect();
    return allTasks.filter((task) => task.assigneeIds.includes(args.agentId));
  },
});

// Create a new task
export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    brief: v.optional(v.string()),
    priority: v.union(
      v.literal("critical"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    assigneeIds: v.optional(v.array(v.id("agents"))),
    createdBy: v.optional(v.id("agents")),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const taskId = await ctx.db.insert("tasks", {
      title: args.title,
      description: args.description,
      brief: args.brief,
      status: "inbox",
      priority: args.priority,
      assigneeIds: args.assigneeIds || [],
      createdBy: args.createdBy,
      tags: args.tags || [],
    });

    // Log activity
    const creator = args.createdBy ? await ctx.db.get(args.createdBy) : null;
    const creatorName = creator ? creator.name : "Nathan";
    
    await ctx.db.insert("activities", {
      type: "task_created",
      agentId: args.createdBy,
      taskId,
      message: `${creatorName} created task: ${args.title}`,
    });

    // Create notifications for assignees
    if (args.assigneeIds && args.assigneeIds.length > 0) {
      for (const assigneeId of args.assigneeIds) {
        await ctx.db.insert("notifications", {
          mentionedAgentId: assigneeId,
          fromAgentId: args.createdBy,
          taskId,
          content: `You've been assigned to: ${args.title}`,
          delivered: false,
          read: false,
        });
      }
    }

    return taskId;
  },
});

// Update task status
export const updateStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(
      v.literal("inbox"),
      v.literal("assigned"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done"),
      v.literal("blocked")
    ),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    await ctx.db.patch(args.taskId, { status: args.status });

    // Log activity
    await ctx.db.insert("activities", {
      type: "status_change",
      taskId: args.taskId,
      message: `Task "${task.title}" moved to ${args.status}`,
    });

    return args.taskId;
  },
});

// Update task (full update)
export const update = mutation({
  args: {
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    brief: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("inbox"),
        v.literal("assigned"),
        v.literal("in_progress"),
        v.literal("review"),
        v.literal("done"),
        v.literal("blocked")
      )
    ),
    priority: v.optional(
      v.union(
        v.literal("critical"),
        v.literal("high"),
        v.literal("medium"),
        v.literal("low")
      )
    ),
    assigneeIds: v.optional(v.array(v.id("agents"))),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { taskId, ...updates } = args;
    const task = await ctx.db.get(taskId);
    if (!task) throw new Error("Task not found");

    await ctx.db.patch(taskId, updates);

    // Log activity
    await ctx.db.insert("activities", {
      type: "task_updated",
      taskId,
      message: `Task "${task.title}" updated`,
    });

    return taskId;
  },
});

// Assign task to agents
export const assign = mutation({
  args: {
    taskId: v.id("tasks"),
    assigneeIds: v.array(v.id("agents")),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    await ctx.db.patch(args.taskId, {
      assigneeIds: args.assigneeIds,
      status: "assigned",
    });

    // Create notifications for new assignees
    const newAssignees = args.assigneeIds.filter(
      (id) => !task.assigneeIds.includes(id)
    );

    for (const assigneeId of newAssignees) {
      await ctx.db.insert("notifications", {
        mentionedAgentId: assigneeId,
        taskId: args.taskId,
        content: `You've been assigned to: ${task.title}`,
        delivered: false,
        read: false,
      });
    }

    // Log activity
    const assignees = await Promise.all(
      args.assigneeIds.map((id) => ctx.db.get(id))
    );
    const assigneeNames = assignees
      .filter(Boolean)
      .map((a) => a!.name)
      .join(", ");

    await ctx.db.insert("activities", {
      type: "task_updated",
      taskId: args.taskId,
      message: `Task "${task.title}" assigned to ${assigneeNames}`,
    });

    return args.taskId;
  },
});
