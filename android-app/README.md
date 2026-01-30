# 🎓 ABalancedTeacher - Android App

A full-featured Android app for the AI-Powered Three-Tier Teaching System. Chat with intelligent AI tutors that automatically adapt their teaching style and response creativity based on your questions.

## ✨ Features

- **🔀 Smart Routing**: AI automatically selects the best teaching model for each question
- **🎨 Adaptive Temperature**: Creativity level adjusts based on question type
- **💬 Beautiful Chat Interface**: Clean, modern UI with markdown support
- **📚 Conversation History**: Save and revisit past conversations
- **⚙️ Fully Configurable**: Set server URL, models, and routing preferences
- **📱 Native Android**: Built with React Native for smooth performance

## 🚀 Quick Start

### Prerequisites

1. **Node.js** (v18 or newer)
2. **Java Development Kit** (JDK 17)
3. **Android Studio** with:
   - Android SDK (API 34)
   - Android SDK Build-Tools
   - Android Emulator (or a physical device)
4. **Ollama** running on your computer with the tutor models

### Step 1: Install Dependencies

```bash
cd android-app
npm install
```

### Step 2: Set Up Android Development

#### Option A: Using Android Studio (Recommended)
1. Download and install [Android Studio](https://developer.android.com/studio)
2. Open Android Studio → SDK Manager
3. Install Android SDK Platform 34
4. Install Android SDK Build-Tools 34.0.0
5. Install Android Emulator
6. Create a virtual device (Pixel 6 recommended)

#### Option B: Command Line Only
```bash
# On Ubuntu/Debian
sudo apt install openjdk-17-jdk

# Set ANDROID_HOME
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Step 3: Start the Metro Bundler

```bash
npm start
```

### Step 4: Run on Android

In a new terminal:
```bash
npm run android
```

Or open the `android` folder in Android Studio and click "Run".

---

## 📲 Building a Release APK

### Step 1: Generate a Signing Key (First time only)

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

### Step 2: Configure Signing

Create `android/keystore.properties`:
```properties
storePassword=your-store-password
keyPassword=your-key-password
keyAlias=my-key-alias
storeFile=my-release-key.keystore
```

Update `android/app/build.gradle` to use the keystore for release builds.

### Step 3: Build the APK

```bash
cd android
./gradlew assembleRelease
```

The APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

### Step 4: Install on Your Phone

1. Transfer the APK to your phone
2. Enable "Install from unknown sources" in Settings
3. Open the APK file to install

---

## 🔧 Configuration

### Connecting to Ollama

The app needs to connect to your Ollama server. In the Settings tab:

1. **Android Emulator**: Use `http://10.0.2.2:11434` (default)
2. **Physical Device**: Use your computer's IP address, e.g., `http://192.168.1.100:11434`

### Finding Your IP Address

```bash
# Linux
ip addr show | grep inet

# macOS
ifconfig | grep inet

# Windows
ipconfig
```

### Model Configuration

Ensure these models are available in Ollama:
- `qwen2.5:1.5b` - Router model
- `quick-tutor` - Fast tier
- `balanced-tutor` - Normal tier
- `deep-tutor` - Strong tier

Create the tutor models using the Modelfiles in the parent directory:
```bash
ollama create quick-tutor -f ../Modelfile.fast
ollama create balanced-tutor -f ../Modelfile.normal
ollama create deep-tutor -f ../Modelfile.strong
```

---

## 🏗️ Project Structure

```
android-app/
├── android/                 # Native Android project
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/       # Kotlin/Java code
│   │   │   ├── res/        # Resources (icons, layouts)
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   └── build.gradle
├── src/
│   ├── App.js              # Main app with navigation
│   ├── screens/
│   │   ├── ChatScreen.js   # Main chat interface
│   │   ├── HistoryScreen.js # Saved conversations
│   │   └── SettingsScreen.js # Configuration
│   ├── context/
│   │   ├── ChatContext.js  # Chat state management
│   │   └── SettingsContext.js # Settings management
│   └── services/
│       └── apiService.js   # Ollama API communication
├── index.js                # Entry point
├── package.json
└── README.md
```

---

## 🐛 Troubleshooting

### "Network request failed"
- Check that Ollama is running: `ollama list`
- Verify the server URL in Settings
- For emulator: Use `10.0.2.2` instead of `localhost`
- For physical device: Use your computer's actual IP
- Ensure firewall allows connections to port 11434

### "Model not found"
- Pull or create the required models:
  ```bash
  ollama pull qwen2.5:1.5b
  ollama create quick-tutor -f Modelfile.fast
  ```

### Build Errors
- Clean and rebuild:
  ```bash
  cd android
  ./gradlew clean
  cd ..
  npm start -- --reset-cache
  npm run android
  ```

### Metro Bundler Issues
```bash
# Clear cache and restart
npm start -- --reset-cache
```

---

## 📱 Screenshots

The app includes:
- **Chat Tab**: Full-featured chat with model tier indicators
- **History Tab**: Browse and reload past conversations
- **Settings Tab**: Configure server connection and model preferences

---

## 🔒 Security Notes

- The app uses cleartext traffic (`http://`) for local Ollama connections
- For production use with remote servers, configure HTTPS
- API keys are stored locally using AsyncStorage

---

## 📝 License

MIT License - See the main project README for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

Made with ❤️ using React Native and Ollama
