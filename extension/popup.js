/*
  Reads the links on the open AI answer page, groups them by domain, and
  marks the one you said is yours.

  Nothing is sent anywhere: the page is read in the tab through activeTab,
  only when the popup is opened, and the one thing stored is your domain.
*/

const ENGINES = [
  { host: "chatgpt.com", name: "ChatGPT" },
  { host: "perplexity.ai", name: "Perplexity" },
  { host: "gemini.google.com", name: "Gemini" },
  { host: "copilot.microsoft.com", name: "Copilot" },
  { host: "google.", name: "Google" },
];

/*
  Runs inside the page, so it must stand on its own — no closures over
  anything in this file.
*/
function collectLinks() {
  const OWN_HOSTS = [
    "chatgpt.com",
    "openai.com",
    "oaiusercontent.com",
    "perplexity.ai",
    "pplx.ai",
    "gemini.google.com",
    "microsoft.com",
    "bing.com",
    "gstatic.com",
    "googleusercontent.com",
    "googleapis.com",
    "accounts.google.com",
    "support.google.com",
    "policies.google.com",
  ];
  const isOwn = (host) =>
    OWN_HOSTS.some((own) => host === own || host.endsWith(`.${own}`)) ||
    /(^|\.)google\.[a-z.]+$/.test(host);

  const urls = new Set();
  for (const anchor of document.querySelectorAll("a[href]")) {
    let url;
    try {
      url = new URL(anchor.href);
    } catch {
      continue;
    }
    // Google wraps outbound links as /url?q=…
    const wrapped = url.searchParams.get("q") ?? url.searchParams.get("url");
    if (/(^|\.)google\./.test(url.hostname) && url.pathname === "/url" && wrapped) {
      try {
        url = new URL(wrapped);
      } catch {
        continue;
      }
    }
    if (!url.protocol.startsWith("http") || isOwn(url.hostname)) {
      continue;
    }
    for (const key of [...url.searchParams.keys()]) {
      if (key.startsWith("utm_")) {
        url.searchParams.delete(key);
      }
    }
    url.hash = "";
    urls.add(url.toString());
  }
  return [...urls];
}

const bareHost = (host) => host.replace(/^www\./, "").toLowerCase();

const normalizeDomain = (value) =>
  bareHost(value.trim().replace(/^https?:\/\//, "").split("/")[0] ?? "");

const isYours = (domain, yours) =>
  Boolean(yours) && (domain === yours || domain.endsWith(`.${yours}`));

function group(urls) {
  const byDomain = new Map();
  for (const href of urls) {
    const domain = bareHost(new URL(href).hostname);
    const list = byDomain.get(domain) ?? [];
    list.push(href);
    byDomain.set(domain, list);
  }
  return [...byDomain.entries()]
    .map(([domain, links]) => ({ domain, links }))
    .sort((a, b) => b.links.length - a.links.length || a.domain.localeCompare(b.domain));
}

const $ = (id) => document.getElementById(id);

let groups = [];

function render(yours, engine) {
  const list = $("list");
  list.replaceChildren();

  for (const { domain, links } of groups) {
    const item = document.createElement("li");
    item.classList.toggle("hit", isYours(domain, yours));

    const details = document.createElement("details");
    const summary = document.createElement("summary");
    const name = document.createElement("span");
    name.className = "domain";
    name.textContent = domain;
    const count = document.createElement("span");
    count.className = "count";
    count.textContent = String(links.length);
    summary.append(name, count);

    const pages = document.createElement("ul");
    for (const href of links) {
      const page = document.createElement("li");
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.target = "_blank";
      anchor.rel = "noopener";
      anchor.textContent = href.replace(/^https?:\/\/(www\.)?/, "");
      anchor.title = href;
      page.append(anchor);
      pages.append(page);
    }

    details.append(summary, pages);
    item.append(details);
    list.append(item);
  }

  const status = $("status");
  if (groups.length === 0) {
    status.textContent = engine
      ? `No outside links on this ${engine} page yet. Open an answer that cites sources.`
      : "Open an answer on ChatGPT, Perplexity, Gemini or Google AI Mode.";
    $("copy").hidden = true;
    return;
  }

  const total = groups.reduce((sum, row) => sum + row.links.length, 0);
  // Subdomains count as yours: blog.example.com is a citation of example.com.
  const cited = groups
    .filter((row) => isYours(row.domain, yours))
    .reduce((sum, row) => sum + row.links.length, 0);
  status.textContent = `${groups.length} domains, ${total} links${engine ? ` on ${engine}` : ""}. `;
  if (yours) {
    const verdict = document.createElement("strong");
    verdict.textContent =
      cited > 0 ? `${yours} is cited ${cited}×.` : `${yours} is not cited.`;
    status.append(verdict);
  }
  $("copy").hidden = false;
}

async function load() {
  const stored = await chrome.storage.sync.get("domain");
  const input = $("domain");
  input.value = stored.domain ?? "";

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const host = tab?.url ? new URL(tab.url).hostname : "";
  const engine = ENGINES.find((row) => host.includes(row.host))?.name;

  try {
    const [result] = await chrome.scripting.executeScript({
      func: collectLinks,
      target: { tabId: tab.id },
    });
    groups = group(result?.result ?? []);
  } catch {
    // chrome:// pages and the Web Store refuse scripts.
    groups = [];
  }
  render(normalizeDomain(input.value), engine);

  input.addEventListener("input", () => {
    const yours = normalizeDomain(input.value);
    chrome.storage.sync.set({ domain: yours });
    render(yours, engine);
  });

  $("copy").addEventListener("click", async () => {
    const rows = groups.flatMap(({ domain, links }) =>
      links.map((href) => `${domain},"${href.replaceAll('"', '""')}"`)
    );
    await navigator.clipboard.writeText(["domain,url", ...rows].join("\n"));
    $("copy").textContent = "Copied";
  });
}

load();
