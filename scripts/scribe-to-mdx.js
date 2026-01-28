#!/usr/bin/env node

/**
 * Scribe-to-MDX Converter
 * 
 * Converts Scribe markdown exports to Mintlify-compatible MDX files.
 * 
 * Usage:
 *   node scribe-to-mdx.js <input.md> <output.mdx>
 *   node scribe-to-mdx.js internal-notes/scribe-exports/create-stack.md guides/tutorials/create-stack.mdx
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node scribe-to-mdx.js <input.md> <output.mdx>');
  console.error('Example: node scribe-to-mdx.js scribe-exports/guide.md guides/tutorial.mdx');
  process.exit(1);
}

const [inputPath, outputPath] = args;

// Resolve paths relative to docs root
const docsRoot = path.resolve(__dirname, '../..');
const inputFile = path.resolve(docsRoot, inputPath);
const outputFile = path.resolve(docsRoot, outputPath);

// Read input file
if (!fs.existsSync(inputFile)) {
  console.error(`Input file not found: ${inputFile}`);
  process.exit(1);
}

const content = fs.readFileSync(inputFile, 'utf-8');

/**
 * Convert Scribe markdown to Mintlify MDX
 */
function convertScribeToMdx(markdown, outputFilePath) {
  const lines = markdown.split('\n');
  const steps = [];
  let currentStep = null;
  let title = 'Tutorial';
  let description = '';
  
  // Parse Scribe format
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Extract title from first H1
    if (line.startsWith('# ') && !title) {
      title = line.substring(2).trim();
      continue;
    }
    
    // Extract description from first paragraph
    if (!description && line.trim() && !line.startsWith('#') && !line.startsWith('![')) {
      description = line.trim();
      continue;
    }
    
    // Detect step headers (Scribe uses "Step X:" or "## Step X" format)
    const stepMatch = line.match(/^(?:##?\s*)?(?:Step\s*)?(\d+)[\.:]\s*(.+)$/i);
    if (stepMatch) {
      if (currentStep) {
        steps.push(currentStep);
      }
      currentStep = {
        number: parseInt(stepMatch[1]),
        title: stepMatch[2].trim(),
        content: [],
        screenshot: null,
      };
      continue;
    }
    
    // Detect screenshots
    const imgMatch = line.match(/!\[([^\]]*)\]\(([^)]+)\)/);
    if (imgMatch && currentStep) {
      currentStep.screenshot = {
        alt: imgMatch[1] || `Step ${currentStep.number}`,
        src: imgMatch[2],
      };
      continue;
    }
    
    // Add content to current step
    if (currentStep && line.trim()) {
      currentStep.content.push(line);
    }
  }
  
  // Don't forget the last step
  if (currentStep) {
    steps.push(currentStep);
  }
  
  // Generate MDX output
  const outputName = path.basename(outputFilePath, '.mdx');
  const sidebarTitle = title.length > 30 ? title.substring(0, 27) + '...' : title;
  
  let mdx = `---
title: "${title}"
description: "${description}"
sidebarTitle: "${sidebarTitle}"
---

<Steps>
`;
  
  for (const step of steps) {
    mdx += `  <Step title="${step.title}">\n`;
    
    // Add screenshot if present
    if (step.screenshot) {
      // Convert Scribe URLs to local paths
      const localPath = convertScreenshotPath(step.screenshot.src, outputName, step.number);
      mdx += `    <Frame>\n`;
      mdx += `      <img src="${localPath}" alt="${step.screenshot.alt}" />\n`;
      mdx += `    </Frame>\n\n`;
    }
    
    // Add step content
    for (const line of step.content) {
      mdx += `    ${line}\n`;
    }
    
    mdx += `  </Step>\n\n`;
  }
  
  mdx += `</Steps>\n`;
  
  // Add note about source
  mdx += `\n<Note>\n`;
  mdx += `  This tutorial was generated from a Scribe recording. `;
  mdx += `  [View interactive version](https://scribehow.com/) for click-through experience.\n`;
  mdx += `</Note>\n`;
  
  return mdx;
}

/**
 * Convert Scribe screenshot URLs to local paths
 */
function convertScreenshotPath(url, tutorialName, stepNumber) {
  // If it's already a local path, use it
  if (url.startsWith('/')) {
    return url;
  }
  
  // For Scribe URLs, create a local placeholder path
  // In production, you'd download the image and save locally
  const fileName = `${tutorialName}-step-${stepNumber}.png`;
  return `/images/tutorials/${fileName}`;
}

// Convert and write output
try {
  const mdxContent = convertScribeToMdx(content, outputFile);
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputFile, mdxContent, 'utf-8');
  console.log(`✓ Converted: ${inputPath} → ${outputPath}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Review the generated MDX file`);
  console.log(`  2. Download/copy screenshots to /images/tutorials/`);
  console.log(`  3. Update image paths if needed`);
  console.log(`  4. Add page to docs.json navigation`);
} catch (error) {
  console.error(`Error converting file: ${error.message}`);
  process.exit(1);
}
