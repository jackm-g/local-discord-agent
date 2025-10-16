"""Configuration module for the agent application."""

import os
from dotenv import load_dotenv

load_dotenv()

# Bot configuration
BOT_NAME = os.getenv("BOT_NAME", "Assistant")

# MongoDB configuration
MONGO_URI = os.getenv("MONGO_URI")

# LLM Provider configuration
# Valid options: "openai", "grok"
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")

# OpenAI configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5-mini")

# Grok configuration
GROK_API_KEY = os.getenv("GROK_API_KEY")
GROK_MODEL = os.getenv("GROK_MODEL", "grok-4-fast")
GROK_BASE_URL = os.getenv("GROK_BASE_URL", "https://api.x.ai/v1")

# Model configuration (applies to both providers)
MODEL_TEMPERATURE = float(os.getenv("MODEL_TEMPERATURE", "0.2"))
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "500"))

# GreyNoise configuration
GREYNOISE_API_KEY = os.getenv("GREYNOISE_API_KEY")

# API Server configuration
HOST = os.getenv("HOST", "localhost")
PORT = int(os.getenv("PORT", "8995"))

