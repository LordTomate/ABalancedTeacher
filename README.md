# ABalancedTeacher - Three-Tier AI Teaching System

An intelligent routing system that automatically selects the best AI teacher for your question based on complexity. Three distinct teaching personalities work together to provide the optimal learning experience.

## 🎓 The Three Teachers

| Teacher | Base Model | Size | Personality | Best For |
|---------|-----------|------|-------------|----------|
| **Quick Tutor** | qwen2.5:1.5b | ~1GB | ⚡ Snappy, energetic, micro-learning | Quick facts, definitions, mnemonics |
| **Balanced Tutor** | mistral | ~4GB | 💬 Warm, Socratic, conversational | General explanations, guided discovery |
| **Deep Tutor** | qwen2.5:14b | ~9GB | 🧠 Rigorous, academic mentor | Complex topics, in-depth analysis |

### Teacher Characteristics

#### ⚡ Quick Tutor
- **Style**: Flash-card format with memorable sound bites
- **Temperature**: 0.5 (focused and consistent)
- **Max Response**: 512 tokens
- **Format**: Core Answer → Quick Example → Check Question
- **Perfect for**: "What is DNA?", "Define photosynthesis", "List 3 examples"

#### 💬 Balanced Tutor  
- **Style**: Socratic dialogue, builds on what you know
- **Temperature**: 0.7 (natural conversation)
- **Approach**: Sandwich method (affirm → expand → encourage)
- **Perfect for**: "Explain how X works", "Compare A and B", "Why does Y happen?"

#### 🧠 Deep Tutor
- **Style**: University-level depth with multiple perspectives
- **Temperature**: 0.75 (nuanced analysis)
- **Max Response**: 4096 tokens
- **Structure**: Overview → Core Explanation → Edge Cases → Resources → Challenge
- **Perfect for**: "Explain in detail...", "Step by step...", "Prove that...", Complex debugging

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- At least 10GB free disk space
- 16GB+ RAM recommended (8GB minimum)

### 1. Install Ollama

#### Linux
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

#### macOS
```bash
brew install ollama
```

