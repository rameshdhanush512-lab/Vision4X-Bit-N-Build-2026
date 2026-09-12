#!/usr/bin/env node

const git = require('isomorphic-git');
const fs = require('fs');
const path = require('path');
const http = require('isomorphic-git/http/node');

const REPO_URL = 'https://github.com/rameshdhanush512-lab/Vision4X-Bit-N-Build-2026';
const COMMIT_MESSAGE = 'feat: initialize PRIVEX architecture and MVP foundation';
const BRANCH = 'main';

async function setupGitIsomorphic() {
  try {
    const projectDir = process.cwd();
    console.log(`Setting up git repository in ${projectDir}\n`);

    // Check if .git exists
    const gitDir = path.join(projectDir, '.git');
    if (!fs.existsSync(gitDir)) {
      console.error('.git directory not found. Please initialize the repository first.');
      process.exit(1);
    }

    // Configure git user
    console.log('1. Configuring git user...');
    await git.setConfig({
      fs,
      dir: projectDir,
      path: 'user.email',
      value: 'automation@privex.local'
    });
    await git.setConfig({
      fs,
      dir: projectDir,
      path: 'user.name',
      value: 'PRIVEX Setup Bot'
    });
    console.log('   ✓ Git user configured\n');

    // Add remote
    console.log(`2. Adding remote origin: ${REPO_URL}`);
    try {
      await git.addRemote({
        fs,
        dir: projectDir,
        remote: 'origin',
        url: REPO_URL
      });
    } catch (e) {
      if (e.message.includes('already exists')) {
        console.log('   Remote already exists, updating...');
        await git.removeRemote({ fs, dir: projectDir, remote: 'origin' });
        await git.addRemote({
          fs,
          dir: projectDir,
          remote: 'origin',
          url: REPO_URL
        });
      } else {
        throw e;
      }
    }
    console.log('   ✓ Remote added\n');

    // Get status to see what files will be added
    console.log('3. Staging files (respecting .gitignore)...');
    const status = await git.statusMatrix({
      fs,
      dir: projectDir
    });
    
    const filesToAdd = status.filter(([file, headStatus, workdirStatus, stageStatus]) => {
      // Stage new and modified files that are not ignored
      return workdirStatus !== 0 || stageStatus !== 0;
    }).map(([file]) => file);

    console.log(`   Found ${filesToAdd.length} files to stage`);

    // Add files
    if (filesToAdd.length > 0) {
      await git.add({
        fs,
        dir: projectDir,
        filepath: '.'
      });
      console.log('   ✓ Files staged\n');
    } else {
      console.log('   ℹ No files to stage\n');
    }

    // Commit
    console.log(`4. Creating commit: "${COMMIT_MESSAGE}"`);
    try {
      const sha = await git.commit({
        fs,
        dir: projectDir,
        message: COMMIT_MESSAGE,
        author: {
          name: 'PRIVEX Setup Bot',
          email: 'automation@privex.local'
        }
      });
      console.log(`   ✓ Commit created (${sha})\n`);
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
      const pushResult = await git.push({
        fs,
        http,
        dir: projectDir,
        remote: 'origin',
        ref: BRANCH
      });
      
      if (pushResult.ok) {
        console.log(`   ✓ Pushed to ${BRANCH}\n`);
      } else {
        if (pushResult.error) {
          throw new Error(pushResult.error);
        }
      }
    } catch (e) {
      if (e.message.includes('fatal: unable to access') || e.message.includes('401') || e.message.includes('auth')) {
        console.log('   ⚠ Failed to push (network/auth issue)');
        console.log('   Please ensure your GitHub credentials are configured.\n');
        console.log('   To push manually, run:');
        console.log(`     git push -u origin ${BRANCH}\n`);
      } else {
        console.log(`   ⚠ Push encountered an issue: ${e.message}\n`);
        console.log('   To push manually, run:');
        console.log(`     git push -u origin ${BRANCH}\n`);
      }
    }

    console.log('✓ Git repository setup complete!');
    console.log('  Repository: ' + REPO_URL);
    console.log('  Branch: ' + BRANCH);
    console.log('\nThe commit has been created locally.');
    console.log('If the push failed due to authentication, please:');
    console.log('1. Configure GitHub credentials (git config --global user.name/email)');
    console.log('2. Or set up SSH keys for GitHub');
    console.log('3. Then run: git push -u origin ' + BRANCH);
  } catch (error) {
    console.error('Error during git setup:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

setupGitIsomorphic();
