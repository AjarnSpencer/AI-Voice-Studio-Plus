# 🎙️ Text Narrator Polyglot Pro

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-teal.svg)](https://opensource.org/licenses/Apache-2.0)
[![Engines](https://img.shields.io/badge/Engines-Gemini%20%7C%20ElevenLabs%20%7C%20Resemble-cyan.svg)](https://aistudio.google.com)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-black.svg)]()

**Text Narrator Polyglot Pro** is a professional-grade desktop audio production environment designed for high-fidelity documentary narration, esoteric text reading, and multilingual voice synthesis. 

By decoupling the UI from the browser and moving to native Electron IPCs, this application operates as a standalone production studio, bridging the gap between raw text and human-like neural performances.

---

## ✨ Key Features & Capabilities

- **The Sacred Text Reader**: A specialized Brahmanic/Vedic pronunciation pipeline optimized for Pali, Sanskrit, and Romanized diacritics. It normalizes orthography before synthesis to ensure perfect mantra recitations.
- **Multi-Engine Synthesis**: Seamlessly toggle your rendering engine between **Gemini Neural TTS (v3.1 Preview)**, **ElevenLabs**, and **Resemble AI**.
- **Total Portability (Import/Export)**: Save and share your work instantly. Export your **Custom Voice Profiles (`.json`)**, **Vocal Styles (`.txt`)**, and **Narrative Scripts (`.txt`)** to your local drive and load them back later.
- **Diacritics & Pronunciation Lexicon**: Build a custom dictionary to force specific pronunciations (e.g., turning complex acronyms into phonetic spellings).
- **Zero-Data Loss Architecture**: Generates and downloads pristine **24kHz PCM WAV** master files directly to your local file system using native OS dialogs.
- **40+ Languages Supported**: Built-in translation pipeline that preserves SSML/Prosody tags across language barriers.

---

## 🧠 How it Actually Works

### 1. Neural Styling & Direction (Gemini TTS)
When using the Gemini TTS engine, you don't need to decompose audio. You can use **Instruction-Based Prosody**. By typing stylistic commands in the "Neural Styling" box (e.g., *"Deep Baritone, Slow Meditative, British Accent"*), or using bracketed emotion tags in your script like `[Whisper]` or `[Authoritative]`, the Gemini engine dynamically modulates the voice at runtime.

### 2. Provider Cross-Routing (ElevenLabs / Resemble)
When you switch the pipeline engine to ElevenLabs or Resemble, the application routes the text away from Gemini's TTS and instead queries your chosen provider using your API Keys. The Custom Voice "Base Voice" ID maps directly to the specific voice ID on their respective platforms.

### 3. Hybrid Translation Pipeline
When narrating in a non-English language:
1. The source script is first sent to **Gemini 2.5 Flash**.
2. An SSML-Aware Translation is performed, ensuring `<break>`, `<prosody>`, and `[Emotion]` tags remain in the correct semantic position in the target language.
3. The translated text is then passed to your selected audio engine for final waveform synthesis.

---

## 📦 Building the Executables (.exe, .deb, .dmg)

### Cloud Build (GitHub Actions)
You don't need to install build tools on your PC! This repository uses **GitHub Actions**. 
Every time you push a new "Release" or trigger the workflow from the **Actions** tab on GitHub, Microsoft's cloud servers will automatically compile the `.exe` (Windows), `.dmg` (Mac), and `.deb/.rpm` (Linux) installers for you. You can download them directly from the GitHub Releases page.

### Local Build
If you prefer to compile the legacy desktop apps yourself on your own machine:
```bash
# 1. Install dependencies
npm install

# 2. Compile Web Assets
npm run build

# 3. Package for your current OS
npm run electron:package
```

---

## ☕ Support & Donations

If you find this tool useful for your productions, consider supporting the developer:

<div align="center">
  <a href="https://wise.com/" target="_blank">
    <img src="https://img.shields.io/badge/Donate_with-Wise-9FE870?style=for-the-badge&logo=wise&logoColor=163300" alt="Donate with Wise" />
  </a>
  <a href="https://donate.stripe.com/9B68wOcilgL3fFfc7o9AA00" target="_blank">
    <img src="https://img.shields.io/badge/Donate_with-Stripe-626CD9?style=for-the-badge&logo=stripe&logoColor=white" alt="Donate with Stripe" />
  </a>
  <a href="https://www.buymeacoffee.com/" target="_blank">
    <img src="https://img.shields.io/badge/Buy_Me_A_Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me A Coffee" />
  </a>
</div>

---

<p align="center">
  <i>"Perform your narrative, don't just generate it."</i>
  <br>
  <b>Developed by <a href="https://www.ajarnspencer.com">Ajarn Spencer Littlewood</a></b>
  <br>
  <small>Created in collaboration with Gemini Unleashed Autonomous Agentic Workflow Protocol</small>
</p>
