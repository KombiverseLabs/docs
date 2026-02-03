#!/usr/bin/env node
/**
 * Changelog Auto-Updater
 * 
 * Generates changelog entries from git commits following conventional commit format.
 * Updates the changelog.mdx file with new entries.
 */

const fs = require('fs');
const { execSync } = require('child_process');

const CHANGELOG_PATH = 'changelog.mdx';
const COMMIT_TYPES = {
  feat: { emoji: '✨', label: 'Features' },
  fix: { emoji: '🐛', label: 'Bug Fixes' },
  docs: { emoji: '📚', label: 'Documentation' },
  style: { emoji: '💄', label: 'Styling' },
  refactor: { emoji: '♻️', label: 'Refactoring' },
  perf: { emoji: '⚡', label: 'Performance' },
  test: { emoji: '✅', label: 'Tests' },
  chore: { emoji: '🔧', label: 'Maintenance' },
  ci: { emoji: '👷', label: 'CI/CD' },
  security: { emoji: '🔒', label: 'Security' }
};

function getLastTag() {
  try {
    return execSync('git describe --tags --abbrev=0 2>/dev/null', { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

function getCommitsSince(since) {
  const range = since ? `${since}..HEAD` : 'HEAD~50..HEAD';
  try {
    const output = execSync(`git log ${range} --pretty=format:"%H|%s|%an|%ad" --date=short`, {
      encoding: 'utf-8'
    });
    return output.split('\n').filter(line => line.trim());
  } catch {
    return [];
  }
}

function parseCommit(line) {
  const [hash, message, author, date] = line.split('|');
  
  // Parse conventional commit format: type(scope): description
  const match = message.match(/^(\w+)(?:\(([^)]+)\))?\s*:\s*(.+)$/);
  
  if (match) {
    const [, type, scope, description] = match;
    return {
      hash: hash.substring(0, 7),
      type: type.toLowerCase(),
      scope,
      description,
      author,
      date
    };
  }
  
  return null;
}

function groupCommits(commits) {
  const groups = {};
  
  for (const commit of commits) {
    if (!commit) continue;
    
    const typeInfo = COMMIT_TYPES[commit.type];
    if (!typeInfo) continue;
    
    if (!groups[commit.type]) {
      groups[commit.type] = {
        ...typeInfo,
        commits: []
      };
    }
    
    groups[commit.type].commits.push(commit);
  }
  
  return groups;
}

function generateChangelogEntry(groups, date) {
  const lines = [];
  
  // Add Update component wrapper
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  lines.push(`<Update label="${today}" description="Auto-generated" tags={["Documentation"]}>`);
  lines.push('');
  
  // Add grouped commits
  for (const [type, group] of Object.entries(groups)) {
    if (group.commits.length === 0) continue;
    
    lines.push(`## ${group.emoji} ${group.label}`);
    lines.push('');
    
    for (const commit of group.commits) {
      const scope = commit.scope ? `**${commit.scope}:** ` : '';
      lines.push(`- ${scope}${commit.description}`);
    }
    
    lines.push('');
  }
  
  lines.push('</Update>');
  lines.push('');
  
  return lines.join('\n');
}

function updateChangelog(newEntry) {
  if (!fs.existsSync(CHANGELOG_PATH)) {
    // Create new changelog
    const template = `---
title: "Changelog"
description: "Latest updates and improvements to kombify documentation"
icon: "clock-rotate-left"
---

# Changelog

Stay up to date with the latest changes to kombify.

${newEntry}
`;
    fs.writeFileSync(CHANGELOG_PATH, template);
    console.log('✅ Created new changelog.mdx');
    return;
  }
  
  let content = fs.readFileSync(CHANGELOG_PATH, 'utf-8');
  
  // Find the position after the intro section (after first paragraph or heading)
  const insertPoint = content.indexOf('\n\n<Update');
  
  if (insertPoint > 0) {
    // Insert new entry before existing updates
    content = content.slice(0, insertPoint) + '\n\n' + newEntry + content.slice(insertPoint);
  } else {
    // Append to end
    content += '\n\n' + newEntry;
  }
  
  fs.writeFileSync(CHANGELOG_PATH, content);
  console.log('✅ Updated changelog.mdx');
}

function main() {
  console.log('📝 Changelog Auto-Updater\n');
  console.log('='.repeat(50));
  
  // Get last tag and commits since then
  const lastTag = getLastTag();
  console.log(`\nLast tag: ${lastTag || 'none'}`);
  
  const commitLines = getCommitsSince(lastTag);
  console.log(`Commits to process: ${commitLines.length}`);
  
  if (commitLines.length === 0) {
    console.log('\n✅ No new commits to add to changelog');
    return;
  }
  
  // Parse commits
  const commits = commitLines.map(parseCommit).filter(c => c !== null);
  console.log(`Conventional commits: ${commits.length}`);
  
  if (commits.length === 0) {
    console.log('\n⚠️ No conventional commits found');
    console.log('   Use format: type(scope): description');
    console.log('   Example: feat(glossary): add new terms');
    return;
  }
  
  // Group by type
  const groups = groupCommits(commits);
  
  // Show summary
  console.log('\nChanges by type:');
  for (const [type, group] of Object.entries(groups)) {
    console.log(`  ${group.emoji} ${group.label}: ${group.commits.length}`);
  }
  
  // Generate entry
  const entry = generateChangelogEntry(groups, new Date());
  
  // Update changelog
  updateChangelog(entry);
  
  console.log('\n' + '='.repeat(50));
  console.log('📋 Preview of new entry:\n');
  console.log(entry);
}

main();
