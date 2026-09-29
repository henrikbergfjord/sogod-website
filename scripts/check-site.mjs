import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const htmlFiles = [];
const sourceFiles = [];

function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        const filename = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            walk(filename);
        } else if (/\.(?:html|css|js|mjs)$/i.test(entry.name)) {
            sourceFiles.push(filename);
            if (entry.name.endsWith('.html')) htmlFiles.push(filename);
        }
    }
}

function relative(filename) {
    return path.relative(root, filename).split(path.sep).join('/');
}

function report(filename, message) {
    errors.push(`${relative(filename)}: ${message}`);
}

function checkReference(filename, reference) {
    const value = reference.trim();
    if (!value || value.startsWith('#') || /^(?:data|blob|javascript):/i.test(value)) return;

    let url;
    try {
        url = new URL(value, `https://site.invalid/${relative(filename)}`);
    } catch {
        report(filename, `invalid local reference "${value}"`);
        return;
    }

    if (
        url.origin !== 'https://site.invalid' &&
        !['www.sogod.no', 'sogod.no'].includes(url.hostname)
    ) return;
    if (/^\/(?:api|\.auth)(?:\/|$)/.test(url.pathname)) return;

    let decodedPath;
    try {
        decodedPath = decodeURIComponent(url.pathname);
    } catch {
        report(filename, `invalid URL encoding in "${value}"`);
        return;
    }

    const sitePath = decodedPath.replace(/^\/+/, '');
    let target = path.resolve(root, sitePath || 'index.html');
    if (!target.startsWith(`${root}${path.sep}`) && target !== root) {
        report(filename, `reference escapes the site root: "${value}"`);
        return;
    }
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
        target = path.join(target, 'index.html');
    }
    if (!fs.existsSync(target)) {
        report(filename, `missing local target "${value}"`);
        return;
    }

    if (url.hash && target.endsWith('.html')) {
        const html = fs.readFileSync(target, 'utf8');
        const anchors = new Set(
            [...html.matchAll(/\b(?:id|name)\s*=\s*(["'])(.*?)\1/gi)].map((match) => match[2])
        );
        let fragment;
        try {
            fragment = decodeURIComponent(url.hash.slice(1));
        } catch {
            report(filename, `invalid fragment in "${value}"`);
            return;
        }
        if (fragment && !anchors.has(fragment)) {
            report(filename, `missing fragment target "${value}"`);
        }
    }
}

function checkCssReferences(filename, css) {
    for (const match of css.matchAll(/url\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/gi)) {
        checkReference(filename, match[2] ?? match[3] ?? '');
    }
}

walk(root);

const staticWebAppConfigPath = path.join(root, 'staticwebapp.config.json');
const staticWebAppConfig = JSON.parse(fs.readFileSync(staticWebAppConfigPath, 'utf8'));
const apiEntryPath = path.join(root, 'api/src/index.js');
if (fs.readFileSync(apiEntryPath, 'utf8').trim() !== "import './gallery.js';") {
    report(apiEntryPath, 'only Gallery API functions may be registered for this release');
}
const apiPackage = JSON.parse(fs.readFileSync(path.join(root, 'api/package.json'), 'utf8'));
if (apiPackage.dependencies?.pg) {
    report(path.join(root, 'api/package.json'), 'PostgreSQL runtime dependency is out of scope for this Gallery release');
}
const localSettingsPath = path.join(root, 'api/local.settings.example.json');
const localSettings = JSON.parse(fs.readFileSync(localSettingsPath, 'utf8'));
if (localSettings.Values?.BOOKING_ENABLED !== 'false') {
    report(localSettingsPath, 'booking must remain disabled for this release');
}
const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!homepage.includes('Developed and designed by Henrik Bergfjord')) {
    report(path.join(root, 'index.html'), 'homepage must retain the designer credit');
}
if (staticWebAppConfig.platform?.apiRuntime !== 'node:22') {
    report(staticWebAppConfigPath, 'the API runtime must match the Node.js 22 package requirement');
}
for (const route of ['/gallery.html', '/assets/gallery/*']) {
    const rule = staticWebAppConfig.routes?.find((entry) => entry.route === route);
    if (!rule?.allowedRoles?.includes('anonymous')) {
        report(staticWebAppConfigPath, `${route} must remain publicly accessible`);
    }
}
const galleryAdminRoute = staticWebAppConfig.routes?.find((entry) => entry.route === '/gallery-admin.html');
if (!galleryAdminRoute?.allowedRoles?.includes('gallery') || galleryAdminRoute.allowedRoles.includes('anonymous')) {
    report(staticWebAppConfigPath, '/gallery-admin.html must require the explicit gallery role');
}
const analyticsPages = new Set([
    'arrival.html',
    'atv.html',
    'beaches.html',
    'boodle-fight.html',
    'connected.html',
    'food-culture.html',
    'freedom.html',
    'guide.html',
    'holiday-planner.html',
    'jeepney.html',
    'money-guide.html',
    'pages/contact.html',
    'philippines.html',
    'request.html',
    'tricycle.html'
]);

for (const filename of htmlFiles) {
    const html = fs.readFileSync(filename, 'utf8');
    const analyticsCount = [...html.matchAll(/<script\b[^>]*src=["']\/assets\/js\/analytics\.js["'][^>]*>/gi)].length;
    const hasAnalytics = analyticsPages.has(relative(filename));
    if (analyticsCount !== Number(hasAnalytics)) {
        report(filename, hasAnalytics ? 'expected exactly one shared analytics script include' : 'analytics include must not be duplicated or added to unconfigured pages');
    }

    if (hasAnalytics && /<form\b/i.test(html)) {
        for (const form of html.matchAll(/<form\b([^>]*)>/gi)) {
            if (!/\bdata-clarity-mask\b/i.test(form[1])) {
                report(filename, 'analytics-tracked form must opt into masking');
            }
        }
    }

    const analyticsScriptPath = path.join(root, 'assets/js/analytics.js');
    if (!fs.existsSync(analyticsScriptPath)) {
        report(staticWebAppConfigPath, 'shared analytics script is missing');
    } else {
        const analyticsScript = fs.readFileSync(analyticsScriptPath, 'utf8');
        if ([...analyticsScript.matchAll(/https:\/\/www\.clarity\.ms\/tag\//g)].length !== 1) {
            report(analyticsScriptPath, 'shared analytics script must load Clarity exactly once');
        }
    }

    const attributes = /\b(?:href|src|poster|data-lightbox|srcset)\s*=\s*(["'])(.*?)\1/gi;
    for (const match of html.matchAll(attributes)) {
        const values = match[0].toLowerCase().startsWith('srcset')
            ? match[2].split(',').map((item) => item.trim().split(/\s+/, 1)[0])
            : [match[2]];
        for (const value of values) checkReference(filename, value);
    }

    checkCssReferences(filename, html);
    for (const style of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) {
        checkCssReferences(filename, style[1]);
    }

    const scripts = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
    for (const script of html.matchAll(scripts)) {
        const type = script[1].match(/\btype\s*=\s*(["'])(.*?)\1/i)?.[2]?.toLowerCase();
        if (/\bsrc\s*=/i.test(script[1]) || type === 'application/ld+json' || type === 'importmap') continue;
        if (!script[2].trim()) continue;
        const result = spawnSync(process.execPath, ['--check', '--input-type=module'], {
            cwd: root,
            input: script[2],
            encoding: 'utf8'
        });
        if (result.status !== 0) {
            report(filename, `inline JavaScript syntax error: ${result.stderr.trim().split('\n').at(-1)}`);
        }
    }
}

for (const filename of sourceFiles.filter((entry) => entry.endsWith('.css'))) {
    checkCssReferences(filename, fs.readFileSync(filename, 'utf8'));
}

for (const filename of sourceFiles.filter((entry) => /\.(?:js|mjs)$/i.test(entry))) {
    const result = spawnSync(process.execPath, ['--check', filename], {
        cwd: root,
        encoding: 'utf8'
    });
    if (result.status !== 0) {
        report(filename, `JavaScript syntax check failed: ${result.stderr.trim().split('\n').at(-1)}`);
    }
}

for (const filename of sourceFiles) {
    const pagePath = relative(filename);
    if (!pagePath.endsWith('.html') && !pagePath.startsWith('assets/css/') && !pagePath.startsWith('assets/js/')) continue;
    const content = fs.readFileSync(filename, 'utf8');
    if (/(?:https?:\/\/|\/\/)(?:localhost|127\.0\.0\.1|preview|test)(?:[:/]|$)|\.azurestaticapps\.net|ians\.no/i.test(content)) {
        report(filename, 'development host or unrelated production domain in deployable source');
    }
    if (pagePath.endsWith('.html') || pagePath.startsWith('assets/js/')) {
        for (const match of content.matchAll(/(["'`])((?:\/)?assets\/[^"'`\s)]+)\1/g)) {
            checkReference(filename, match[2]);
        }
    }
}

for (const filename of htmlFiles) {
    const html = fs.readFileSync(filename, 'utf8');
    const route = relative(filename) === 'index.html' ? '/' : `/${relative(filename)}`;
    const expectedUrl = `https://www.sogod.no${route}`;
    const robots = [...html.matchAll(/<meta\b[^>]*>/gi)]
        .map((match) => match[0])
        .find((tag) => /\bname=["']robots["']/i.test(tag));
    const noindex = robots && /\bcontent=["'][^"']*\bnoindex\b/i.test(robots);
    const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1]?.trim();
    if (!title) report(filename, 'page needs a title');
    if (noindex) continue;

    const description = [...html.matchAll(/<meta\b[^>]*>/gi)]
        .map((match) => match[0])
        .find((tag) => /\bname=["']description["']/i.test(tag))
        ?.match(/\bcontent=["']([^"']+)["']/i)?.[1];
    if (!description?.trim()) report(filename, 'indexable page needs a non-empty meta description');

    const canonicalTag = [...html.matchAll(/<link\b[^>]*>/gi)]
        .map((match) => match[0])
        .find((tag) => /\brel=["']canonical["']/i.test(tag));
    const canonical = canonicalTag?.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (canonical !== expectedUrl) {
        report(filename, `canonical URL must be ${expectedUrl}`);
    }

    const ogUrlTag = [...html.matchAll(/<meta\b[^>]*>/gi)]
        .map((match) => match[0])
        .find((tag) => /\bproperty=["']og:url["']/i.test(tag));
    const ogUrl = ogUrlTag?.match(/\bcontent=["']([^"']+)["']/i)?.[1];
    if (ogUrl !== expectedUrl) {
        report(filename, `Open Graph URL must be ${expectedUrl}`);
    }
}

if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
} else {
    console.log(`Checked ${htmlFiles.length} HTML pages, ${sourceFiles.filter((file) => /\.(?:js|mjs)$/i.test(file)).length} JavaScript files, and local page/asset references.`);
}
