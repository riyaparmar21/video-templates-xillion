"""
AssetFlow LLM Client

Unified interface for text and vision LLM calls.
Supports Azure OpenAI and Google Gemini.
"""

import base64
import json
import re
from pathlib import Path
from typing import Any, Optional

from AssetFlow.config import Config, PROMPTS_DIR


def load_prompt(name: str, **kwargs) -> str:
    """Load a prompt template from the prompts/ directory and fill placeholders."""
    path = PROMPTS_DIR / f"{name}.md"
    if not path.exists():
        raise FileNotFoundError(f"Prompt template not found: {path}")
    content = path.read_text(encoding="utf-8")
    for key, value in kwargs.items():
        content = content.replace(f"{{{key}}}", str(value))
    return content


def extract_json(text: str) -> Any:
    """Extract JSON from LLM response, handling markdown code fences."""
    # Try to find JSON in code fences first
    fence_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if fence_match:
        text = fence_match.group(1).strip()

    # Try to find JSON array or object
    for pattern in [r"(\[.*\])", r"(\{.*\})"]:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                continue

    # Last resort: try parsing the whole thing
    return json.loads(text)


class LLMClient:
    """Unified LLM client for AssetFlow pipeline."""

    def __init__(self, config: Config):
        self.config = config
        self._azure_client = None
        self._gemini_model = None

    # ── Azure OpenAI ──

    def _get_azure_client(self):
        if self._azure_client is None:
            from openai import AzureOpenAI
            self._azure_client = AzureOpenAI(
                api_key=self.config.azure_openai_key,
                azure_endpoint=self.config.azure_openai_endpoint,
                api_version=self.config.azure_openai_api_version,
            )
        return self._azure_client

    def _azure_text_call(self, system: str, user: str, temperature: float = 0.7) -> str:
        client = self._get_azure_client()
        resp = client.chat.completions.create(
            model=self.config.azure_openai_deployment,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=temperature,
            max_tokens=4096,
        )
        return resp.choices[0].message.content or ""

    def _azure_vision_call(self, system: str, user_text: str, image_path: Path) -> str:
        client = self._get_azure_client()
        img_b64 = base64.b64encode(image_path.read_bytes()).decode("utf-8")
        suffix = image_path.suffix.lower().lstrip(".")
        mime = {"png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
                "webp": "image/webp", "gif": "image/gif"}.get(suffix, "image/png")

        resp = client.chat.completions.create(
            model=self.config.azure_openai_deployment,
            messages=[
                {"role": "system", "content": system},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_text},
                        {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{img_b64}"}},
                    ],
                },
            ],
            temperature=0.3,
            max_tokens=1024,
        )
        return resp.choices[0].message.content or ""

    # ── Google Gemini ──

    def _get_gemini_model(self, model_name: str = "gemini-2.0-flash"):
        if self._gemini_model is None:
            import google.generativeai as genai
            genai.configure(api_key=self.config.gemini_api_key)
            self._gemini_model = genai.GenerativeModel(model_name)
        return self._gemini_model

    def _gemini_text_call(self, system: str, user: str, temperature: float = 0.7) -> str:
        model = self._get_gemini_model()
        prompt = f"{system}\n\n---\n\n{user}"
        resp = model.generate_content(
            prompt,
            generation_config={"temperature": temperature, "max_output_tokens": 4096},
        )
        return resp.text or ""

    def _gemini_vision_call(self, system: str, user_text: str, image_path: Path) -> str:
        import google.generativeai as genai
        model = self._get_gemini_model()
        img = genai.upload_file(str(image_path))
        prompt = f"{system}\n\n---\n\n{user_text}"
        resp = model.generate_content(
            [prompt, img],
            generation_config={"temperature": 0.3, "max_output_tokens": 1024},
        )
        return resp.text or ""

    # ── Public Interface ──

    def text_call(self, system: str, user: str, temperature: float = 0.7) -> str:
        """Make a text-only LLM call using the configured provider."""
        provider = self.config.vision_llm_provider
        if provider == "gemini" and self.config.gemini_api_key:
            return self._gemini_text_call(system, user, temperature)
        elif self.config.azure_openai_key:
            return self._azure_text_call(system, user, temperature)
        else:
            raise RuntimeError("No LLM provider configured. Set GEMINI_API_KEY or AZURE_OPENAI_KEY.")

    def vision_call(self, system: str, user_text: str, image_path: Path) -> str:
        """Make a vision LLM call (text + image) using the configured provider."""
        provider = self.config.vision_llm_provider
        if provider == "gemini" and self.config.gemini_api_key:
            return self._gemini_vision_call(system, user_text, image_path)
        elif self.config.azure_openai_key:
            return self._azure_vision_call(system, user_text, image_path)
        else:
            raise RuntimeError("No Vision LLM provider configured.")
