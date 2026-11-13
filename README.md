# Edge AI

A Chrome extension for real-time translation and transcription with AI-powered features.

## Features

- 🎯 Real-time subtitle translation
- 🌐 Multi-language support
- 🤖 AI-powered transcription
- 🎨 Clean, intuitive UI
- ⚡ Lightweight and fast

## Project Structure

```
Edge AI/
├── extension/          # Chrome extension source
│   ├── src/
│   │   ├── manifest.json
│   │   ├── popup/      # UI components
│   │   ├── content.js  # Content script
│   │   └── ...
│   └── tests/
├── backend/            # Backend services
├── docs/               # Documentation
├── src/                # Frontend source
│   ├── components/
│   ├── utils/
│   └── styles/
├── assets/             # Static assets
│   ├── images/
│   └── icons/
├── config/             # Configuration files
├── examples/           # Usage examples
└── tests/              # Test suites
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Chrome browser
- Python 3.8+ (for backend)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/RUSHI-KOLLA/edge_AI.git
cd edge_AI
```

2. Install dependencies:
```bash
npm install
```

3. Load the extension in Chrome:
   - Open Chrome
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `extension/src` folder

## Development

### Running Tests
```bash
npm test
```

### Building
```bash
npm run build
```

### Linting
```bash
npm run lint
```

## Architecture

The project follows a modular architecture:

- **Extension Layer**: Chrome extension with popup UI and content scripts
- **Service Layer**: Background services and API integrations
- **UI Layer**: React components for the popup interface
- **Utility Layer**: Shared utilities and helpers

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Thanks to all contributors
- Built with ❤️ using modern web technologies

---

**Note**: The `extension/` directory contains the core UI code that is actively maintained. All other directories contain supporting code, documentation, and utilities.
