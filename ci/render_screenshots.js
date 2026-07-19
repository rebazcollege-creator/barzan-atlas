// Cloud-render the Barzan Atlas 3D map headlessly (software WebGL) and save the
// Atelier's four framings as PNGs. Runs in GitHub Actions — never on the 8GB Mac.
const puppeteer = require('puppeteer');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = process.cwd();
const MIME = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css'};
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  fs.readFile(path.join(ROOT, p), (e, d) => {
    const h = { 'Connection': 'close' };            // no keep-alive -> goto can finish
    if (e) { res.writeHead(404, h); res.end(); return; }
    h['Content-Type'] = MIME[path.extname(p)] || 'application/octet-stream';
    res.writeHead(200, h); res.end(d);
  });
});
(async () => {
  await new Promise(r => server.listen(8099, r));
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swangle','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--window-size=1600,1000']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  fs.mkdirSync('renders', { recursive: true });
  try { await page.goto('http://localhost:8099/index.html', { waitUntil: 'domcontentloaded', timeout: 120000 }); }
  catch (e) { errs.push('goto: ' + e.message); }
  let ready = false;
  try { await page.waitForFunction('window.__barzan && window.__barzan.setView', { timeout: 120000 }); ready = true; }
  catch (e) { errs.push('waitForBarzan: ' + e.message); }
  await new Promise(r => setTimeout(r, ready ? 6000 : 2000));
  if (ready) {
    for (const k of ['1','2','3','4','0']) {
      try { await page.evaluate((key) => window.__barzan.setView(window.__barzan.VIEWS[key]), k); } catch (e) { errs.push('setView ' + k + ': ' + e.message); }
      await new Promise(r => setTimeout(r, 2500));
      await page.screenshot({ path: `renders/view_${k}.png` });
    }
  } else {
    await page.screenshot({ path: 'renders/fallback.png', fullPage: false }).catch(() => {});
  }
  fs.writeFileSync('renders/console_errors.txt', 'ready=' + ready + '\n' + (errs.join('\n') || 'none'));
  await browser.close(); server.close();
  console.log('done. ready=' + ready + ', errors=' + errs.length);
})().catch(e => { console.error('FATAL', e); process.exit(1); });
