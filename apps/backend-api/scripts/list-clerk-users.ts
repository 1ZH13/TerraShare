import { createClerkClient } from "@clerk/backend";
import { readFileSync } from "fs";

const env = {};
const lines = readFileSync("./.env", "utf8").split("\n");
for (const line of lines) {
  const [key, ...vals] = line.split("=");
  if (key && key.trim() && !key.startsWith("#")) {
    env[key.trim()] = vals.join("=").trim();
  }
}

const client = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
});

async function listUsers() {
  try {
    const users = await client.users.getUserList({
      limit: 100,
      orderBy: "-created_at",
    });

    const userList = users.data ?? [];
    console.log(`\n=== Users in Clerk (${userList.length}) ===\n`);
    for (const user of userList) {
      console.log(`ID: ${user.id}`);
      console.log(`Email: ${user.primaryEmailAddress?.emailAddress ?? "N/A"}`);
      console.log(`Name: ${user.fullName ?? "N/A"}`);
      console.log(`Created: ${new Date(user.createdAt).toLocaleString()}`);
      console.log(`Public Metadata: ${JSON.stringify(user.publicMetadata)}`);
      console.log("---");
    }
    console.log(`\nTotal: ${userList.length} users`);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

listUsers();