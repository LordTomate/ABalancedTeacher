"""
Web UI for ABalancedTeacher - Graphical frontend using Gradio.

A beautiful chat interface that shows:
- Which model tier is being used (fast/good/strong)
- Temperature selection with Gaussian distribution
- Real-time streaming responses
- Conversation history

Usage:
    pip install gradio
    python web_ui.py

Then open http://localhost:7860 in your browser.
"""

import json
import math
import re
import requests
import gradio as gr

OLLAMA_BASE_URL = "http://localhost:11434"

# =============================================================================
# MODEL CONFIGURATION
# =============================================================================
ROUTER_MODEL = "qwen2.5:1.5b"
FAST_MODEL = "quick-tutor"
NORMAL_MODEL = "balanced-tutor"
STRONG_MODEL = "deep-tutor"

# Temperature distribution: Gaussian around 0.7
TEMP_MEAN = 0.7
TEMP_SIGMA = 0.15

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
{"difficulty": "fast|normal|strong", "temperature": 0.0-1.0, "reason": "brief explanation"}"""


def apply_gaussian_temperature(base_temp: float) -> float:
    """Apply Gaussian distribution to temperature, centered at 0.7."""
    distance_from_mean = abs(base_temp - TEMP_MEAN)
    gaussian_weight = math.exp(-(distance_from_mean**2) / (2 * TEMP_SIGMA**2))
    adjusted_temp = base_temp * gaussian_weight + TEMP_MEAN * (1 - gaussian_weight)
    return max(0.0, min(1.0, adjusted_temp))


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
    response = requests.post(url, json=payload, timeout=30)
    response.raise_for_status()
    return response.json().get("response", "")


def classify_with_ai(user_prompt: str) -> dict:
    """Use the router model to classify the query."""
    try:
        result = generate_simple(
            prompt=f"Classify this query:\n\n{user_prompt}",
            model=ROUTER_MODEL,
            system=ROUTER_SYSTEM_PROMPT,
            temperature=0.2,
        )

        json_match = re.search(r"\{[^}]+\}", result)
        if json_match:
            parsed = json.loads(json_match.group())
            difficulty = parsed.get("difficulty", "normal").lower()
            if difficulty not in ["fast", "normal", "strong"]:
                difficulty = "normal"

            base_temperature = float(parsed.get("temperature", 0.7))
            base_temperature = max(0.0, min(1.0, base_temperature))
            temperature = apply_gaussian_temperature(base_temperature)
            reason = parsed.get("reason", "AI classification")

            return {
                "difficulty": difficulty,
                "temperature": temperature,
                "reason": reason,
            }
    except Exception as e:
        print(f"Router error: {e}")

    return {"difficulty": "normal", "temperature": 0.7, "reason": "Fallback"}


def chat_stream(messages: list[dict], model: str, temperature: float):
    """Stream chat response from Ollama."""
    url = f"{OLLAMA_BASE_URL}/api/chat"
    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "stream": True,
    }

    response = requests.post(url, json=payload, stream=True, timeout=120)
    response.raise_for_status()

    for line in response.iter_lines():
        if line:
            data = json.loads(line)
            chunk = data.get("message", {}).get("content", "")
            if chunk:
                yield chunk
            if data.get("done"):
                break


def get_tier_info(difficulty: str) -> tuple[str, str, str]:
    """Get emoji, label, and model for the difficulty tier."""
    tiers = {
        "fast": ("🚀", "fast", FAST_MODEL),
        "normal": ("⚡", "good", NORMAL_MODEL),
        "strong": ("🧠", "strong", STRONG_MODEL),
    }
    return tiers.get(difficulty, tiers["normal"])


# Conversation histories for each tier
histories = {"fast": [], "normal": [], "strong": []}


def respond(
    message: str, chat_history: list, force_mode: str, fixed_temp: float | None
):
    """Process user message and generate response."""
    if not message.strip():
        return "", chat_history, ""

    # Classify or use forced mode
    if force_mode != "Auto":
        difficulty = force_mode.lower()
        temperature = fixed_temp if fixed_temp else 0.7
        reason = f"Forced: {force_mode}"
    else:
        classification = classify_with_ai(message)
        difficulty = classification["difficulty"]
        temperature = fixed_temp if fixed_temp else classification["temperature"]
        reason = classification["reason"]

    emoji, label, model = get_tier_info(difficulty)

    # Build info string
    info = f"{emoji} **{label}** | `{model}` | temp={temperature:.2f}\n\n_{reason}_"

    # Get message history for this tier
    tier_history = histories[difficulty]
    tier_history.append({"role": "user", "content": message})

    # Stream the response
    chat_history.append((message, ""))
    full_response = ""

    try:
        for chunk in chat_stream(tier_history, model, temperature):
            full_response += chunk
            chat_history[-1] = (message, full_response)
            yield "", chat_history, info

        tier_history.append({"role": "assistant", "content": full_response})
    except Exception as e:
        error_msg = f"❌ Error: {str(e)}\n\nMake sure Ollama is running and the model `{model}` is available."
        chat_history[-1] = (message, error_msg)
        yield "", chat_history, info

    yield "", chat_history, info


def clear_all():
    """Clear all conversation histories."""
    global histories
    histories = {"fast": [], "normal": [], "strong": []}
    return [], ""


# Build the Gradio interface
with gr.Blocks(
    title="ABalancedTeacher",
    theme=gr.themes.Soft(primary_hue="blue"),
    css="""
    .tier-info {
        padding: 10px;
        border-radius: 8px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        margin-bottom: 10px;
    }
    .header {
        text-align: center;
        margin-bottom: 20px;
    }
    """,
) as demo:
    gr.Markdown(
        """
        # 🎓 ABalancedTeacher
        ### AI-Powered Three-Tier Teaching System
        
        Ask any question! The AI router will automatically select the best teacher and creativity level.
        
        | 🚀 Fast | ⚡ Good | 🧠 Strong |
        |---------|---------|-----------|
        | Quick facts | General explanations | Complex reasoning |
        """,
        elem_classes="header",
    )

    with gr.Row():
        with gr.Column(scale=4):
            chatbot = gr.Chatbot(
                label="Conversation",
                height=500,
                show_copy_button=True,
                avatar_images=(
                    None,
                    "https://em-content.zobj.net/source/apple/391/owl_1f989.png",
                ),
            )

            with gr.Row():
                msg = gr.Textbox(
                    label="Your question",
                    placeholder="Ask anything... (Press Enter to send)",
                    scale=5,
                    show_label=False,
                )
                send_btn = gr.Button("Send", variant="primary", scale=1)

        with gr.Column(scale=1):
            gr.Markdown("### ⚙️ Controls")

            info_display = gr.Markdown(
                value="_Waiting for your first question..._",
                label="Current Model",
            )

            force_mode = gr.Radio(
                choices=["Auto", "Fast", "Normal", "Strong"],
                value="Auto",
                label="Model Selection",
                info="Auto = AI decides, or force a specific tier",
            )

            use_fixed_temp = gr.Checkbox(label="Override Temperature", value=False)
            fixed_temp = gr.Slider(
                minimum=0.0,
                maximum=1.0,
                value=0.7,
                step=0.05,
                label="Fixed Temperature",
                visible=False,
            )

            use_fixed_temp.change(
                fn=lambda x: gr.update(visible=x),
                inputs=use_fixed_temp,
                outputs=fixed_temp,
            )

            clear_btn = gr.Button("🗑️ Clear Chat", variant="secondary")

            gr.Markdown(
                """
                ### 📊 Temperature Guide
                - **0.2-0.4**: Precise (math, code)
                - **0.5-0.7**: Balanced
                - **0.8-1.0**: Creative
                
                _Default uses Gaussian around 0.7_
                """
            )

    # Event handlers
    def get_temp_value(use_fixed: bool, temp: float) -> float | None:
        return temp if use_fixed else None

    msg.submit(
        fn=respond,
        inputs=[msg, chatbot, force_mode, fixed_temp],
        outputs=[msg, chatbot, info_display],
    )

    send_btn.click(
        fn=respond,
        inputs=[msg, chatbot, force_mode, fixed_temp],
        outputs=[msg, chatbot, info_display],
    )

    clear_btn.click(fn=clear_all, outputs=[chatbot, info_display])

    gr.Markdown(
        """
        ---
        **Tips**: 
        - Each tier maintains its own conversation history
        - Try forcing different tiers to see how teaching styles differ
        - Use low temperature for facts, high for creativity
        
        [GitHub](https://github.com/LordTomate/ABalancedTeacher) | Made with ❤️ using Ollama & Gradio
        """
    )


if __name__ == "__main__":
    print("\n🎓 Starting ABalancedTeacher Web UI...")
    print("📍 Open http://localhost:7860 in your browser\n")
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False,
    )
