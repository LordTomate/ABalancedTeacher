"""
Ollama Routing Client - Routes queries between fast, normal, and strong models.

This client automatically decides which model to use based on query complexity:
- Simple/short queries → Fast model (lightweight, quick responses)
- Medium queries → Normal model (balanced performance)
- Complex/detailed queries → Strong model (best reasoning, detailed explanations)

Model recommendations based on LM Arena and HuggingFace Open LLM Leaderboard rankings:

FAST TIER (< 4B params, quick responses):
- qwen2.5:0.5b, qwen2.5:1.5b - Excellent small models
- phi3:3.8b - Microsoft's efficient small model
- gemma2:2b - Google's compact model
- llama3.2:1b, llama3.2:3b - Meta's small models

NORMAL TIER (7-14B params, balanced):
- qwen2.5:7b - Top performer in 7B class
- llama3.1:8b - Excellent general purpose
- mistral:7b - Great balance of speed/quality
- gemma2:9b - Strong 9B model from Google

STRONG TIER (14B+ params, best quality):
- qwen2.5:14b, qwen2.5:32b - Top open-source performers
- llama3.1:70b - Near GPT-4 performance
- deepseek-r1:14b, deepseek-r1:32b - Excellent reasoning
- mixtral:8x7b - Strong MoE model

Usage:
    python routing_client.py

Requires Ollama running locally:
    ollama serve
    ollama pull <model_name>
"""

import json
import re
import requests

OLLAMA_BASE_URL = "http://localhost:11434"

# =============================================================================
# MODEL CONFIGURATION - Three Teacher Personas
# =============================================================================
# These custom models have distinct teaching personalities:
#
# QUICK-TUTOR: Fast, snappy, micro-learning focused
#   Base: qwen2.5:1.5b | Size: ~1GB | Style: Flash-cards, mnemonics
#
# BALANCED-TUTOR: Warm, Socratic, conversational
#   Base: mistral | Size: ~4GB | Style: Guided discovery, dialogue
#
# DEEP-TUTOR: Rigorous, academic mentor, comprehensive
#   Base: qwen2.5:14b | Size: ~9GB | Style: University-level depth
#
# Created with: ollama create <name> -f Modelfile.<type>
# =============================================================================

FAST_MODEL = "quick-tutor"  # ~1GB VRAM - Snappy micro-learning
NORMAL_MODEL = "balanced-tutor"  # ~4GB VRAM - Socratic dialogue
STRONG_MODEL = "deep-tutor"  # ~9GB VRAM - Academic rigor

# Complexity indicators that trigger the STRONG model
STRONG_KEYWORDS = [
    "explain in detail",
    "step by step",
    "comprehensive",
    "thorough",
    "deep dive",
    "advanced",
    "debug",
    "fix this code",
    "review my code",
    "optimize",
    "architecture",
    "design pattern",
    "algorithm",
    "prove",
    "derive",
    "mathematical",
]

# Complexity indicators that trigger the NORMAL model
NORMAL_KEYWORDS = [
    "explain",
    "why",
    "how does",
    "compare",
    "analyze",
    "elaborate",
    "teach me",
    "help me understand",
    "what is the difference",
    "pros and cons",
    "advantages",
    "disadvantages",
    "example",
    "code",
    "write",
    "create",
    "implement",
]

# Simple query patterns that use the fast model
SIMPLE_PATTERNS = [
    r"^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|bye|goodbye)\.?$",
    r"^what (is|are) .{1,30}\??$",  # Short "what is X" questions
    r"^(list|name|give me) \d+ .+$",  # Simple list requests
    r"^translate .+$",  # Translation requests
    r"^define .+$",  # Definition requests
]


def list_models() -> list[str]:
    """List all available models in local Ollama instance."""
    url = f"{OLLAMA_BASE_URL}/api/tags"
    try:
        response = requests.get(url)
        response.raise_for_status()
        return [m["name"] for m in response.json().get("models", [])]
    except requests.RequestException:
        return []


def classify_complexity(prompt: str) -> str:
    """
    Classify prompt complexity into three tiers.
    Returns 'fast', 'normal', or 'strong'.
    """
    prompt_lower = prompt.lower().strip()

    # Check for simple patterns first → FAST
    for pattern in SIMPLE_PATTERNS:
        if re.match(pattern, prompt_lower, re.IGNORECASE):
            return "fast"

    # Check for STRONG indicators first (more specific)
    for keyword in STRONG_KEYWORDS:
        if keyword in prompt_lower:
            return "strong"

    # Check for NORMAL indicators
    for keyword in NORMAL_KEYWORDS:
        if keyword in prompt_lower:
            return "normal"

    # Heuristics based on length and structure
    word_count = len(prompt.split())
    has_code = (
        "```" in prompt
        or "def " in prompt
        or "function " in prompt
        or "class " in prompt
    )
    has_multiple_questions = prompt.count("?") > 1
    has_complex_code = prompt.count("\n") > 5 and has_code

    if has_complex_code or has_multiple_questions:
        return "strong"

    if has_code:
        return "normal"

    if word_count > 100:
        return "strong"

    if word_count > 30:
        return "normal"

    if word_count < 10:
        return "fast"

    # Default to normal for medium-length queries
    return "normal"


