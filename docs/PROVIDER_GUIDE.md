# PROVIDER_GUIDE

## BYOK keys

Keys live in the OS credential store (`jarvisd secret set provider:<id>`), never in files. Enter them in the app: Workstation > AI provider.

## Self-hosted LiteLLM (zero code)

A user self-hosting [LiteLLM](https://github.com/BerriAI/litellm) gets every provider it proxies for free: pick **Custom (OpenAI-compatible)** in Settings, set the base URL to the LiteLLM endpoint (e.g. `http://127.0.0.1:4000/v1`), paste the LiteLLM key. Nothing to build.

## Model chains (the coding agent)

The agent model chain is NVIDIA-provider by default (shared-key budget discipline): `nvidia/nvidia/nemotron-3.5-lightning-30b-a3b -> nvidia/z-ai/glm-5.3 -> nvidia/openai/gpt-oss-20b`. Change it in Settings > Coding agent; any opencode-visible model id works.

## GitHub

Fine-grained PAT via `jarvisd secret set github:token` (read-only: Metadata, Issues, Pull requests). The `gh` CLI carries the fork + PR creation when logged in (`gh auth login`).