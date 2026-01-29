"""
Smart Routing Client - AI-powered query classification.

A small model (qwen2.5:1.5b) analyzes each question and decides:
1. Which teacher model to use (quick/balanced/deep)
2. What temperature to use (based on creativity needs)

This is more intelligent than keyword-based routing because the AI
understands context, nuance, and intent.

Usage:
    python smart_router.py

Requires Ollama running locally with all models available.
"""

import json
import math
import re
import requests

OLLAMA_BASE_URL = "http://localhost:11434"

# Temperature distribution: Gaussian around 0.7
# This makes 0.7 most likely, with values tapering off toward extremes
TEMP_MEAN = 0.7
TEMP_SIGMA = 0.15  # Standard deviation - smaller = tighter around mean

# =============================================================================
# MODEL CONFIGURATION
# =============================================================================
ROUTER_MODEL = "qwen2.5:1.5b"  # Small, fast model for classification
FAST_MODEL = "quick-tutor"  # ~1GB - Snappy micro-learning
NORMAL_MODEL = "balanced-tutor"  # ~4GB - Socratic dialogue
STRONG_MODEL = "deep-tutor"  # ~9GB - Academic rigor

# Router system prompt
ROUTER_SYSTEM_PROMPT = """You are a query classifier. Analyze the user's question and decide:

1. DIFFICULTY (which teacher model to use):
   - "fast": Simple questions, greetings, quick facts, definitions, yes/no questions
   - "normal": General explanations, comparisons, "how does X work", basic coding
   - "strong": Complex reasoning, detailed analysis, debugging, multi-step problems, proofs, advanced topics

2. CREATIVITY (temperature 0.0 to 1.0):
   - 0.2-0.4: Factual questions, math, code, precise answers needed
   - 0.5-0.7: General explanations, balanced response
   - 0.8-1.0: Creative writing, brainstorming, open-ended exploration

Respond with ONLY a JSON object, no other text:
{"difficulty": "fast|normal|strong", "temperature": 0.0-1.0, "reason": "brief explanation"}

Examples:
User: "Hi!"
{"difficulty": "fast", "temperature": 0.7, "reason": "Simple greeting"}

User: "What is photosynthesis?"
{"difficulty": "fast", "temperature": 0.5, "reason": "Simple definition question"}

User: "Explain how photosynthesis works"
{"difficulty": "normal", "temperature": 0.6, "reason": "General explanation needed"}

User: "Explain the biochemical pathway of photosynthesis step by step with equations"
{"difficulty": "strong", "temperature": 0.4, "reason": "Complex scientific explanation with precise details"}

User: "Write a creative story about a robot"
{"difficulty": "normal", "temperature": 0.9, "reason": "Creative writing needs high temperature"}

User: "Debug this Python code: def foo(): return x"
{"difficulty": "strong", "temperature": 0.3, "reason": "Code debugging needs precision"}"""


def list_models() -> list[str]:
    """List all available models in local Ollama instance."""
    url = f"{OLLAMA_BASE_URL}/api/tags"
    try:
        response = requests.get(url)
        response.raise_for_status()
        return [m["name"] for m in response.json().get("models", [])]
    except requests.RequestException:
        return []


def generate_simple(
    prompt: str, model: str, system: str = "", temperature: float = 0.3
) -> str:
    """Generate a simple non-streaming response."""
    url = f"{OLLAMA_BASE_URL}/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "system": system,
        "temperature": temperature,
        "stream": False,
    }

    response = requests.post(url, json=payload)
    response.raise_for_status()
    return response.json().get("response", "")


