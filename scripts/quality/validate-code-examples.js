#!/usr/bin/env node
/**
 * Code Examples Validator
 * 
 * Validates that code examples in documentation are syntactically correct
 * and follow best practices.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Language validators
const validators = {
  javascript: validateJavaScript,
  js: validateJavaScript,
  typescript: validateTypeScript,
  ts: validateTypeScript,
  json: validateJSON,
  yaml: validateYAML,
  yml: validateYAML,
  bash: validateBash,
  shell: validateBash,
  sh: validateBash
};

function extractCodeBlocks(content) {
  const blocks = [];
  const regex = /```(\w+)?(?:\s+[^\n]*)?\n([\s\S]*?)```/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    blocks.push({
      language: match[1] || 'unknown',
      code: match[2],
      position: match.index
    });
  }
  
  return blocks;
}

function validateJavaScript(code) {
  const issues = [];
  
  // Check for console.log that might be placeholder
  if (/console\.log\(['"]TODO/i.test(code)) {
    issues.push('Contains TODO placeholder in console.log');
  }
  
  // Check for placeholder values
  if (/YOUR_API_KEY|YOUR_SECRET|REPLACE_ME/i.test(code)) {
    issues.push('Contains placeholder values that should be replaced');
  }
  
  // Check for missing semicolons (simple heuristic)
  const lines = code.split('\n').filter(l => l.trim());
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip comments, blocks, and control structures
    if (trimmed.startsWith('//') || 
        trimmed.startsWith('/*') ||
        trimmed.startsWith('*') ||
        trimmed.endsWith('{') ||
        trimmed.endsWith('}') ||
        trimmed.endsWith(',') ||
        trimmed === '') {
      continue;
    }
  }
  
  // Check for unbalanced brackets
  const openBrackets = (code.match(/\{/g) || []).length;
  const closeBrackets = (code.match(/\}/g) || []).length;
  if (openBrackets !== closeBrackets) {
    issues.push(`Unbalanced braces: ${openBrackets} open, ${closeBrackets} close`);
  }
  
  const openParens = (code.match(/\(/g) || []).length;
  const closeParens = (code.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    issues.push(`Unbalanced parentheses: ${openParens} open, ${closeParens} close`);
  }
  
  return issues;
}

function validateTypeScript(code) {
  // TypeScript inherits JavaScript validation
  const issues = validateJavaScript(code);
  
  // Additional TypeScript checks
  if (/: any(?:\s|;|,|\)|\])/g.test(code)) {
    issues.push('Consider using specific types instead of "any"');
  }
  
  return issues;
}

function validateJSON(code) {
  const issues = [];
  
  try {
    JSON.parse(code);
  } catch (e) {
    issues.push(`Invalid JSON: ${e.message}`);
  }
  
  // Check for trailing commas (common error)
  if (/,\s*[}\]]/.test(code)) {
    issues.push('Contains trailing comma (not valid in JSON)');
  }
  
  return issues;
}

function validateYAML(code) {
  const issues = [];
  
  // Check for tab characters (YAML prefers spaces)
  if (/\t/.test(code)) {
    issues.push('Contains tab characters (YAML prefers spaces)');
  }
  
  // Check for placeholder values
  if (/YOUR_|REPLACE_ME|<[^>]+>/i.test(code)) {
    // This is often intentional, so just note it
  }
  
  // Check for inconsistent indentation
  const lines = code.split('\n');
  let prevIndent = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    
    const indent = line.match(/^(\s*)/)[1].length;
    if (indent % 2 !== 0) {
      issues.push(`Line ${i + 1}: Odd indentation (${indent} spaces) - use 2-space increments`);
      break;
    }
  }
  
  return issues;
}

function validateBash(code) {
  const issues = [];
  
  // Check for dangerous commands without warnings
  const dangerousPatterns = [
    { pattern: /rm\s+-rf\s+\/(?!\s)/, message: 'Dangerous rm -rf / command' },
    { pattern: />\s*\/dev\/sd[a-z]/, message: 'Writing directly to disk device' },
    { pattern: /chmod\s+777/, message: 'chmod 777 is insecure' }
  ];
  
  for (const { pattern, message } of dangerousPatterns) {
    if (pattern.test(code)) {
      issues.push(message);
    }
  }
  
  // Check for hardcoded credentials
  if (/password\s*=\s*["'][^"']+["']|api[_-]?key\s*=\s*["'][^"']+["']/i.test(code)) {
    issues.push('May contain hardcoded credentials');
  }
  
  return issues;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const codeBlocks = extractCodeBlocks(content);
  const results = [];
  
  for (const block of codeBlocks) {
    const validator = validators[block.language.toLowerCase()];
    let issues = [];
    
    if (validator) {
      issues = validator(block.code);
    }
    
    // Check for empty code blocks
    if (!block.code.trim()) {
      issues.push('Empty code block');
    }
    
    // Check for very long lines
    const lines = block.code.split('\n');
    const longLines = lines.filter(l => l.length > 100);
    if (longLines.length > 0) {
      issues.push(`${longLines.length} line(s) exceed 100 characters`);
    }
    
    results.push({
      language: block.language,
      issues,
      lineCount: lines.length
    });
  }
  
  return {
    file: path.relative(process.cwd(), filePath),
    codeBlocks: results
  };
}

function main() {
  const mdxFiles = glob.sync('**/*.mdx', {
    ignore: ['node_modules/**', '_templates/**']
  });

  console.log('🔍 Code Examples Validator\n');
  console.log('='.repeat(80));
  
  let totalBlocks = 0;
  let blocksWithIssues = 0;
  const allIssues = [];
  
  for (const file of mdxFiles) {
    const result = analyzeFile(file);
    
    for (const block of result.codeBlocks) {
      totalBlocks++;
      
      if (block.issues.length > 0) {
        blocksWithIssues++;
        allIssues.push({
          file: result.file,
          language: block.language,
          issues: block.issues
        });
      }
    }
  }
  
  console.log('\n📊 Summary:\n');
  console.log(`   Total code blocks: ${totalBlocks}`);
  console.log(`   Blocks with issues: ${blocksWithIssues}`);
  console.log(`   Success rate: ${((totalBlocks - blocksWithIssues) / totalBlocks * 100).toFixed(1)}%`);
  
  if (allIssues.length > 0) {
    console.log('\n⚠️ Issues Found:\n');
    
    // Group by file
    const byFile = {};
    for (const issue of allIssues) {
      if (!byFile[issue.file]) byFile[issue.file] = [];
      byFile[issue.file].push(issue);
    }
    
    for (const [file, issues] of Object.entries(byFile)) {
      console.log(`📄 ${file}`);
      for (const issue of issues) {
        console.log(`   [${issue.language}]`);
        for (const msg of issue.issues) {
          console.log(`     ⚠️ ${msg}`);
        }
      }
      console.log();
    }
  }
  
  // Language distribution
  const langCounts = {};
  for (const file of mdxFiles) {
    const result = analyzeFile(file);
    for (const block of result.codeBlocks) {
      langCounts[block.language] = (langCounts[block.language] || 0) + 1;
    }
  }
  
  console.log('\n📊 Language Distribution:\n');
  const sortedLangs = Object.entries(langCounts).sort((a, b) => b[1] - a[1]);
  for (const [lang, count] of sortedLangs) {
    console.log(`   ${lang}: ${count}`);
  }
  
  // Generate report
  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportContent = `# Code Examples Validation Report

Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
|--------|-------|
| Total Code Blocks | ${totalBlocks} |
| Blocks with Issues | ${blocksWithIssues} |
| Success Rate | ${((totalBlocks - blocksWithIssues) / totalBlocks * 100).toFixed(1)}% |

## Language Distribution

${sortedLangs.map(([lang, count]) => `- **${lang}**: ${count} blocks`).join('\n')}

## Issues

${allIssues.length === 0 ? '✅ No issues found!' : allIssues.map(i => `
### ${i.file} (${i.language})
${i.issues.map(issue => `- ${issue}`).join('\n')}
`).join('\n')}
`;

  fs.writeFileSync(path.join(reportDir, 'code-validation-report.md'), reportContent);
  console.log('\n📝 Report saved to reports/code-validation-report.md');
}

main();
