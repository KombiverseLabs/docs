#!/usr/bin/env node
/**
 * Screenshot Annotator
 * 
 * Adds annotations (arrows, highlights, labels) to screenshots
 * for better documentation clarity.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SCREENSHOT_DIR = 'images/screenshots';
const ANNOTATIONS_CONFIG = 'scripts/screenshots/annotations.json';

/**
 * Annotation definitions
 * Each screenshot can have multiple annotations:
 * - arrows: Draw arrows pointing to elements
 * - highlights: Draw rectangles around areas
 * - labels: Add text labels
 * - blur: Blur sensitive areas
 */
const DEFAULT_ANNOTATIONS = {
  'sphere-dashboard': {
    annotations: [
      {
        type: 'highlight',
        x: 20,
        y: 80,
        width: 200,
        height: 400,
        color: '#4ade80',
        label: 'Navigation',
        labelPosition: 'right'
      },
      {
        type: 'arrow',
        from: { x: 300, y: 100 },
        to: { x: 500, y: 100 },
        color: '#6366F1',
        label: 'Quick Actions'
      }
    ]
  },
  'stack-nodes-list': {
    annotations: [
      {
        type: 'highlight',
        x: 50,
        y: 150,
        width: 700,
        height: 50,
        color: '#22c55e',
        label: 'Node Status'
      }
    ]
  }
};

/**
 * Generate ImageMagick command for annotations
 */
function generateAnnotationCommand(imagePath, outputPath, annotations) {
  const commands = [];
  
  for (const ann of annotations) {
    switch (ann.type) {
      case 'highlight':
        commands.push(
          `-strokewidth 3`,
          `-stroke "${ann.color}"`,
          `-fill "none"`,
          `-draw "rectangle ${ann.x},${ann.y} ${ann.x + ann.width},${ann.y + ann.height}"`
        );
        if (ann.label) {
          const labelX = ann.labelPosition === 'right' 
            ? ann.x + ann.width + 10 
            : ann.x;
          const labelY = ann.y + ann.height / 2;
          commands.push(
            `-fill "${ann.color}"`,
            `-pointsize 16`,
            `-font "Arial"`,
            `-draw "text ${labelX},${labelY} '${ann.label}'"`
          );
        }
        break;
        
      case 'arrow':
        // Draw arrow line
        commands.push(
          `-strokewidth 3`,
          `-stroke "${ann.color}"`,
          `-draw "line ${ann.from.x},${ann.from.y} ${ann.to.x},${ann.to.y}"`
        );
        // Draw arrowhead
        const angle = Math.atan2(ann.to.y - ann.from.y, ann.to.x - ann.from.x);
        const headLength = 15;
        const head1x = ann.to.x - headLength * Math.cos(angle - Math.PI / 6);
        const head1y = ann.to.y - headLength * Math.sin(angle - Math.PI / 6);
        const head2x = ann.to.x - headLength * Math.cos(angle + Math.PI / 6);
        const head2y = ann.to.y - headLength * Math.sin(angle + Math.PI / 6);
        commands.push(
          `-draw "line ${ann.to.x},${ann.to.y} ${head1x},${head1y}"`,
          `-draw "line ${ann.to.x},${ann.to.y} ${head2x},${head2y}"`
        );
        if (ann.label) {
          const midX = (ann.from.x + ann.to.x) / 2;
          const midY = (ann.from.y + ann.to.y) / 2 - 10;
          commands.push(
            `-fill "${ann.color}"`,
            `-pointsize 14`,
            `-draw "text ${midX},${midY} '${ann.label}'"`
          );
        }
        break;
        
      case 'blur':
        commands.push(
          `-region "${ann.width}x${ann.height}+${ann.x}+${ann.y}"`,
          `-blur 0x20`,
          `+region`
        );
        break;
        
      case 'number':
        // Draw numbered circle
        commands.push(
          `-fill "${ann.color || '#6366F1'}"`,
          `-draw "circle ${ann.x},${ann.y} ${ann.x + 15},${ann.y}"`,
          `-fill "white"`,
          `-pointsize 16`,
          `-gravity Center`,
          `-draw "text ${ann.x - 5},${ann.y + 5} '${ann.number}'"`
        );
        break;
    }
  }
  
  return `convert "${imagePath}" ${commands.join(' ')} "${outputPath}"`;
}

/**
 * Check if ImageMagick is installed
 */
function checkImageMagick() {
  try {
    execSync('convert --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function main() {
  console.log('🎨 Screenshot Annotator\n');
  console.log('='.repeat(80));
  
  if (!checkImageMagick()) {
    console.log('\n⚠️ ImageMagick not installed. Skipping annotation.');
    console.log('   Install with: sudo apt-get install imagemagick');
    console.log('   Or on macOS: brew install imagemagick');
    
    // Still save the annotation config for later
    const configDir = path.dirname(ANNOTATIONS_CONFIG);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(ANNOTATIONS_CONFIG, JSON.stringify(DEFAULT_ANNOTATIONS, null, 2));
    console.log(`\n📝 Saved annotation config to ${ANNOTATIONS_CONFIG}`);
    return;
  }
  
  // Load or use default annotations
  let annotations = DEFAULT_ANNOTATIONS;
  if (fs.existsSync(ANNOTATIONS_CONFIG)) {
    try {
      annotations = JSON.parse(fs.readFileSync(ANNOTATIONS_CONFIG, 'utf-8'));
    } catch (e) {
      console.log('⚠️ Could not parse annotations config, using defaults');
    }
  }
  
  // Create annotated directory
  const annotatedDir = path.join(SCREENSHOT_DIR, 'annotated');
  if (!fs.existsSync(annotatedDir)) {
    fs.mkdirSync(annotatedDir, { recursive: true });
  }
  
  let annotated = 0;
  let skipped = 0;
  
  console.log('\n📸 Annotating screenshots:\n');
  
  for (const [imageName, config] of Object.entries(annotations)) {
    const inputPath = path.join(SCREENSHOT_DIR, `${imageName}.png`);
    const outputPath = path.join(annotatedDir, `${imageName}-annotated.png`);
    
    if (!fs.existsSync(inputPath)) {
      console.log(`   ⏭️  Skipped ${imageName} (source not found)`);
      skipped++;
      continue;
    }
    
    try {
      const command = generateAnnotationCommand(inputPath, outputPath, config.annotations);
      execSync(command, { stdio: 'pipe' });
      console.log(`   ✅ Annotated ${imageName}`);
      annotated++;
    } catch (error) {
      console.log(`   ❌ Failed ${imageName}: ${error.message}`);
      skipped++;
    }
  }
  
  // Save updated config
  fs.writeFileSync(ANNOTATIONS_CONFIG, JSON.stringify(annotations, null, 2));
  
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Summary:\n');
  console.log(`   Annotated: ${annotated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Output: ${annotatedDir}/`);
}

main();
