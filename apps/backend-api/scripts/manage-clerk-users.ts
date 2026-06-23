import { createClerkClient } from "@clerk/backend";
import { readFileSync } from "fs";

const env = {};
readFileSync("./.env", "utf8").split("\n").forEach((line) => {
  const [k, ...v] = line.split("=");
  if (k && !k.startsWith("#")) env[k.trim()] = v.join("=").trim();
});

const client = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

async function main() {
  const users = await client.users.getUserList({ limit: 100 });
  const terradmin = users.data.find((u) => u.emailAddresses[0]?.emailAddress === "terradmin@gmail.com");

  if (!terradmin) {
    console.error("User terradmin@gmail.com not found");
    process.exit(1);
  }

  console.log(`Found terradmin: ${terradmin.id}`);

  await client.users.updateUser(terradmin.id, {
    publicMetadata: { role: "admin" },
  });
  console.log("Updated terradmin as admin");

  try {
    const newUser = await client.users.createUser({
      emailAddress: ["terrauser@gmail.com"],
      password: "TerraUser2026!",
      publicMetadata: { role: "user" },
      firstName: "Terra",
      lastName: "User",
    });
    console.log(`Created terrauser: ${newUser.id}`);
    console.log("Password set to: 123456789");
  } catch (err) {
    if (err.message?.includes("email_address")) {
      console.log("terrauser@gmail.com already exists, skipping creation");
    } else {
      throw err;
    }
  }

  console.log("\nDone!");
}

main().catch(console.error);