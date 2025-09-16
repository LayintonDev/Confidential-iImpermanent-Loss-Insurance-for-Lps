#!/usr/bin/env node

import EventIndexer from "./index";

async function start() {
  console.log("🚀 Starting Confidential IL Insurance Event Indexer");

  const indexer = new EventIndexer();
  await indexer.start();

  console.log("✅ Event Indexer is running. Press Ctrl+C to stop.");
}

start().catch(error => {
  console.error("💥 Failed to start indexer:", error);
  process.exit(1);
});
