import { mutation } from "./_generated/server";
import { v } from "convex/values";

export default mutation(async ({ db }) => {
  // Get Atlas (PM)
  const atlas = await db
    .query("agents")
    .filter((q) => q.eq(q.field("name"), "Atlas"))
    .first();
  
  if (!atlas) {
    throw new Error("Atlas not found");
  }

  // Create a test task
  const taskId = await db.insert("tasks", {
    title: "Test Mission Control Setup",
    description: "Verify that agents can see and respond to tasks in Mission Control",
    status: "inbox",
    priority: "high",
    assigneeIds: [atlas._id],
    tags: ["test", "setup"],
  });

  // Create an activity
  await db.insert("activities", {
    type: "task_created",
    taskId,
    message: `Nathan created task: Test Mission Control Setup`,
  });

  return { taskId, message: "Test task created" };
});
