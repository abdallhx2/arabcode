<p align="center">
  <a href="https://github.com/abdallhx2/arabcode">
    <img src=".github/logo.png" alt="arabcode" width="420">
  </a>
</p>

<p align="center">
  <b>The first AI command-line (CLI) tool for the terminal with full Arabic support.</b><br>
  Correct right-to-left (RTL) direction and proper Arabic shaping, right in your terminal.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/arabcode"><img alt="npm" src="https://img.shields.io/npm/v/arabcode?style=flat-square&color=ffaf00&label=npm"></a>
  <a href="https://github.com/abdallhx2/arabcode/releases"><img alt="release" src="https://img.shields.io/github/v/release/abdallhx2/arabcode?style=flat-square&color=ffaf00&label=release"></a>
  <img alt="license" src="https://img.shields.io/badge/license-MIT-ffaf00?style=flat-square">
</p>

<p align="center">
  <a href="README.md">العربية</a> ·
  <a href="README.en.md">English</a>
</p>

---

## Overview

**arabcode** is an AI agent that runs in your terminal: it reads your project, writes and edits code, and runs commands alongside you — all in full Arabic. Unlike other terminal tools that break Arabic into disconnected, reversed characters, arabcode renders Arabic in its correct direction with connected letters, logical selection and copy, and proper Arabic input.

The tool is **free and open source** under the MIT license, and runs locally in your terminal without storing your code or project context on any server.

## Install

```bash
# npm (all platforms)
npm i -g arabcode

# macOS / Linux (curl)
curl -fsSL https://raw.githubusercontent.com/abdallhx2/arabcode/main/install | bash

# Windows (PowerShell)
irm https://raw.githubusercontent.com/abdallhx2/arabcode/main/install.ps1 | iex

# Homebrew
brew install abdallhx2/tap/arabcode
```

## Quick start

```bash
cd <your-project>   # open your project folder
arabcode            # run the tool
```

Type your request in Arabic in the terminal, and arabcode will read your files, edit them, and run commands for you. For the best Arabic rendering, use a Unicode-capable terminal such as WezTerm, Alacritty, Ghostty, or Kitty.

## Features

- **Full Arabic (RTL + shaping).** Correct rendering of Arabic text in the right direction with connected letters, selection and copy that preserve logical order, and proper Arabic input in the command field.
- **Multi-provider.** Support for 75+ model providers via Models.dev — OpenAI, Claude, Gemini, Groq, Azure, OpenRouter, GitHub Copilot, and more — plus OpenAI-compatible local models. Switch models per task without changing tools.
- **build / plan modes.** Two built-in agents you toggle with `Tab`: `build` with full development access, and read-only `plan` that analyzes and plans without touching files.
- **Custom agents.** Build a team of specialized agents (security review, testing, docs) with fine-grained permissions via `arabcode agent create`.
- **Sessions & snapshots.** A snapshot per session lets you roll back to any earlier message and restore file state at that point, with token usage and cost visibility.
- **MCP servers & Code Mode.** Full integration with your external tools (databases, APIs, filesystems) via the Model Context Protocol, with scoped orchestration scripts on top.
- **GitHub integration.** Automated PR reviews inside CI via `arabcode github`, running the agent on any PR branch directly, and using a GitHub Copilot subscription as an auth provider.
- **Automation modes.** Non-interactive execution via `arabcode run`, an HTTP server via `arabcode serve`, and a full web UI via `arabcode web` — covering every scripting and production scenario.
- **LSP & Skills.** Real code intelligence via the Language Server Protocol, and a Skills system for reusing specialized logic.
- **AGENTS.md & `/init`.** Analyzes your project and generates a documentation file read automatically each session so the agent follows your project's conventions.

## Web interface

You are not limited to the terminal. Run `arabcode web` and a full web UI opens automatically, with all agent capabilities and the same Arabic support.

## Documentation

Full documentation — installation, commands, configuration, providers, agents, MCP, and more — is available on the **[project site](https://github.com/abdallhx2/arabcode)**.

## License

Licensed under the [MIT License](LICENSE).
