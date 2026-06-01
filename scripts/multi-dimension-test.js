const https = require('https');
const http = require('http');

const FRONTEND_URL = 'https://vantro-flow-frontend.vercel.app';
const BACKEND_URL = 'https://vantro-flow-backend-production.up.railway.app';

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

let stats = { passed: 0, failed: 0, warnings: 0 };

function logPass(msg) {
  console.log(`${colors.green}✅ PASS:${colors.reset} ${msg}`);
  stats.passed++;
}

function logFail(msg) {
  console.log(`${colors.red}❌ FAIL:${colors.reset} ${msg}`);
  stats.failed++;
}

function logWarn(msg) {
  console.log(`${colors.yellow}⚠️ WARN:${colors.reset} ${msg}`);
  stats.warnings++;
}

function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const start = Date.now();
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const ttfb = Date.now() - start;
        resolve({ res, data, ttfb });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log(`${colors.cyan}${colors.bold}\n🚀 Vantro Flow Multi-Dimensional Audit\n${colors.reset}`);

  try {
    // 1 & 6 & 7: Fetch Frontend Landing Page
    console.log(`${colors.blue}${colors.bold}--- Frontend Audit (SEO, A11y, Performance) ---${colors.reset}`);
    const fe = await fetchUrl(FRONTEND_URL);
    
    // Performance
    if (fe.ttfb < 1500) logPass(`Frontend TTFB is fast (${fe.ttfb}ms)`);
    else logWarn(`Frontend TTFB is slow (${fe.ttfb}ms)`);
    
    // SEO & Meta
    if (fe.data.includes('<title>')) logPass('Title tag present');
    else logFail('Title tag missing');
    
    if (fe.data.includes('name="description"')) logPass('Meta description present');
    else logWarn('Meta description missing');
    
    if (fe.data.includes('og:title')) logPass('Open Graph tags present');
    else logWarn('Open Graph tags missing');
    
    // Accessibility
    if (fe.data.includes('lang="en')) logPass('HTML lang attribute present');
    else logFail('HTML lang attribute missing');

    const imgTags = fe.data.match(/<img[^>]+>/g) || [];
    const missingAlt = imgTags.filter(img => !img.includes('alt='));
    if (imgTags.length > 0 && missingAlt.length === 0) logPass('All images have alt attributes');
    else if (missingAlt.length > 0) logWarn(`${missingAlt.length} images missing alt attributes`);

    // Responsive
    if (fe.data.includes('name="viewport"')) logPass('Viewport meta tag present');
    else logFail('Viewport meta tag missing');

    // Frontend Security Headers
    const feHeaders = fe.res.headers;
    if (feHeaders['x-frame-options']) logPass(`X-Frame-Options: ${feHeaders['x-frame-options']}`);
    else logFail('X-Frame-Options header missing');
    
    if (feHeaders['content-security-policy']) logPass('Content-Security-Policy present');
    else logWarn('Content-Security-Policy missing');

    // 2 & 4: Backend API Health & Security
    console.log(`${colors.blue}${colors.bold}\n--- Backend API Audit ---${colors.reset}`);
    const beHealth = await fetchUrl(`${BACKEND_URL}/api/health`, { method: 'GET' });
    
    if (beHealth.res.statusCode === 200 || beHealth.res.statusCode === 404) {
       logPass(`Backend is reachable (Status: ${beHealth.res.statusCode}, TTFB: ${beHealth.ttfb}ms)`);
    } else {
       logWarn(`Backend health check returned ${beHealth.res.statusCode}`);
    }

    const beHeaders = beHealth.res.headers;
    if (beHeaders['x-request-id']) logPass('X-Request-ID present on API');
    else logWarn('X-Request-ID missing on API');

    if (!beHeaders['x-powered-by']) logPass('X-Powered-By header removed');
    else logFail('X-Powered-By header is exposed');

    // CORS Test
    const corsTest = await fetchUrl(`${BACKEND_URL}/api/health`, {
      method: 'OPTIONS',
      headers: { 'Origin': FRONTEND_URL, 'Access-Control-Request-Method': 'GET' }
    });
    if (corsTest.res.headers['access-control-allow-origin']) {
      logPass(`CORS enabled for ${FRONTEND_URL}`);
    } else {
      logFail('CORS headers missing for allowed origin');
    }

    // 5. Authentication Security (Protected Routes)
    console.log(`${colors.blue}${colors.bold}\n--- Auth Security Audit ---${colors.reset}`);
    const protectedRoutes = ['/api/auth/me', '/api/bills', '/api/settings'];
    for (const route of protectedRoutes) {
      const authTest = await fetchUrl(`${BACKEND_URL}${route}`);
      if (authTest.res.statusCode === 401) {
        logPass(`${route} is protected (Returns 401)`);
      } else {
        logFail(`${route} is not properly protected! (Returns ${authTest.res.statusCode})`);
      }
    }

    // 8. Error Handling
    console.log(`${colors.blue}${colors.bold}\n--- Error Handling Audit ---${colors.reset}`);
    const fe404 = await fetchUrl(`${FRONTEND_URL}/nonexistent-page-12345`);
    if (fe404.res.statusCode === 404) logPass('Frontend properly handles 404s');
    else logWarn(`Frontend 404 test returned ${fe404.res.statusCode}`);
    
    const be404 = await fetchUrl(`${BACKEND_URL}/api/nonexistent-endpoint-12345`);
    if (be404.res.statusCode === 404) logPass('Backend properly handles 404s');
    else logWarn(`Backend 404 test returned ${be404.res.statusCode}`);

    console.log(`${colors.cyan}${colors.bold}\n📊 Audit Summary${colors.reset}`);
    console.log(`${colors.green}Passed: ${stats.passed}${colors.reset}`);
    console.log(`${colors.yellow}Warnings: ${stats.warnings}${colors.reset}`);
    console.log(`${colors.red}Failed: ${stats.failed}${colors.reset}`);

    if (stats.failed > 0) process.exit(1);

  } catch (err) {
    console.error(`${colors.red}Test Execution Failed:${colors.reset}`, err);
    process.exit(1);
  }
}

runTests();
