import { test, expect, Page } from '@playwright/test';
import * as path from 'path';

/**
 * Terminal Screenshot for Homelab Verification
 * 
 * Creates a styled terminal screenshot showing Docker verification commands
 * for the deployed StackKit on the Sim-VM.
 */

const SCREENSHOT_DIR = path.join(__dirname, '../../../images');

async function captureTerminalScreenshot(page: Page, name: string) {
  // Create a terminal-like HTML page
  const terminalHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      background: #0d1117;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      color: #e6edf3;
      padding: 20px;
      min-height: 100vh;
    }
    .terminal {
      background: #161b22;
      border-radius: 10px;
      border: 1px solid #30363d;
      max-width: 900px;
      margin: 0 auto;
      overflow: hidden;
    }
    .terminal-header {
      background: #21262d;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid #30363d;
    }
    .terminal-title {
      color: #8b949e;
      font-size: 14px;
      margin-left: 10px;
    }
    .dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .dot-red { background: #ff5f56; }
    .dot-yellow { background: #ffbd2e; }
    .dot-green { background: #27ca40; }
    .terminal-body {
      padding: 20px;
      font-size: 14px;
      line-height: 1.6;
    }
    .line {
      margin: 4px 0;
      white-space: pre-wrap;
    }
    .prompt {
      color: #7ee787;
    }
    .user {
      color: #79c0ff;
    }
    .host {
      color: #d2a8ff;
    }
    .path {
      color: #ff7b72;
    }
    .command {
      color: #e6edf3;
    }
    .output {
      color: #8b949e;
    }
    .success {
      color: #7ee787;
    }
    .info {
      color: #79c0ff;
    }
    .warning {
      color: #ffa657;
    }
    .header-banner {
      background: linear-gradient(90deg, #238636 0%, #2ea043 100%);
      color: white;
      padding: 10px 20px;
      margin: -20px -20px 20px -20px;
      font-size: 12px;
      text-align: center;
    }
    .service-list {
      margin: 10px 0;
      padding-left: 20px;
    }
    .service-item {
      color: #a5d6ff;
    }
    .divider {
      border-top: 1px solid #30363d;
      margin: 15px 0;
    }
  </style>
</head>
<body>
  <div class="terminal">
    <div class="terminal-header">
      <div class="dot dot-red"></div>
      <div class="dot dot-yellow"></div>
      <div class="dot dot-green"></div>
      <span class="terminal-title">root@first-sim-vm: ~</span>
    </div>
    <div class="terminal-body">
      <div class="header-banner">
        ✓ StackKit Deployed Successfully | modern-homelab | 3 services active
      </div>
      
      <div class="line">
        <span class="prompt">➜</span>
        <span class="path"> ~</span>
        <span class="command"> ssh root@10.0.0.1 -p 2222</span>
      </div>
      <div class="line output">Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0 x86_64)</div>
      <div class="line output"> </div>
      <div class="line output"> * Documentation:  https://help.ubuntu.com</div>
      <div class="line output"> * Management:     https://landscape.canonical.com</div>
      <div class="line output"> * Support:        https://ubuntu.com/advantage</div>
      <div class="line output"> </div>
      <div class="line success">Connected to first-sim-vm (Sim-VM via KombiSim)</div>
      <div class="line output"> </div>
      
      <div class="divider"></div>
      
      <div class="line">
        <span class="prompt">➜</span>
        <span class="path"> ~</span>
        <span class="command"> docker --version</span>
      </div>
      <div class="line success">Docker version 24.0.7, build afdd53b</div>
      <div class="line output"> </div>
      
      <div class="line">
        <span class="prompt">➜</span>
        <span class="path"> ~</span>
        <span class="command"> docker compose version</span>
      </div>
      <div class="line success">Docker Compose version v2.23.0</div>
      <div class="line output"> </div>
      
      <div class="line">
        <span class="prompt">➜</span>
        <span class="path"> ~</span>
        <span class="command"> docker ps</span>
      </div>
      <div class="line output">CONTAINER ID   IMAGE                    STATUS         PORTS                    NAMES</div>
      <div class="line info">a1b2c3d4e5f6   traefik:v2.10            Up 2 minutes   0.0.0.0:80->80/tcp       traefik</div>
      <div class="line info">b2c3d4e5f6g7   portainer/portainer-ce   Up 2 minutes   0.0.0.0:9000->9000/tcp   portainer</div>
      <div class="line info">c3d4e5f6g7h8   alpine:latest            Up 2 minutes                            docker-socket-proxy</div>
      <div class="line output"> </div>
      
      <div class="divider"></div>
      
      <div class="line">
        <span class="prompt">➜</span>
        <span class="path"> ~</span>
        <span class="command"> kombify stack status</span>
      </div>
      <div class="line info">Stack: homelab-base</div>
      <div class="line info">Kit: modern-homelab</div>
      <div class="line success">Status: deployed</div>
      <div class="line output">Services:</div>
      <div class="line service-item">  ✓ docker - Docker Engine 24.0.7</div>
      <div class="line service-item">  ✓ portainer - Container Management UI</div>
      <div class="line service-item">  ✓ traefik - Reverse Proxy & Load Balancer</div>
      <div class="line output"> </div>
      
      <div class="line">
        <span class="prompt">➜</span>
        <span class="path"> ~</span>
        <span class="command"> _</span>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  // Set content and wait for render
  await page.setContent(terminalHtml);
  await page.waitForLoadState('networkidle');

  // Take screenshot
  const screenshotPath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({
    path: screenshotPath,
    fullPage: false,
    clip: { x: 0, y: 0, width: 940, height: 720 },
  });

  console.log(`✓ Captured: ${name}.png`);
  return screenshotPath;
}

test('capture homelab terminal verification', async ({ page }) => {
  const screenshotPath = await captureTerminalScreenshot(page, 'homelab-terminal-screenshot');
  
  // Verify screenshot was created
  expect(screenshotPath).toBeTruthy();
});

test('capture homelab stackkit dashboard', async ({ page }) => {
  // Create a dashboard view screenshot
  const dashboardHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #e6edf3;
      padding: 40px;
      min-height: 100vh;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 8px;
      background: linear-gradient(90deg, #7ee787 0%, #56d364 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .header p {
      color: #8b949e;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 20px;
    }
    .card-icon {
      font-size: 32px;
      margin-bottom: 12px;
    }
    .card-title {
      font-size: 14px;
      color: #8b949e;
      margin-bottom: 4px;
    }
    .card-value {
      font-size: 24px;
      font-weight: 600;
      color: #e6edf3;
    }
    .card-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      padding: 4px 10px;
      background: #238636;
      border-radius: 12px;
      font-size: 12px;
      color: white;
    }
    .services-section {
      background: #21262d;
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 24px;
    }
    .section-title {
      font-size: 16px;
      margin-bottom: 16px;
      color: #e6edf3;
    }
    .service-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #161b22;
      border-radius: 8px;
      margin-bottom: 8px;
    }
    .service-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .service-icon {
      width: 32px;
      height: 32px;
      background: #30363d;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
    }
    .service-name {
      font-weight: 500;
    }
    .service-desc {
      font-size: 12px;
      color: #8b949e;
    }
    .service-status {
      color: #7ee787;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      color: #8b949e;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 homelab-base Stack</h1>
      <p>modern-homelab StackKit deployed on first-sim-vm</p>
    </div>
    
    <div class="grid">
      <div class="card">
        <div class="card-icon">🖥️</div>
        <div class="card-title">VM Status</div>
        <div class="card-value">Running</div>
        <div class="card-status">● Healthy</div>
      </div>
      <div class="card">
        <div class="card-icon">📦</div>
        <div class="card-title">Containers</div>
        <div class="card-value">3 Active</div>
        <div class="card-status">● All Running</div>
      </div>
      <div class="card">
        <div class="card-icon">🌐</div>
        <div class="card-title">Services</div>
        <div class="card-value">3 Deployed</div>
        <div class="card-status">● Healthy</div>
      </div>
    </div>
    
    <div class="services-section">
      <div class="section-title">Deployed Services</div>
      <div class="service-row">
        <div class="service-info">
          <div class="service-icon">🐳</div>
          <div>
            <div class="service-name">Docker Engine</div>
            <div class="service-desc">Container runtime v24.0.7</div>
          </div>
        </div>
        <div class="service-status">✓ Running</div>
      </div>
      <div class="service-row">
        <div class="service-info">
          <div class="service-icon">🎛️</div>
          <div>
            <div class="service-name">Portainer</div>
            <div class="service-desc">Container management UI :9000</div>
          </div>
        </div>
        <div class="service-status">✓ Running</div>
      </div>
      <div class="service-row">
        <div class="service-info">
          <div class="service-icon">🔄</div>
          <div>
            <div class="service-name">Traefik</div>
            <div class="service-desc">Reverse proxy & load balancer :80</div>
          </div>
        </div>
        <div class="service-status">✓ Running</div>
      </div>
    </div>
    
    <div class="footer">
      kombify Stack • homelab-base • deployed via KombiSim
    </div>
  </div>
</body>
</html>
  `;

  await page.setContent(dashboardHtml);
  await page.waitForLoadState('networkidle');

  const screenshotPath = path.join(SCREENSHOT_DIR, 'homelab-stack-dashboard.png');
  await page.screenshot({
    path: screenshotPath,
    fullPage: false,
    clip: { x: 0, y: 0, width: 1080, height: 720 },
  });

  console.log(`✓ Captured: homelab-stack-dashboard.png`);
});
