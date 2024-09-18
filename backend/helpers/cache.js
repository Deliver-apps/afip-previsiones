const SQL3 = require("better-sqlite3");

const cache = new SQL3(":memory:");

// Create the 'jobs' table
cache.exec(
  "CREATE TABLE IF NOT EXISTS jobs (id INTEGER PRIMARY KEY AUTOINCREMENT, state TEXT, result TEXT)",
);

// Function to add a job to the queue
function addJobToQueue() {
  const stmt = cache.prepare(
    "INSERT INTO jobs (state, result) VALUES ('queued', 'processing')",
  );
  const result = stmt.run();
  console.log(result, cache)
  return result.lastInsertRowid;
}

// Function to update the state of a job
function updateJob(jobId, result) {
  const stmt = cache.prepare(
    "UPDATE jobs SET state = ?,result = ? WHERE id = ?",
  );
  stmt.run("finished", result, jobId);
}

function getJobById(jobId) {
  const stmt = cache.prepare("SELECT * FROM jobs WHERE id = ?");
  const job = stmt.get(jobId);

  return job;
}

function deleteJob() {
  const stmt = cache.prepare("DELETE FROM jobs WHERE state = finished");
  stmt.run(jobId);
}

module.exports = {
  cache,
  addJobToQueue,
  updateJob,
  getJobById,
  deleteJob,
};
