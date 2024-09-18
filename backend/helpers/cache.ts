import Database from "better-sqlite3";
import { Job } from "../types/job.types";

const cache = new Database(":memory:");

// Create the 'jobs' table
cache.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state TEXT,
    result TEXT
  )
`);

// Function to add a job to the queue
function addJobToQueue(): number {
  const stmt = cache.prepare(
    "INSERT INTO jobs (state, result) VALUES ('queued', 'processing')",
  );
  const result = stmt.run();
  console.log(result, cache);
  return Number(result.lastInsertRowid);
}

// Function to update the state of a job
function updateJob(jobId: number, result: string): void {
  const stmt = cache.prepare(
    "UPDATE jobs SET state = ?, result = ? WHERE id = ?",
  );
  stmt.run("finished", result, jobId);
}

// Function to get a job by its ID
function getJobById(jobId: string): Job | undefined {
  const stmt = cache.prepare("SELECT * FROM jobs WHERE id = ?");
  const job = stmt.get(jobId) as Job | undefined;
  return job;
}

// Function to delete finished jobs
function deleteJob(): void {
  const stmt = cache.prepare("DELETE FROM jobs WHERE state = 'finished'");
  stmt.run();
}

export { cache, addJobToQueue, updateJob, getJobById, deleteJob };
