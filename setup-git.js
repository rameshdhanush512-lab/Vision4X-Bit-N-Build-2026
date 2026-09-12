#!/usr/bin/env node

const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const REPO_URL = 'https://github.com/rameshdhanush512-lab/Vision4X-Bit-N-Build-2026';
const COMMIT_MESSAGE = 'feat: initialize PRIVEX architecture and MVP foundation';
const BRANCH = 'main';

// Possible git paths on Windows
const GIT_PATHS = [
  'C:\\Program Files\\Git\\bin\\git.exe',
  'C:\\Program Files (x86)\\Git\\bin\\git.exe',
  'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Git\\bin\\git.exe',
  'git' // Try system PATH
];

function findGit() {
  for (const gitPath of GIT_PATHS) {
    try {
      if (gitPath === 'git') {
        execSync('git --version', { stdio: 'pipe' });
        return 'git';
      }
      if (fs.existsSync(gitPath)) {
        console.log(`Found git at: ${gitPath}`);
        return gitPath;
      }
    } catch (e) {
      continue;
    }
  }
  return null;
}

async function setupGit() {
  try {
    const projectDir = process.cwd();
    console.log(`Setting up git repository in ${projectDir}\n`);

    // Check if .git exists
    const gitDir = path.join(projectDir, '.git');
    if (!fs.existsSync(gitDir)) {
      console.error('.git directory not found. Please initialize the repository first.');
      process.exit(1);
    }

    // Find git executable
    console.log('Looking for git installation...');
    const gitPath = findGit();
    if (!gitPath) {
      console.error('\n❌ Git is not installed or not in PATH.');
      console.error('Please install Git from: https://git-scm.com/download/win');
      console.error('Or use: winget install Git.Git');
      process.exit(1);
    }
    console.log(`✓ Using git at: ${gitPath}\n`);

    const git = simpleGit(projectDir, { binary: gitPath });

    // Configure git user
    console.log('1. Configuring git user...');
    await git.addConfig('user.email', 'automation@privex.local', false, 'local');
    await git.addConfig('user.name', 'PRIVEX Setup Bot', false, 'local');
    console.log('   ✓ Git user configured\n');

    // Add remote
    console.log(`2. Adding remote origin: ${REPO_URL}`);
    try {
      const remotes = await git.getRemotes();
      const hasOrigin = remotes.find(r => r.name === 'origin');
      if (hasOrigin) {
        console.log('   Remote already exists, updating...');
        await git.removeRemote('origin');
      }
    } catch (e) {
      // No remotes yet
    }
    await git.addRemote('origin', REPO_URL);
    console.log('   ✓ Remote added\n');

    // Stage all files (gitignore will exclude .env, node_modules, etc.)
    console.log('3. Staging files (respecting .gitignore)...');
    await git.add('.');
    const status = await git.status();
    console.log(`   ✓ Files staged (${status.files.length} files)\n`);

    // Commit
    console.log(`4. Creating commit: "${COMMIT_MESSAGE}"`);
    try {
      const summary = await git.commit(COMMIT_MESSAGE);
      console.log(`   ✓ Commit created (${summary.commit})\n`);
    } catch (e) {
      if (e.message.includes('nothing to commit')) {
        console.log('   ℹ Nothing to commit\n');
      } else {
        throw e;
      }
    }

    // Push to main branch
    console.log(`5. Pushing to ${BRANCH} branch...`);
    try {
      await git.push('origin', BRANCH, { '--set-upstream': null });
      console.log(`   ✓ Pushed to ${BRANCH}\n`);
    } catch (e) {
      if (e.message.includes('fatal: unable to access')) {
        console.log('   ⚠ Failed to push (network/auth issue)');
        console.log('   Please ensure your GitHub credentials are configured.\n');
      } else if (e.message.includes('rejected')) {
        console.log('   ⚠ Push was rejected (branch conflict)');
        console.log('   You may need to force-push or resolve conflicts.\n');
      } else {
        throw e;
      }
    }

    console.log('✓ Git repository setup complete!');
    console.log('  Repository: ' + REPO_URL);
    console.log('  Branch: ' + BRANCH);
  } catch (error) {
    console.error('Error during git setup:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

setupGit();