def chat(
    messages: list[dict], model: str, temperature: float = 0.7, stream: bool = True
) -> str:
    """Chat with the specified Ollama model using message history."""
    url = f"{OLLAMA_BASE_URL}/api/chat"
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "stream": stream,
    }

    response = requests.post(url, json=payload, stream=stream)
    response.raise_for_status()

    if stream:
        full_response = ""
        for line in response.iter_lines():
            if line:
                data = json.loads(line)
                chunk = data.get("message", {}).get("content", "")
                if chunk:
                    print(chunk, end="", flush=True)
                    full_response += chunk
                if data.get("done"):
                    print()  # newline at the end
                    break
        return full_response
    else:
        return response.json().get("message", {}).get("content", "")


def print_config():
    """Print current model configuration."""
    available = list_models()
    print("\n╔════════════════════════════════════════════════════════════════╗")
    print("║        Ollama Routing Client - Three-Tier Model System         ║")
    print("╠════════════════════════════════════════════════════════════════╣")
    print("║  Model Tier Configuration (based on LM Arena & HuggingFace):   ║")
    print("╠════════════════════════════════════════════════════════════════╣")
    print(f"║  🚀 Fast Model:   {FAST_MODEL:<43} ║")
    print(f"║  ⚡ Normal Model: {NORMAL_MODEL:<43} ║")
    print(f"║  🧠 Strong Model: {STRONG_MODEL:<43} ║")
    print("╠════════════════════════════════════════════════════════════════╣")

    fast_ok = any(FAST_MODEL.split(":")[0] in m for m in available)
    normal_ok = any(NORMAL_MODEL.split(":")[0] in m for m in available)
    strong_ok = any(STRONG_MODEL.split(":")[0] in m for m in available)

    print(f"║  Fast Available:   {'✓ Yes' if fast_ok else '✗ No':<42} ║")
    print(f"║  Normal Available: {'✓ Yes' if normal_ok else '✗ No':<42} ║")
    print(f"║  Strong Available: {'✓ Yes' if strong_ok else '✗ No':<42} ║")
    print("╠════════════════════════════════════════════════════════════════╣")
    print("║  Commands:                                                     ║")
    print("║    /fast   - Force next query to use fast model               ║")
    print("║    /normal - Force next query to use normal model             ║")
    print("║    /strong - Force next query to use strong model             ║")
    print("║    /auto   - Return to automatic routing (default)            ║")
    print("║    /status - Show current routing mode                        ║")
    print("║    /models - List available models                            ║")
    print("║    /bye    - Exit                                             ║")
    print("╚════════════════════════════════════════════════════════════════╝\n")

    missing = []
    if not fast_ok:
        missing.append(f"  ollama pull {FAST_MODEL}")
    if not normal_ok:
        missing.append(f"  ollama pull {NORMAL_MODEL}")
    if not strong_ok:
        missing.append(f"  ollama pull {STRONG_MODEL}")

    if missing:
        print("⚠️  Missing models. Run:")
        for cmd in missing:
            print(cmd)


def main():
    print_config()

    messages_fast = []  # Separate history for fast model
    messages_normal = []  # Separate history for normal model
    messages_strong = []  # Separate history for strong model

    force_mode = None  # None = auto, 'fast', 'normal', or 'strong'

    # Get temperature
    temp_input = input("Temperature (0-1, default 0.7): ").strip()
    try:
        temperature = float(temp_input) if temp_input else 0.7
    except ValueError:
        temperature = 0.7

    print("\nReady! Type your message (or /bye to exit)\n")

    while True:
        try:
            user_input = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not user_input:
            continue

        # Handle commands
        if user_input.lower() == "/bye":
            print("Goodbye!")
            break
        elif user_input.lower() == "/fast":
            force_mode = "fast"
            print(f"→ Next query will use: {FAST_MODEL} (fast)")
            continue
        elif user_input.lower() == "/normal":
            force_mode = "normal"
            print(f"→ Next query will use: {NORMAL_MODEL} (normal)")
            continue
        elif user_input.lower() == "/strong":
            force_mode = "strong"
            print(f"→ Next query will use: {STRONG_MODEL} (strong)")
            continue
        elif user_input.lower() == "/auto":
            force_mode = None
            print("→ Automatic routing enabled")
            continue
        elif user_input.lower() == "/status":
            print(
                f"→ Current mode: {'Auto' if force_mode is None else force_mode.upper()}"
            )
            continue
        elif user_input.lower() == "/models":
            models = list_models()
            print("Available models:", ", ".join(models) if models else "None found")
            continue

        # Determine which model to use
        if force_mode:
            model_choice = force_mode
            force_mode = None  # Reset after use
        else:
            model_choice = classify_complexity(user_input)

        # Select model and message history based on tier
        if model_choice == "fast":
            model = FAST_MODEL
            messages = messages_fast
            tier_icon = "🚀"
        elif model_choice == "normal":
            model = NORMAL_MODEL
            messages = messages_normal
            tier_icon = "⚡"
        else:  # strong
            model = STRONG_MODEL
            messages = messages_strong
            tier_icon = "🧠"

        # Add user message
        messages.append({"role": "user", "content": user_input})

        # Show which model is being used
        print(f"[{tier_icon} {model}] ", end="", flush=True)

        try:
            ai_response = chat(
                messages, model=model, temperature=temperature, stream=True
            )
            messages.append({"role": "assistant", "content": ai_response})
        except requests.RequestException as e:
            print(f"\n❌ Error: {e}")
            print(f"   Make sure '{model}' is available (ollama list)")
            messages.pop()  # Remove failed user message


if __name__ == "__main__":
    main()