def apply_gaussian_temperature(base_temp: float) -> float:
    """
    Transform temperature using Gaussian distribution around 0.7.

    This makes 0.7 the most likely value (peak of Gaussian), with
    temperatures tapering off toward extremes (0.0 or 1.0).

    The Gaussian is applied as a weight: values closer to 0.7 have higher
    probability of staying, while extreme values are "pulled" toward 0.7.

    Args:
        base_temp: Temperature suggested by the router (0.0-1.0)

    Returns:
        Adjusted temperature that prefers to be near 0.7
    """
    # Calculate how far this temperature is from the mean
    distance_from_mean = abs(base_temp - TEMP_MEAN)

    # Apply Gaussian weighting: exp(-distance²/(2*sigma²))
    # This creates a bell curve centered at TEMP_MEAN
    gaussian_weight = math.exp(-(distance_from_mean**2) / (2 * TEMP_SIGMA**2))

    # Blend the base temperature with the mean based on Gaussian weight
    # Higher weight = stay closer to base_temp
    # Lower weight = move toward mean (0.7)
    adjusted_temp = base_temp * gaussian_weight + TEMP_MEAN * (1 - gaussian_weight)

    # Clamp to valid range
    return max(0.0, min(1.0, adjusted_temp))


def classify_with_ai(user_prompt: str) -> dict:
    """
    Use the small router model to classify the query.
    Returns dict with 'difficulty', 'temperature', and 'reason'.
    Temperature is adjusted to follow Gaussian distribution around 0.7.
    """
    try:
        result = generate_simple(
            prompt=f"Classify this query:\n\n{user_prompt}",
            model=ROUTER_MODEL,
            system=ROUTER_SYSTEM_PROMPT,
            temperature=0.2,  # Low temp for consistent classification
        )

        # Parse JSON from response
        # Try to extract JSON from the response
        json_match = re.search(r"\{[^}]+\}", result)
        if json_match:
            parsed = json.loads(json_match.group())
            # Validate and normalize
            difficulty = parsed.get("difficulty", "normal").lower()
            if difficulty not in ["fast", "normal", "strong"]:
                difficulty = "normal"

            base_temperature = float(parsed.get("temperature", 0.7))
            base_temperature = max(0.0, min(1.0, base_temperature))  # Clamp to 0-1

            # Apply Gaussian distribution to prefer 0.7
            temperature = apply_gaussian_temperature(base_temperature)

            reason = parsed.get("reason", "AI classification")

            return {
                "difficulty": difficulty,
                "temperature": temperature,
                "reason": reason,
            }
    except (json.JSONDecodeError, requests.RequestException, ValueError) as e:
        print(f"  ⚠️ Router error: {e}, using fallback")

    # Fallback to normal with default temp
    return {
        "difficulty": "normal",
        "temperature": 0.7,
        "reason": "Fallback classification",
    }


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
    print("║       Smart Router - AI-Powered Query Classification          ║")
    print("╠════════════════════════════════════════════════════════════════╣")
    print(f"║  🔀 Router Model: {ROUTER_MODEL:<43} ║")
    print("╠════════════════════════════════════════════════════════════════╣")
    print(f"║  🚀 Fast Model:   {FAST_MODEL:<43} ║")
    print(f"║  ⚡ Normal Model: {NORMAL_MODEL:<43} ║")
    print(f"║  🧠 Strong Model: {STRONG_MODEL:<43} ║")
    print("╠════════════════════════════════════════════════════════════════╣")

    router_ok = any(ROUTER_MODEL.split(":")[0] in m for m in available)
    fast_ok = any(FAST_MODEL.split(":")[0] in m or FAST_MODEL in m for m in available)
    normal_ok = any(
        NORMAL_MODEL.split(":")[0] in m or NORMAL_MODEL in m for m in available
    )
    strong_ok = any(
        STRONG_MODEL.split(":")[0] in m or STRONG_MODEL in m for m in available
    )

    print(f"║  Router Available: {'✓ Yes' if router_ok else '✗ No':<42} ║")
    print(f"║  Fast Available:   {'✓ Yes' if fast_ok else '✗ No':<42} ║")
    print(f"║  Normal Available: {'✓ Yes' if normal_ok else '✗ No':<42} ║")
    print(f"║  Strong Available: {'✓ Yes' if strong_ok else '✗ No':<42} ║")
    print("╠════════════════════════════════════════════════════════════════╣")
    print("║  The router AI analyzes each question and decides:            ║")
    print("║  • Which teacher model is best suited                         ║")
    print("║  • What temperature (creativity level) to use                 ║")
    print("╠════════════════════════════════════════════════════════════════╣")
    print("║  Commands:                                                     ║")
    print("║    /fast   - Force next query to use fast model               ║")
    print("║    /normal - Force next query to use normal model             ║")
    print("║    /strong - Force next query to use strong model             ║")
    print("║    /auto   - Return to AI routing (default)                   ║")
    print("║    /temp X - Set fixed temperature (0.0-1.0)                  ║")
    print("║    /models - List available models                            ║")
    print("║    /bye    - Exit                                             ║")
    print("╚════════════════════════════════════════════════════════════════╝\n")

    missing = []
    if not router_ok:
        missing.append(f"  ollama pull {ROUTER_MODEL}")
    if not fast_ok:
        missing.append(
            f"  ollama pull qwen2.5:1.5b && ollama create {FAST_MODEL} -f Modelfile.fast"
        )
    if not normal_ok:
        missing.append(
            f"  ollama pull mistral && ollama create {NORMAL_MODEL} -f Modelfile.normal"
        )
    if not strong_ok:
        missing.append(
            f"  ollama pull qwen2.5:14b && ollama create {STRONG_MODEL} -f Modelfile.strong"
        )

    if missing:
        print("⚠️  Missing models. Run:")
        for cmd in missing:
            print(cmd)


