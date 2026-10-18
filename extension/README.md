# AI Answer Sources: a Chrome extension by Recomma

Open it on an AI answer and it lists every outside source the answer links to, grouped by domain and counted. Enter your domain once and it tells you whether you were cited.

Works on ChatGPT, Perplexity, Gemini, Copilot and Google AI Mode / AI Overviews.

- **Reads only when you click it.** It uses `activeTab`: no access to any page until you open the popup on that page.
- **Sends nothing anywhere.** The only thing stored is the domain you type, in Chrome's own sync storage. See [PRIVACY.md](PRIVACY.md).
- **Copy as CSV** gives you domain and URL for every link.

One answer is one sample. The same question asked again, on another engine or another day, cites different pages. [Recomma](https://recomma.ai) tracks every answer in your category, every day, with the sample size beside every figure.

## Install from source

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and choose this folder.
