const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getSupabaseStatus() {
  try {
    const stdout = execSync('npx supabase status', { encoding: 'utf8' });
    const jsonStart = stdout.indexOf('{');
    if (jsonStart === -1) {
      throw new Error("Could not find JSON in Supabase status output.");
    }
    const jsonStr = stdout.slice(jsonStart);
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("❌ Failed to get Supabase status. Make sure Supabase is started (make supabase-start).", error.message);
    process.exit(1);
  }
}

function updateEnvFile(filePath, examplePath, updates) {
  let content = "";
  if (fs.existsSync(filePath)) {
    content = fs.readFileSync(filePath, 'utf8');
  } else if (fs.existsSync(examplePath)) {
    content = fs.readFileSync(examplePath, 'utf8');
  } else {
    content = Object.keys(updates).map(k => `${k}=`).join('\n') + '\n';
  }

  const lines = content.split(/\r?\n/);
  const updatedKeys = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#') || !line.includes('=')) continue;
    const eqIdx = line.indexOf('=');
    const key = line.slice(0, eqIdx).trim();
    if (updates.hasOwnProperty(key)) {
      lines[i] = `${key}=${updates[key]}`;
      updatedKeys.add(key);
    }
  }

  for (const key of Object.keys(updates)) {
    if (!updatedKeys.has(key)) {
      lines.push(`${key}=${updates[key]}`);
    }
  }

  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log(`✅ Updated ${path.basename(filePath)} successfully.`);
}

console.log("🔄 Starting local environment configuration...");

const status = getSupabaseStatus();

// Update Bot env
const botEnvPath = path.join(__dirname, '../bot/.env');
const botExamplePath = path.join(__dirname, '../bot/.env.example');
updateEnvFile(botEnvPath, botExamplePath, {
  SUPABASE_URL: status.API_URL,
  SUPABASE_KEY: status.ANON_KEY
});

// Update Web env
const webEnvPath = path.join(__dirname, '../web/.env.local');
const webExamplePath = path.join(__dirname, '../web/.env.example');
updateEnvFile(webEnvPath, webExamplePath, {
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY
});

console.log("🎉 Local configuration complete!");
