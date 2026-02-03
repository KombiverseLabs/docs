#!/usr/bin/env node
/**
 * Content Readability Checker
 * 
 * Analyzes MDX files for readability using Flesch-Kincaid scoring.
 * Target: Grade 8 or below for technical documentation.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Flesch-Kincaid Grade Level calculation
function calculateFleschKincaid(text) {
  // Remove code blocks and MDX components
  const cleanText = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, '')
    .replace(/<[^>]+\/>/g, '')
    .replace(/\{[\s\S]*?\}/g, '')
    .replace(/^---[\s\S]*?---/m, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[#*`_~]/g, '');

  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  
  if (sentences.length === 0 || words.length === 0) {
    return { score: 0, grade: 0, valid: false };
  }

  // Count syllables (simplified)
  const countSyllables = (word) => {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  };

  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = totalSyllables / words.length;

  // Flesch-Kincaid Grade Level
  const grade = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
  
  // Flesch Reading Ease
  const score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

  return {
    score: Math.max(0, Math.min(100, score)),
    grade: Math.max(0, Math.round(grade * 10) / 10),
    wordCount: words.length,
    sentenceCount: sentences.length,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    valid: true
  };
}

function getReadabilityLabel(score) {
  if (score >= 90) return '✅ Very Easy';
  if (score >= 80) return '✅ Easy';
  if (score >= 70) return '✅ Fairly Easy';
  if (score >= 60) return '⚠️ Standard';
  if (score >= 50) return '⚠️ Fairly Difficult';
  if (score >= 30) return '❌ Difficult';
  return '❌ Very Difficult';
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const result = calculateFleschKincaid(content);
  
  return {
    file: path.relative(process.cwd(), filePath),
    ...result,
    label: result.valid ? getReadabilityLabel(result.score) : 'N/A'
  };
}

function main() {
  const mdxFiles = glob.sync('**/*.mdx', {
    ignore: ['node_modules/**', '_templates/**', 'snippets/**']
  });

  console.log('📖 Readability Analysis Report\n');
  console.log('='.repeat(80));
  
  const results = [];
  let warnings = 0;
  let errors = 0;

  for (const file of mdxFiles) {
    const result = analyzeFile(file);
    if (!result.valid) continue;
    
    results.push(result);
    
    if (result.score < 50) errors++;
    else if (result.score < 60) warnings++;
  }

  // Sort by score (lowest first to highlight issues)
  results.sort((a, b) => a.score - b.score);

  // Print detailed results
  console.log('\n📊 Results by Readability Score:\n');
  
  for (const result of results) {
    const statusIcon = result.score >= 60 ? '✅' : result.score >= 50 ? '⚠️' : '❌';
    console.log(`${statusIcon} ${result.file}`);
    console.log(`   Score: ${result.score.toFixed(1)} | Grade: ${result.grade} | Words: ${result.wordCount}`);
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📈 Summary:\n');
  
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const avgGrade = results.reduce((sum, r) => sum + r.grade, 0) / results.length;
  
  console.log(`   Total files analyzed: ${results.length}`);
  console.log(`   Average readability score: ${avgScore.toFixed(1)}`);
  console.log(`   Average grade level: ${avgGrade.toFixed(1)}`);
  console.log(`   Files needing improvement: ${errors + warnings}`);
  console.log(`     - Critical (< 50): ${errors}`);
  console.log(`     - Warning (50-60): ${warnings}`);

  // Recommendations for worst files
  if (errors > 0) {
    console.log('\n⚠️ Files requiring attention:\n');
    results.slice(0, 5).forEach(r => {
      if (r.score < 60) {
        console.log(`   • ${r.file}`);
        console.log(`     Current: Grade ${r.grade}, Score ${r.score.toFixed(1)}`);
        console.log(`     Suggestions:`);
        if (r.avgWordsPerSentence > 20) {
          console.log(`       - Break up long sentences (avg: ${r.avgWordsPerSentence} words)`);
        }
        console.log(`       - Use simpler words where possible`);
        console.log(`       - Add more bullet points and lists`);
      }
    });
  }

  // Write report for CI
  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportContent = `# Readability Report

Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
|--------|-------|
| Files Analyzed | ${results.length} |
| Average Score | ${avgScore.toFixed(1)} |
| Average Grade | ${avgGrade.toFixed(1)} |
| Critical Issues | ${errors} |
| Warnings | ${warnings} |

## Files by Readability

${results.map(r => `- **${r.file}**: Score ${r.score.toFixed(1)}, Grade ${r.grade}`).join('\n')}
`;

  fs.writeFileSync(path.join(reportDir, 'readability-report.md'), reportContent);
  
  // Exit with error if critical issues
  if (errors > 5) {
    console.log('\n❌ Too many readability issues detected');
    process.exit(1);
  }
}

main();
