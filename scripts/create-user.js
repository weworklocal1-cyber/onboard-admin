const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Function to load env variables from .env.local
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌ .env.local file not found at project root!");
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, "utf-8");
  const env = {};
  envContent.split("\n").forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] ? match[2].trim() : "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1);
      }
      env[match[1]] = value;
    }
  });
  return env;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env.local!");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 4) {
    console.log(`
Usage:
  node scripts/create-user.js <email> <password> <full_name> <role> [department]

Roles:
  founder, super_admin, hr_admin, team_lead, employee, onboarding_executive, marketing_executive, developer

Departments:
  leadership, engineering, marketing, operations, hr, sales, support, finance, field

Examples:
  node scripts/create-user.js founder@localwala.tech LocalwalaPassword "John Doe" founder leadership
  node scripts/create-user.js hr@localwala.tech EmployeePassword "Jane Smith" hr_admin hr
    `);
    process.exit(1);
  }

  const [email, password, fullName, role, department] = args;

  console.log(`Creating user with email: ${email}, role: ${role}...`);

  // 1. Create the user in Supabase Auth
  let user;
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });

  if (authError) {
    if (authError.message.includes("already been registered") || authError.status === 422) {
      console.log("User already exists in Supabase Auth. Fetching user info...");
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        console.error("❌ Error listing users:", listError.message);
        process.exit(1);
      }
      user = listData.users.find(u => u.email === email);
      if (!user) {
        console.error("❌ Could not find user with email:", email);
        process.exit(1);
      }
      console.log(`Found existing user (ID: ${user.id})`);
    } else {
      console.error("❌ Error creating auth user:", authError.message);
      process.exit(1);
    }
  } else {
    user = authData.user;
    console.log(`✅ Auth user created successfully (ID: ${user.id})`);
  }

  // 2. Create the user profile in the profiles table (using upsert)
  const profilePayload = {
    id: user.id,
    full_name: fullName,
    email: email,
    role: role,
    status: "active"
  };

  if (department) {
    profilePayload.department = department;
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert(profilePayload);

  if (profileError) {
    console.error("❌ Error creating/updating profile:", profileError.message);
    process.exit(1);
  }

  console.log(`🎉 Success! User profile created/updated for "${fullName}" with role "${role}"`);
}

main();
