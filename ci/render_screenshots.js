// Cloud-render the Barzan Atlas 3D map headlessly (software WebGL) and save the
// Atelier's four framings as PNGs. Runs in GitHub Actions — never on the 8GB Mac.
const puppeteer = require('puppeteer');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.cwd();
const MIME = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'};
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  fs.readFile(fp, (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, {'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream'});
    res.end(d);
  });
});
(async () => {
  await new Promise(r => server.listen(8099, r));
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--enable-unsafe-swangle','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--window-size=1600,1000']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto('http://localhost:8099/index.html', { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForFunction('window.__barzan && window.__barzan.setView', { timeout: 90000 });
  await new Promise(r => setTimeout(r, 5000)); // let the build + textures settle
  fs.mkdirSync('renders', { recursive: true });
  for (const k of ['1','2','3','4','0']) {
    await page.evaluate((key) => window.__barzan.setView(window.__barzan.VIEWS[key]), k);
    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: `renders/view_${k}.png` });
  }
  if (errs.length) fs.writeFileSync('renders/console_errors.txt', errs.join('\n'));
  await browser.close(); server.close();
  console.log('rendered 5 framings,', errs.length, 'console errors');
})().catch(e => { console.error(e); process.exit(1); });