def main():
    print_config()

    messages_fast = []  # Separate history for fast model
    messages_normal = []  # Separate history for normal model
    messages_strong = []  # Separate history for strong model

    force_mode = None  # None = AI routing, 'fast', 'normal', or 'strong'
    fixed_temp = None  # None = AI decides, or fixed value

    print("\nReady! The AI router will analyze each question.\n")

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
            fixed_temp = None
            print("→ AI routing enabled (model + temperature)")
            continue
        elif user_input.lower().startswith("/temp "):
            try:
                fixed_temp = float(user_input.split()[1])
                fixed_temp = max(0.0, min(1.0, fixed_temp))
                print(f"→ Fixed temperature: {fixed_temp}")
            except (IndexError, ValueError):
                print("→ Usage: /temp 0.7")
            continue
        elif user_input.lower() == "/models":
            models = list_models()
            print("Available models:", ", ".join(models) if models else "None found")
            continue

        # Classify with AI or use forced mode
        if force_mode:
            classification = {
                "difficulty": force_mode,
                "temperature": fixed_temp if fixed_temp is not None else 0.7,
                "reason": "Forced by user",
            }
            force_mode = None  # Reset after use
        else:
            print("  🔀 Analyzing query...", end=" ", flush=True)
            classification = classify_with_ai(user_input)
            print(f"[{classification['reason']}]")

        # Apply fixed temp if set
        if fixed_temp is not None:
            classification["temperature"] = fixed_temp

        # Select model and message history based on classification
        difficulty = classification["difficulty"]
        temperature = classification["temperature"]

        if difficulty == "fast":
            model = FAST_MODEL
            messages = messages_fast
            tier_icon = "🚀"
            tier_label = "fast"
        elif difficulty == "normal":
            model = NORMAL_MODEL
            messages = messages_normal
            tier_icon = "⚡"
            tier_label = "good"
        else:  # strong
            model = STRONG_MODEL
            messages = messages_strong
            tier_icon = "🧠"
            tier_label = "strong"

        # Add user message
        messages.append({"role": "user", "content": user_input})

        # Show which model and temperature is being used
        print(
            f"[{tier_icon} {tier_label} | {model} | temp={temperature:.1f}] ",
            end="",
            flush=True,
        )

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
