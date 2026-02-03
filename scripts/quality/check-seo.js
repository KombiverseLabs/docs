#!/usr/bin/env node
/**
 * SEO Metadata Checker
 * 
 * Validates that all MDX pages have proper SEO metadata
 * including title, description, and OpenGraph tags.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const matter = require('gray-matter');

const SEO_REQUIREMENTS = {
  title: {
    required: true,
    minLength: 10,
    maxLength: 60,
    message: 'Title should be 10-60 characters for optimal SEO'
  },
  description: {
    required: true,
    minLength: 50,
    maxLength: 160,
    message: 'Description should be 50-160 characters for optimal SEO'
  },
  sidebarTitle: {
    required: false,
    maxLength: 30,
    message: 'Sidebar title should be concise (max 30 chars)'
  }
};

const RECOMMENDED_FIELDS = ['icon', 'og:image', 'keywords'];

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content: body } = matter(content);
  
  const issues = [];
  const warnings = [];
  const suggestions = [];
  
  // Check required fields
  for (const [field, rules] of Object.entries(SEO_REQUIREMENTS)) {
    const value = frontmatter[field];
    
    if (rules.required && !value) {
      issues.push(`Missing required field: ${field}`);
      continue;
    }
    
    if (value) {
      if (rules.minLength && value.length < rules.minLength) {
        warnings.push(`${field} is too short (${value.length}/${rules.minLength} chars): ${rules.message}`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        warnings.push(`${field} is too long (${value.length}/${rules.maxLength} chars): ${rules.message}`);
      }
    }
  }
  
  // Check for keyword stuffing in title
  if (frontmatter.title) {
    const words = frontmatter.title.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length - uniqueWords.size > 2) {
      warnings.push('Title may contain repeated keywords (keyword stuffing)');
    }
  }
  
  // Check description quality
  if (frontmatter.description) {
    const desc = frontmatter.description.toLowerCase();
    
    // Should not start with "This page" or similar
    if (/^(this\s+(page|document|article)|here\s+we)/i.test(desc)) {
      suggestions.push('Description should be more direct - avoid "This page..."');
    }
    
    // Should contain action words
    const hasActionWord = /learn|discover|understand|explore|get started|create|build|configure|deploy/i.test(desc);
    if (!hasActionWord) {
      suggestions.push('Consider adding action words to description (learn, discover, create, etc.)');
    }
  }
  
  // Check for heading structure
  const h1Count = (body.match(/^#\s+/gm) || []).length;
  if (h1Count > 0) {
    warnings.push(`Contains ${h1Count} H1 heading(s) - use H2 or below (Mintlify uses title as H1)`);
  }
  
  // Check for first paragraph as introduction
  const firstParagraph = body
    .replace(/^---[\s\S]*?---/, '')
    .replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, '')
    .replace(/<[^>]+\/>/g, '')
    .trim()
    .split('\n\n')[0];
  
  if (firstParagraph && firstParagraph.startsWith('#')) {
    suggestions.push('Consider adding an introductory paragraph before the first heading');
  }
  
  // Check for images without alt text
  const imagesWithoutAlt = body.match(/<img[^>]+(?!alt=)[^>]*>/g) || [];
  const mdImagesWithoutAlt = body.match(/!\[\]\([^)]+\)/g) || [];
  
  if (imagesWithoutAlt.length + mdImagesWithoutAlt.length > 0) {
    issues.push(`${imagesWithoutAlt.length + mdImagesWithoutAlt.length} image(s) missing alt text`);
  }
  
  return {
    file: path.relative(process.cwd(), filePath),
    frontmatter,
    issues,
    warnings,
    suggestions,
    score: calculateSeoScore(issues, warnings, suggestions)
  };
}

function calculateSeoScore(issues, warnings, suggestions) {
  let score = 100;
  score -= issues.length * 20;
  score -= warnings.length * 10;
  score -= suggestions.length * 5;
  return Math.max(0, score);
}

function getScoreEmoji(score) {
  if (score >= 90) return '🟢';
  if (score >= 70) return '🟡';
  if (score >= 50) return '🟠';
  return '🔴';
}

function main() {
  const mdxFiles = glob.sync('**/*.mdx', {
    ignore: ['node_modules/**', '_templates/**', 'snippets/**', 'internal-notes/**']
  });

  console.log('🔍 SEO Metadata Analysis Report\n');
  console.log('='.repeat(80));
  
  const results = [];
  
  for (const file of mdxFiles) {
    const result = analyzeFile(file);
    results.push(result);
  }
  
  // Sort by score
  results.sort((a, b) => a.score - b.score);
  
  // Statistics
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const criticalCount = results.filter(r => r.issues.length > 0).length;
  const warningCount = results.filter(r => r.warnings.length > 0).length;
  
  console.log('\n📊 Summary:\n');
  console.log(`   Total pages: ${results.length}`);
  console.log(`   Average SEO score: ${avgScore.toFixed(1)}%`);
  console.log(`   Pages with issues: ${criticalCount}`);
  console.log(`   Pages with warnings: ${warningCount}`);
  
  // Show files with issues
  const filesWithIssues = results.filter(r => r.issues.length > 0 || r.warnings.length > 0);
  
  if (filesWithIssues.length > 0) {
    console.log('\n⚠️ Pages Requiring Attention:\n');
    
    for (const result of filesWithIssues.slice(0, 15)) {
      console.log(`${getScoreEmoji(result.score)} ${result.file} (Score: ${result.score})`);
      
      for (const issue of result.issues) {
        console.log(`   ❌ ${issue}`);
      }
      for (const warning of result.warnings) {
        console.log(`   ⚠️  ${warning}`);
      }
      for (const suggestion of result.suggestions) {
        console.log(`   💡 ${suggestion}`);
      }
      console.log();
    }
  }
  
  // Best performing pages
  console.log('\n✅ Top Performing Pages:\n');
  results
    .filter(r => r.score >= 90)
    .slice(0, 5)
    .forEach(r => {
      console.log(`   ${getScoreEmoji(r.score)} ${r.file} (Score: ${r.score})`);
    });
  
  // Write report
  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportContent = `# SEO Analysis Report

Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
|--------|-------|
| Total Pages | ${results.length} |
| Average Score | ${avgScore.toFixed(1)}% |
| Pages with Issues | ${criticalCount} |
| Pages with Warnings | ${warningCount} |

## Detailed Results

${results.map(r => `
### ${r.file}
- **Score**: ${r.score}%
- **Title**: ${r.frontmatter.title || 'Missing'}
- **Description**: ${r.frontmatter.description || 'Missing'}
${r.issues.length ? `- **Issues**: ${r.issues.join(', ')}` : ''}
${r.warnings.length ? `- **Warnings**: ${r.warnings.join(', ')}` : ''}
`).join('\n')}
`;

  fs.writeFileSync(path.join(reportDir, 'seo-report.md'), reportContent);
  
  console.log('\n📝 Report saved to reports/seo-report.md');
  
  // Exit with error if too many critical issues
  if (criticalCount > results.length * 0.2) {
    console.log('\n❌ More than 20% of pages have critical SEO issues');
    process.exit(1);
  }
}

main();
