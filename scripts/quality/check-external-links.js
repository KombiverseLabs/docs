#!/usr/bin/env node
/**
 * External Links Checker
 * 
 * Validates that all external links in documentation are accessible.
 * Generates report of broken links for fixing.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const https = require('https');
const http = require('http');

// Rate limiting to avoid being blocked
const DELAY_MS = 500;
const TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;

// Cache to avoid checking same URL multiple times
const urlCache = new Map();

// URLs to skip (known dynamic or auth-required)
const SKIP_PATTERNS = [
  /localhost/,
  /127\.0\.0\.1/,
  /192\.168\./,
  /example\.com/,
  /your-domain/,
  /\$\{/,
  /mailto:/,
  /tel:/
];

function extractLinks(content) {
  const links = [];
  
  // Markdown links: [text](url)
  const mdLinks = content.matchAll(/\[([^\]]*)\]\(([^)]+)\)/g);
  for (const match of mdLinks) {
    const url = match[2].split(' ')[0].trim();
    if (url.startsWith('http')) {
      links.push({ url, type: 'markdown', context: match[0] });
    }
  }
  
  // HTML href attributes
  const htmlLinks = content.matchAll(/href=["']([^"']+)["']/g);
  for (const match of htmlLinks) {
    const url = match[1];
    if (url.startsWith('http')) {
      links.push({ url, type: 'html', context: match[0] });
    }
  }
  
  // Bare URLs
  const bareLinks = content.matchAll(/(?<![(\[])https?:\/\/[^\s"'<>)\]]+/g);
  for (const match of bareLinks) {
    links.push({ url: match[0], type: 'bare', context: match[0] });
  }
  
  return links;
}

function shouldSkip(url) {
  return SKIP_PATTERNS.some(pattern => pattern.test(url));
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkUrl(url, retries = 0) {
  // Check cache
  if (urlCache.has(url)) {
    return urlCache.get(url);
  }
  
  if (shouldSkip(url)) {
    const result = { status: 'skipped', code: null, reason: 'Matches skip pattern' };
    urlCache.set(url, result);
    return result;
  }
  
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.request(url, {
      method: 'HEAD',
      timeout: TIMEOUT_MS,
      headers: {
        'User-Agent': 'kombify-docs-link-checker/1.0',
        'Accept': '*/*'
      }
    }, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const result = { status: 'redirect', code: res.statusCode, location: res.headers.location };
        urlCache.set(url, result);
        resolve(result);
        return;
      }
      
      const result = {
        status: res.statusCode >= 200 && res.statusCode < 400 ? 'ok' : 'error',
        code: res.statusCode
      };
      urlCache.set(url, result);
      resolve(result);
    });
    
    req.on('error', async (error) => {
      if (retries < MAX_RETRIES) {
        await sleep(DELAY_MS * 2);
        resolve(await checkUrl(url, retries + 1));
      } else {
        const result = { status: 'error', code: null, reason: error.message };
        urlCache.set(url, result);
        resolve(result);
      }
    });
    
    req.on('timeout', async () => {
      req.destroy();
      if (retries < MAX_RETRIES) {
        await sleep(DELAY_MS * 2);
        resolve(await checkUrl(url, retries + 1));
      } else {
        const result = { status: 'error', code: null, reason: 'Timeout' };
        urlCache.set(url, result);
        resolve(result);
      }
    });
    
    req.end();
  });
}

async function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const links = extractLinks(content);
  const results = [];
  
  for (const link of links) {
    await sleep(DELAY_MS);
    const result = await checkUrl(link.url);
    results.push({
      ...link,
      ...result
    });
  }
  
  return {
    file: path.relative(process.cwd(), filePath),
    links: results
  };
}

async function main() {
  const mdxFiles = glob.sync('**/*.mdx', {
    ignore: ['node_modules/**', '_templates/**', 'internal-notes/**']
  });

  console.log('🔗 External Links Checker\n');
  console.log('='.repeat(80));
  console.log(`\nChecking ${mdxFiles.length} files...\n`);
  
  const allResults = [];
  const brokenLinks = [];
  let totalLinks = 0;
  let checkedLinks = 0;
  let skippedLinks = 0;
  
  for (let i = 0; i < mdxFiles.length; i++) {
    const file = mdxFiles[i];
    process.stdout.write(`\r[${i + 1}/${mdxFiles.length}] Checking ${file}...`.padEnd(80));
    
    const result = await analyzeFile(file);
    allResults.push(result);
    
    for (const link of result.links) {
      totalLinks++;
      
      if (link.status === 'skipped') {
        skippedLinks++;
      } else {
        checkedLinks++;
        
        if (link.status === 'error') {
          brokenLinks.push({
            file: result.file,
            url: link.url,
            code: link.code,
            reason: link.reason
          });
        }
      }
    }
  }
  
  console.log('\n\n' + '='.repeat(80));
  console.log('\n📊 Results:\n');
  console.log(`   Total links found: ${totalLinks}`);
  console.log(`   Links checked: ${checkedLinks}`);
  console.log(`   Links skipped: ${skippedLinks}`);
  console.log(`   Broken links: ${brokenLinks.length}`);
  
  if (brokenLinks.length > 0) {
    console.log('\n❌ Broken Links:\n');
    
    // Group by file
    const groupedByFile = {};
    for (const link of brokenLinks) {
      if (!groupedByFile[link.file]) {
        groupedByFile[link.file] = [];
      }
      groupedByFile[link.file].push(link);
    }
    
    for (const [file, links] of Object.entries(groupedByFile)) {
      console.log(`\n📄 ${file}`);
      for (const link of links) {
        const status = link.code ? `HTTP ${link.code}` : link.reason;
        console.log(`   ❌ ${link.url}`);
        console.log(`      Status: ${status}`);
      }
    }
  }
  
  // Generate report
  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportContent = `# Broken Links Report

Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
|--------|-------|
| Total Links | ${totalLinks} |
| Checked | ${checkedLinks} |
| Skipped | ${skippedLinks} |
| Broken | ${brokenLinks.length} |

## Broken Links

${brokenLinks.length === 0 ? '✅ No broken links found!' : brokenLinks.map(link => `
### ${link.file}
- **URL**: ${link.url}
- **Status**: ${link.code || link.reason}
`).join('\n')}

## Action Required

${brokenLinks.length > 0 ? `
Please fix the ${brokenLinks.length} broken link(s) listed above. Common fixes:
1. Update outdated URLs to current versions
2. Remove links to deprecated resources
3. Replace with archived versions (archive.org)
4. Add internal alternatives
` : 'No action required - all links are working!'}
`;

  fs.writeFileSync(path.join(reportDir, 'broken-links.md'), reportContent);
  
  console.log('\n📝 Report saved to reports/broken-links.md');
  
  // Exit with error if broken links found
  if (brokenLinks.length > 0) {
    process.exit(1);
  }
}

main().catch(console.error);
