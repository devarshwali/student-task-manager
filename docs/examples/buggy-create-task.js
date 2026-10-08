// Code received from another developer, kept exactly as received.
// Ticket: "POST /tasks is not behaving correctly".
// Only the wrapper function (so we can mount it in a test app) was added around it.
module.exports = function mountBuggy(app, Task) {
  app.post("/tasks", async (req, res) => {
    try {
      const task = await Task.create(req.body);
      res.status(200).json({
        message: "Task created",
        data: tasks
      });
    } catch (error) {
      res.status(500).json(error);
    }
  });
};
