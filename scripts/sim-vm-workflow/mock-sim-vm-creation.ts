/**
 * Mock Sim-VM Creation and StackKit Deployment Workflow
 *
 * This script simulates the KombiSim API workflow since the actual service
 * uses a mock engine (Docker not available in Azure Container Apps).
 *
 * All responses are simulated to demonstrate the complete workflow.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SimNode {
  id: string;
  name: string;
  template: string;
  status: 'creating' | 'running' | 'stopped' | 'error';
  resources: {
    cpu: number;
    memory: string;
    disk: string;
  };
  network: {
    ip: string;
    sshPort: number;
  };
  createdAt: string;
  services: string[];
}

interface StackDeployment {
  id: string;
  name: string;
  target: string;
  kit: string;
  status: 'pending' | 'deploying' | 'completed' | 'failed';
  config: Record<string, any>;
  progress: number;
  startedAt: string;
  completedAt?: string;
  services: string[];
}

// ============================================================================
// MOCK DATABASE
// ============================================================================

const mockNodes: Map<string, SimNode> = new Map();
const mockStacks: Map<string, StackDeployment> = new Map();

// ============================================================================
// MOCK API FUNCTIONS
// ============================================================================

function createSimNode(name: string, template: string, resources: { cpu: number; memory: string; disk: string }): SimNode {
  const node: SimNode = {
    id: `node_${Math.random().toString(36).substr(2, 9)}`,
    name,
    template,
    status: 'creating',
    resources,
    network: {
      ip: `10.0.0.${Math.floor(Math.random() * 254) + 1}`,
      sshPort: 2222 + mockNodes.size,
    },
    createdAt: new Date().toISOString(),
    services: [],
  };

  mockNodes.set(name, node);

  // Simulate creation delay
  setTimeout(() => {
    node.status = 'running';
    console.log(`✅ Node "${name}" is now running`);
  }, 2000);

  return node;
}

function getNode(name: string): SimNode | undefined {
  return mockNodes.get(name);
}

function createStackDeployment(
  name: string,
  target: string,
  kit: string,
  config: Record<string, any>
): StackDeployment {
  const stack: StackDeployment = {
    id: `stack_${Math.random().toString(36).substr(2, 9)}`,
    name,
    target,
    kit,
    status: 'pending',
    config,
    progress: 0,
    startedAt: new Date().toISOString(),
    services: [],
  };

  mockStacks.set(name, stack);

  // Simulate deployment progress
  simulateDeployment(stack);

  return stack;
}

async function simulateDeployment(stack: StackDeployment): Promise<void> {
  const services = ['docker', 'portainer', 'traefik'];
  
  stack.status = 'deploying';
  
  for (let i = 0; i <= services.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    stack.progress = Math.round((i / services.length) * 100);
    
    if (i < services.length) {
      stack.services.push(services[i]);
      console.log(`  📦 Deployed ${services[i]}... (${stack.progress}%)`);
    }
  }

  stack.status = 'completed';
  stack.completedAt = new Date().toISOString();
  stack.progress = 100;
  
  // Update node services
  const node = mockNodes.get(stack.target);
  if (node) {
    node.services = [...stack.services];
  }

  console.log(`✅ Stack "${stack.name}" deployment completed`);
}

function getStack(name: string): StackDeployment | undefined {
  return mockStacks.get(name);
}

// ============================================================================
// WORKFLOW EXECUTION
// ============================================================================

async function runWorkflow(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║     KombiSim Mock VM + StackKit Deployment Workflow              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  // -------------------------------------------------------------------------
  // PART 1: Create First Simulated VM
  // -------------------------------------------------------------------------
  console.log('📌 PART 1: Creating First Sim-VM via KombiSim API\n');
  
  const vmConfig = {
    name: 'first-sim-vm',
    template: 'ubuntu-22.04',
    resources: {
      cpu: 2,
      memory: '4Gi',
      disk: '20Gi',
    },
  };

  console.log('POST https://api.kombify.io/v1/simulations/nodes');
  console.log('Request Body:', JSON.stringify(vmConfig, null, 2));
  console.log('\n⏳ Creating simulated VM...\n');

  const node = createSimNode(vmConfig.name, vmConfig.template, vmConfig.resources);

  console.log('Response:', JSON.stringify({
    id: node.id,
    name: node.name,
    status: node.status,
    resources: node.resources,
    network: node.network,
  }, null, 2));

  // Wait for VM to be ready
  await new Promise(resolve => setTimeout(resolve, 2500));

  // Verify via API
  console.log('\n📌 PART 2: Verifying VM Status\n');
  
  const verifiedNode = getNode('first-sim-vm');
  console.log('GET /v1/simulations/nodes/first-sim-vm');
  console.log('Response:', JSON.stringify(verifiedNode, null, 2));

  console.log('\nGET /v1/simulations/nodes/first-sim-vm/status');
  console.log('Response:', JSON.stringify({ status: verifiedNode?.status }, null, 2));

  // -------------------------------------------------------------------------
  // PART 3: Apply Base Homelab StackKit
  // -------------------------------------------------------------------------
  console.log('\n📌 PART 3: Applying modern-homelab StackKit\n');

  const stackConfig = {
    name: 'homelab-base',
    target: 'first-sim-vm',
    kit: 'modern-homelab',
    config: {
      domain: 'homelab.local',
      enable_portainer: true,
      enable_traefik: true,
    },
  };

  console.log('POST https://api.kombify.io/v1/stacks');
  console.log('Request Body:', JSON.stringify(stackConfig, null, 2));
  console.log('\n⏳ Deploying StackKit...\n');

  const stack = createStackDeployment(
    stackConfig.name,
    stackConfig.target,
    stackConfig.kit,
    stackConfig.config
  );

  // Wait for deployment to complete
  while (stack.status !== 'completed') {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\nGET /v1/stacks/homelab-base/status');
  console.log('Response:', JSON.stringify({
    id: stack.id,
    name: stack.name,
    status: stack.status,
    progress: stack.progress,
    services: stack.services,
  }, null, 2));

  // -------------------------------------------------------------------------
  // PART 4: Generate Verification Report
  // -------------------------------------------------------------------------
  console.log('\n📌 PART 4: Verification Report\n');

  const report = {
    timestamp: new Date().toISOString(),
    environment: 'Mock Engine (Azure Container Apps)',
    note: 'KombiSim uses mock engine - Docker not available in ACA',
    vm: {
      id: verifiedNode?.id,
      name: verifiedNode?.name,
      status: verifiedNode?.status,
      ip: verifiedNode?.network.ip,
      sshPort: verifiedNode?.network.sshPort,
    },
    stack: {
      id: stack.id,
      name: stack.name,
      status: stack.status,
      deployedServices: stack.services,
    },
    verificationCommands: [
      { command: 'docker --version', expected: 'Docker version 24.0.x' },
      { command: 'docker ps', expected: 'CONTAINER ID   IMAGE           STATUS' },
      { command: 'docker compose version', expected: 'Docker Compose version v2.x' },
    ],
  };

  console.log('Report:', JSON.stringify(report, null, 2));

  // Save report
  const outputDir = path.join(__dirname, '../../output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(outputDir, 'sim-vm-workflow-report.json'),
    JSON.stringify(report, null, 2)
  );

  console.log(`\n✅ Report saved to: output/sim-vm-workflow-report.json`);

  return;
}

// Run workflow
runWorkflow().catch(console.error);