#### Windows
Download from [ollama.com/download](https://ollama.com/download)

### 2. Start Ollama Server

```bash
ollama serve
```

Keep this terminal running. Open a new terminal for the next steps.

### 3. Pull Base Models

```bash
# Pull all three base models (this will take some time)
ollama pull qwen2.5:1.5b   # ~1GB download
ollama pull mistral         # ~4GB download  
ollama pull qwen2.5:14b     # ~9GB download
```

**Note**: You can start with just one or two models if you have limited bandwidth or disk space.

### 4. Create the Teacher Models

```bash
cd /path/to/ABalancedTeacher

# Create all three teacher models
ollama create quick-tutor -f Modelfile.fast
ollama create balanced-tutor -f Modelfile.normal
ollama create deep-tutor -f Modelfile.strong
```

### 5. Install Python Dependencies

```bash
pip install requests
```

### 6. Run the Routing Client

```bash
python routing_client.py
```

## 📖 Usage

### Basic Usage

```bash
$ python routing_client.py
Temperature (0-1, default 0.7): [press Enter]
Ready! Type your message (or /bye to exit)

You: What is DNA?
[🚀 quick-tutor] 📌 DNA is the molecule...
```

### Commands

| Command | Description |
|---------|-------------|
| `/fast` | Force next query to use Quick Tutor |
| `/normal` | Force next query to use Balanced Tutor |
| `/strong` | Force next query to use Deep Tutor |
| `/auto` | Return to automatic routing (default) |
| `/status` | Show current routing mode |
| `/models` | List available models |
| `/bye` | Exit the program |

### Examples

```
Simple query → Routes to Quick Tutor:
You: Define photosynthesis

Medium query → Routes to Balanced Tutor:
You: Explain how photosynthesis works

Complex query → Routes to Deep Tutor:
You: Explain in detail the biochemical pathway of photosynthesis step by step
```

## 🎯 How Routing Works

The system automatically analyzes your question and routes to the appropriate teacher:

### Routes to Quick Tutor (Fast)
- Greetings: "hi", "hello", "thanks"
- Short questions (< 10 words)
- Simple definitions: "What is X?"
- Quick lists: "Name 3 examples"

### Routes to Balanced Tutor (Normal)
- General explanations: "explain", "why", "how does"
- Comparisons: "compare A and B"
- Basic code questions
- Medium-length queries (10-100 words)

### Routes to Deep Tutor (Strong)
- Detailed requests: "explain in detail", "step by step"
- Advanced topics: "algorithm", "architecture", "mathematical"
- Code debugging: "debug", "fix this code", "review my code"
- Multiple questions or complex code blocks
- Very long queries (100+ words)

## 🔧 Customization

### Change Models

Edit the model configuration in `routing_client.py`:

```python
FAST_MODEL = "quick-tutor"      # Change to any fast model
NORMAL_MODEL = "balanced-tutor"  # Change to any medium model
STRONG_MODEL = "deep-tutor"      # Change to any strong model
```

### Modify Teacher Personalities

Edit the Modelfiles to customize teaching styles:

- `Modelfile.fast` - Quick Tutor personality
- `Modelfile.normal` - Balanced Tutor personality  
- `Modelfile.strong` - Deep Tutor personality

After editing, recreate the models:
```bash
ollama create quick-tutor -f Modelfile.fast
```

### Adjust Temperature

When starting the client, enter a different temperature (0-1):
- Lower (0.3-0.5): More focused and deterministic
- Medium (0.6-0.8): Balanced creativity
- Higher (0.9-1.0): More creative and varied

## 📊 System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 8GB | 16GB+ |
| Disk Space | 10GB | 20GB+ |
| GPU VRAM | Not required | 8GB+ (faster inference) |

### Model Requirements

| Model | Download | Disk Space | RAM Usage |
|-------|----------|------------|-----------|
| Quick Tutor | ~600MB | ~1GB | ~2GB |
| Balanced Tutor | ~2.5GB | ~4GB | ~6GB |
| Deep Tutor | ~5GB | ~9GB | ~12GB |

**CPU-only mode**: Works fine but slower. GPU recommended for Deep Tutor.

## 🐛 Troubleshooting

### "Connection refused" error
```bash
# Make sure Ollama server is running
ollama serve
```

### "Model not found" error
```bash
# List available models
ollama list

# If models are missing, recreate them
ollama create quick-tutor -f Modelfile.fast
ollama create balanced-tutor -f Modelfile.normal
ollama create deep-tutor -f Modelfile.strong
```

### Slow responses
- Try using smaller models (Quick or Balanced Tutor)
- Close other applications to free up RAM
- Consider using GPU if available

### Out of memory
- Start with only Quick Tutor (`ollama pull qwen2.5:1.5b`)
- Use `/fast` command to force lightweight model
- Close unnecessary applications

## 🎓 Learning Tips

1. **Start Simple**: Begin with Quick Tutor to get fast overviews
2. **Build Understanding**: Move to Balanced Tutor for deeper exploration
3. **Master Topics**: Use Deep Tutor for comprehensive understanding
4. **Experiment**: Try forcing different teachers with commands to see how they differ
5. **Ask Follow-ups**: Each teacher maintains conversation history

## 📝 Project Structure

```
ABalancedTeacher/
├── README.md                 # This file
├── routing_client.py         # Main application
├── Modelfile.fast           # Quick Tutor configuration
├── Modelfile.normal         # Balanced Tutor configuration
└── Modelfile.strong         # Deep Tutor configuration
```

## 🤝 Contributing

To modify the teaching styles:

1. Edit the relevant Modelfile
2. Recreate the model: `ollama create <name> -f Modelfile.<type>`
3. Test with the routing client

## 📚 References

- **Ollama**: [ollama.com](https://ollama.com)
- **LM Arena**: Rankings for model performance
- **Qwen2.5**: Alibaba's high-performing language models
- **Mistral**: Efficient 7B parameter model

## 📄 License

This project uses open-source models. Check individual model licenses:
- Qwen2.5: Apache 2.0
- Mistral: Apache 2.0

## 🔮 Future Ideas

- [ ] Add voice input/output
- [ ] Save conversation history
- [ ] Export learning notes
- [ ] Multi-language support
- [ ] Web interface
- [ ] Fine-tune for specific subjects

---

**Version**: 1.0.0  
**Last Updated**: January 29, 2026

For questions or issues, refer to the [Ollama Documentation](https://github.com/ollama/ollama).
# ABalancedTeacher
