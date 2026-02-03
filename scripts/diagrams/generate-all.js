#!/usr/bin/env node
/**
 * Diagram Generator
 * 
 * Generates architecture and flow diagrams from definition files.
 * Supports D2 and Mermaid formats, outputs SVG and PNG.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const glob = require('glob');

const DIAGRAMS_SOURCE_DIR = 'scripts/diagrams/sources';
const DIAGRAMS_OUTPUT_DIR = 'images/diagrams';

// Diagram definitions - can be extended
const ARCHITECTURE_DIAGRAMS = {
  'kombify-ecosystem': {
    title: 'kombify Ecosystem',
    type: 'd2',
    source: `
direction: right

title: kombify Ecosystem {
  near: top-center
  shape: text
  style.font-size: 24
}

user: User {
  shape: person
  style.fill: "#6366F1"
}

sphere: kombify Sphere {
  shape: rectangle
  style.fill: "#1e293b"
  style.stroke: "#4ade80"
  
  dashboard: Dashboard
  auth: SSO/Auth
  billing: Billing
}

stack: kombify Stack {
  shape: rectangle
  style.fill: "#1e293b"
  style.stroke: "#4ade80"
  
  unifier: Unifier Engine
  agents: Node Agents
  tofu: OpenTofu
}

sim: kombify Sim {
  shape: rectangle
  style.fill: "#1e293b"
  style.stroke: "#4ade80"
  
  vm: VM Engine
  container: Container Engine
  api: REST API
}

stackkits: StackKits Registry {
  shape: cylinder
  style.fill: "#334155"
}

infrastructure: Your Infrastructure {
  shape: cloud
  style.fill: "#0f172a"
  style.stroke: "#f59e0b"
  
  nodes: Physical Nodes
  vms: Virtual Machines
  containers: Containers
}

user -> sphere.dashboard: Uses
sphere.dashboard -> stack.unifier: Deploys via
sphere.dashboard -> sim.api: Tests via
stack.unifier -> stackkits: Loads
stack.agents -> infrastructure.nodes: Manages
sim.vm -> infrastructure.vms: Simulates
sim.container -> infrastructure.containers: Creates
`
  },
  
  'stack-architecture': {
    title: 'kombify Stack Architecture',
    type: 'd2',
    source: `
direction: down

core: Core {
  shape: rectangle
  style.fill: "#1e293b"
  style.stroke: "#6366F1"
  
  api: REST API {
    style.fill: "#334155"
  }
  grpc: gRPC Server {
    style.fill: "#334155"
  }
  unifier: Unifier Engine {
    style.fill: "#4ade80"
    style.stroke: "#22c55e"
  }
  jobs: Job Queue {
    style.fill: "#334155"
  }
}

database: PocketBase {
  shape: cylinder
  style.fill: "#334155"
}

agents: Node Agents {
  shape: hexagon
  style.fill: "#f59e0b"
  
  agent1: Agent 1
  agent2: Agent 2
  agentN: Agent N
}

tofu: OpenTofu {
  shape: rectangle
  style.fill: "#7c3aed"
  
  plan: Plan
  apply: Apply
  state: State
}

nodes: Infrastructure {
  shape: cloud
  style.fill: "#0f172a"
}

core.api -> core.unifier
core.grpc -> agents
core.unifier -> core.jobs
core.jobs -> tofu.plan
tofu.apply -> nodes
agents -> nodes: SSH/Agent
core -> database: Stores state
`
  },
  
  'deployment-flow': {
    title: 'Deployment Flow',
    type: 'd2',
    source: `
direction: right

spec: kombination.yaml {
  shape: document
  style.fill: "#6366F1"
}

validate: Validate {
  shape: diamond
  style.fill: "#f59e0b"
}

stackkit: Load StackKit {
  shape: rectangle
  style.fill: "#334155"
}

unify: Unify & Resolve {
  shape: rectangle
  style.fill: "#4ade80"
}

plan: Generate Plan {
  shape: rectangle
  style.fill: "#334155"
}

review: Review {
  shape: diamond
  style.fill: "#f59e0b"
}

apply: Apply {
  shape: rectangle
  style.fill: "#22c55e"
}

monitor: Monitor {
  shape: rectangle
  style.fill: "#334155"
}

success: Success {
  shape: circle
  style.fill: "#22c55e"
}

spec -> validate
validate -> stackkit: Valid
validate -> spec: Invalid {
  style.stroke: "#ef4444"
}
stackkit -> unify
unify -> plan
plan -> review
review -> apply: Approved
review -> plan: Changes needed
apply -> monitor
monitor -> success
`
  },
  
  'simulation-flow': {
    title: 'Simulation Flow',
    type: 'd2',
    source: `
direction: down

config: Test Configuration {
  shape: document
  style.fill: "#6366F1"
}

sim: kombify Sim {
  shape: rectangle
  style.fill: "#1e293b"
  style.stroke: "#4ade80"
  
  api: API
  engine: Engine
  
  api -> engine
}

backends: Simulation Backends {
  shape: rectangle
  style.fill: "#334155"
  
  docker: Docker {
    shape: hexagon
    style.fill: "#2563eb"
  }
  qemu: QEMU {
    shape: hexagon
    style.fill: "#7c3aed"
  }
  external: External {
    shape: hexagon
    style.fill: "#f59e0b"
  }
}

nodes: Virtual Nodes {
  shape: cloud
  style.fill: "#0f172a"
  
  node1: Node 1
  node2: Node 2
}

test: Run Tests {
  shape: rectangle
  style.fill: "#334155"
}

report: Test Report {
  shape: document
  style.fill: "#22c55e"
}

config -> sim.api
sim.engine -> backends.docker
sim.engine -> backends.qemu
sim.engine -> backends.external
backends -> nodes
nodes -> test
test -> report
`
  }
};

function ensureDirectories() {
  const dirs = [DIAGRAMS_SOURCE_DIR, DIAGRAMS_OUTPUT_DIR];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

function checkD2Installed() {
  try {
    execSync('d2 --version', { stdio: 'pipe' });
    return true;
  } catch {
    console.log('⚠️ D2 not installed. Install with: curl -fsSL https://d2lang.com/install.sh | sh -s --');
    return false;
  }
}

function generateD2Diagram(name, config) {
  const sourcePath = path.join(DIAGRAMS_SOURCE_DIR, `${name}.d2`);
  const svgPath = path.join(DIAGRAMS_OUTPUT_DIR, `${name}.svg`);
  const pngPath = path.join(DIAGRAMS_OUTPUT_DIR, `${name}.png`);
  
  // Write source file
  fs.writeFileSync(sourcePath, config.source);
  
  // Generate SVG
  try {
    execSync(`d2 --theme 200 --dark-theme 200 "${sourcePath}" "${svgPath}"`, {
      stdio: 'pipe'
    });
    console.log(`   ✅ Generated ${svgPath}`);
    
    // Generate PNG for fallback
    execSync(`d2 --theme 200 --dark-theme 200 "${sourcePath}" "${pngPath}"`, {
      stdio: 'pipe'
    });
    console.log(`   ✅ Generated ${pngPath}`);
    
    return true;
  } catch (error) {
    console.log(`   ❌ Failed to generate ${name}: ${error.message}`);
    return false;
  }
}

function generateMermaidDiagram(name, config) {
  const sourcePath = path.join(DIAGRAMS_SOURCE_DIR, `${name}.mmd`);
  
  // Write source file for reference
  fs.writeFileSync(sourcePath, config.source);
  
  // Mermaid diagrams are typically rendered client-side in Mintlify
  // We just prepare the source file
  console.log(`   📝 Saved Mermaid source: ${sourcePath}`);
  console.log(`   ℹ️  Mermaid diagrams are rendered client-side in documentation`);
  
  return true;
}

function main() {
  console.log('🎨 Diagram Generator\n');
  console.log('='.repeat(80));
  
  ensureDirectories();
  
  const hasD2 = checkD2Installed();
  
  let generated = 0;
  let failed = 0;
  
  console.log('\n📊 Generating Architecture Diagrams:\n');
  
  for (const [name, config] of Object.entries(ARCHITECTURE_DIAGRAMS)) {
    console.log(`\n🔄 ${config.title} (${name})`);
    
    let success = false;
    
    if (config.type === 'd2') {
      if (hasD2) {
        success = generateD2Diagram(name, config);
      } else {
        // Write source for later generation
        const sourcePath = path.join(DIAGRAMS_SOURCE_DIR, `${name}.d2`);
        fs.writeFileSync(sourcePath, config.source);
        console.log(`   📝 Saved D2 source: ${sourcePath}`);
        success = true;
      }
    } else if (config.type === 'mermaid') {
      success = generateMermaidDiagram(name, config);
    }
    
    if (success) generated++;
    else failed++;
  }
  
  // Generate index file for diagrams
  const indexContent = `# Generated Diagrams

This directory contains automatically generated diagrams for kombify documentation.

## Available Diagrams

${Object.entries(ARCHITECTURE_DIAGRAMS).map(([name, config]) => `
### ${config.title}
- Source: \`scripts/diagrams/sources/${name}.${config.type === 'd2' ? 'd2' : 'mmd'}\`
- SVG: \`images/diagrams/${name}.svg\`
- PNG: \`images/diagrams/${name}.png\`
`).join('\n')}

## Regenerating Diagrams

Run:
\`\`\`bash
node scripts/diagrams/generate-all.js
\`\`\`

## Adding New Diagrams

Edit \`scripts/diagrams/generate-all.js\` and add new entries to \`ARCHITECTURE_DIAGRAMS\`.
`;

  fs.writeFileSync(path.join(DIAGRAMS_OUTPUT_DIR, 'README.md'), indexContent);
  
  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Summary:\n');
  console.log(`   Generated: ${generated}`);
  console.log(`   Failed: ${failed}`);
  
  if (!hasD2) {
    console.log('\n⚠️ D2 not installed - only source files were saved.');
    console.log('   Install D2 and run again to generate images.');
  }
}

main();
