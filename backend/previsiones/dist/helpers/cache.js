"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cache = void 0;
exports.addJobToQueue = addJobToQueue;
exports.updateJob = updateJob;
exports.getJobById = getJobById;
exports.deleteJob = deleteJob;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const cache = new better_sqlite3_1.default(":memory:");
exports.cache = cache;
// Create the 'jobs' table
cache.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    state TEXT,
    result TEXT
  )
`);
// Function to add a job to the queue
function addJobToQueue() {
    const stmt = cache.prepare("INSERT INTO jobs (state, result) VALUES ('queued', 'processing')");
    const result = stmt.run();
    console.log(result, cache);
    return Number(result.lastInsertRowid);
}
// Function to update the state of a job
function updateJob(jobId, result) {
    const stmt = cache.prepare("UPDATE jobs SET state = ?, result = ? WHERE id = ?");
    stmt.run("finished", result, jobId);
}
// Function to get a job by its ID
function getJobById(jobId) {
    const stmt = cache.prepare("SELECT * FROM jobs WHERE id = ?");
    const job = stmt.get(jobId);
    return job;
}
// Function to delete finished jobs
function deleteJob() {
    const stmt = cache.prepare("DELETE FROM jobs WHERE state = 'finished'");
    stmt.run();
}
//# sourceMappingURL=cache.js.map