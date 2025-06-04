# 🎯 Interactive Word Spelling Game

A fun and educational web-based spelling game designed for young learners. Kids practice spelling by filling in missing letters while getting high-quality audio pronunciation and helpful hints.

## 🌟 Latest Features

### 🎮 Core Gameplay
- **Interactive Spelling**: Fill in missing letters directly within the word display
- **Professional Audio**: High-quality dictionary pronunciation from internet with US preference + computer voice fallback
- **Smart Hints**: Example sentences with target word hidden for contextual learning
- **Visual Error Comparison**: See exactly which letters were wrong with highlighted differences
- **Unified Enter Controls**: Consistent Enter-to-continue for both correct and incorrect answers

### 🎚️ Difficulty Levels
Choose from 3 difficulty levels:
- **Easy**: 50% missing letters (default)
- **Medium**: 75% missing letters
- **🔥 NIGHTMARE 🔥**: 100% missing letters (ultimate challenge!)

### 📚 Educational Features
- **Dual Data Sources**: Local CSV files or Google Sheets with advanced filtering
- **Contextual Learning**: Example sentences with target word hidden for better understanding
- **Visual Error Analysis**: Side-by-side comparison showing user's attempt vs. correct spelling
- **Smart Mistake Highlighting**: Incorrect letters highlighted in bold red for easy identification
- **Internet-Based Audio**: Crystal-clear pronunciation from online services (primarily Google TTS, with dictionaryapi.dev as a fallback) with smart caching
- **Enhanced Mistake Learning**: Big, glowing display of correct spelling for better memory retention
- **Bulletproof Retry System**: Practice only words you got wrong - no cheating possible!
- **Word Count Selection**: Choose how many words to practice (appears for 30+ word lists)
- **Advanced Filtering**: Filter by date range, grade, and source (Google Sheets only)

### ⌨️ Full Keyboard Control
- **Space Bar**: Repeat word audio (no mouse needed!)
- **Enter**: Submit answers AND continue after both correct and incorrect answers
- **Backspace**: Navigate between input fields
- **Complete keyboard workflow**: Play entire game without touching mouse

### 🎨 User Experience
- **Clean Interface**: Removed clutter, streamlined design focused on learning
- **Superior Audio Quality**: Internet-based pronunciation much clearer than computer voice, with instant cached replay
- **Auto-Focus**: Smart input field management with focus restoration
- **Visual Feedback**: Animated correct answers with green glow, detailed error comparisons
- **Responsive**: Works on desktop and mobile devices
- **Robust CSV Support**: Handles commas in descriptions properly

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Python 3.x (for running the local server)

### Installation & Setup

1. **Clone or Download** the project files to your computer

2. **Navigate** to the project directory:
   ```bash
   cd word_game
   ```

3. **Start the web server**:
   ```bash
   python3 server.py
   ```

4. **Open your browser** and go to:
   ```
   http://localhost:8000
   ```

5. **Access from other devices** (phones, tablets, other computers):
   - The server will display your network IP address when it starts
   - Use that IP address from other devices on the same network
   - Example: `http://192.168.31.11:8000/`

6. **Start playing!** 🎉

## 📖 How to Play

### 1. **Choose Your Data Source**
- **📁 Local CSV File**: Use the default word list (words.csv)
- **📊 Google Sheets**: Load words from your own Google Sheet

### 2. **Filter Your Words** (Google Sheets only)
- **📅 Date Range**: Filter words by date range (from/to)
- **🎓 Grade**: Select specific grades to practice
- **📚 Source**: Choose words from specific sources
- Real-time filtering with word count updates

### 3. **Choose Your Settings**
- Select from 3 difficulty levels
- Choose word count (if more than 30 words available)
- Higher levels show fewer letters

### 4. **Spell the Words**
- Listen to crystal-clear internet-based pronunciation (much better than computer voice!)
- Read the example sentence with the target word hidden (_____)
- Use context clues to understand the word's meaning
- Click in the gaps and type missing letters
- Press **Space bar** to repeat audio anytime (instant replay from cache)

### 5. **Submit Your Answer**
- Press **Enter** when ready to check spelling
- ✅ **Correct answers**: See green glowing "Correct!" message
- ❌ **Incorrect answers**: See side-by-side comparison with highlighted differences
- **Always press Enter again** to continue to the next word (consistent for both correct and incorrect)

### 6. **Review & Retry**
- See your final score with clean progress display
- Press **Enter** to quickly retry incorrect words
- Keep practicing until you master them all!

## 📁 File Structure

```
word_game/
├── index.html          # Main game interface
├── js/                   # Main JavaScript directory
│   ├── core.js           # Core application logic
│   ├── app/              # Application-level setup, configuration
│   ├── audio/            # Audio management and TTS providers
│   ├── data/             # Data fetching and processing (CSV, Google Sheets)
│   ├── game/             # Game logic, word handling, scoring
│   ├── ui/               # User interface management, components
│   └── utils/            # Utility functions
├── words.csv           # Word list with descriptions (CSV format)
├── server.py           # Simple HTTP server
└── README.md           # This file
```

## 🎨 Customizing Words

### Local CSV File
Edit `words.csv` to add your own words with the 6-column format:

```csv
word,date,grade,source,Example sentence,description
cat,2024-01-15,2,phonics,The cat sat on the mat,A small furry animal that says meow
dog,2024-01-15,2,phonics,"My dog loves to play fetch, and he wags his tail",A friendly animal that barks and loves to play
elephant,2024-01-16,3,animals,The elephant has a long trunk and big ears,A huge gray animal
```

**Note**: The local CSV now uses the same 6-column format as Google Sheets for consistent filtering and features.

### Google Sheets Integration
Use Google Sheets for collaborative word management:

1. **Create a Google Sheet** with these columns:
   ```
   word | date | grade | source | example sentence | description
   ```

2. **Make it public**:
   - Click "Share" → "Change to anyone with the link"
   - Set permission to "Viewer"

3. **Copy the URL** and paste it into the game

**Default Sample Sheet:**
The game comes pre-loaded with a sample Google Sheet:
```
https://docs.google.com/spreadsheets/d/1D7-Ny0FuD4w3inEi_lt-kpv7M0f7d0shnmS5TpiWdl0/edit?gid=0#gid=0
```
You can use this immediately or replace it with your own sheet URL.

**Example Google Sheets format:**
```
word     | date       | grade | source  | example sentence              | description
cat      | 2024-01-15 | 2     | phonics | The cat sat on the mat        | (for future use)
dog      | 2024-01-15 | 2     | phonics | My dog loves to play fetch    | (for future use)
elephant | 2024-01-16 | 3     | animals | The elephant has a long trunk | (for future use)
```

**Format Notes:**
- **Required columns**: `word` and `example sentence` (others are optional)
- **Example sentences**: The target word will be hidden with underscores during gameplay
- **Description column**: Currently unused, reserved for future features
- Use quotes around text containing commas
- Keep words age-appropriate for your target audience
- Make example sentences clear and contextual

## 🎯 Educational Benefits

### For Kids:
- **Enhanced Spelling Practice**: Reinforces correct letter patterns with visual memory
- **Vocabulary Growth**: Learn word meanings through contextual example sentences
- **Phonics Skills**: High-quality audio helps with sound-letter relationships
- **Visual Learning**: See exactly which letters were wrong with highlighted comparisons
- **Confidence Building**: Progressive difficulty and comprehensive retry system
- **Self-Paced Learning**: No time pressure, consistent Enter-to-continue controls
- **Keyboard Skills**: Full keyboard control builds typing confidence
- **Mistake Analysis**: Clear visual feedback helps understand and remember corrections

### For Parents/Teachers:
- **Adaptive Difficulty**: Adjust challenge level as skills improve
- **Flexible Sessions**: Choose word count for time management
- **Progress Tracking**: See which words need more practice
- **Engagement**: Interactive format with professional audio keeps kids interested
- **Educational Value**: Screen time that actually teaches important skills

## 🛠️ Technical Features

- **Unified Data Processing**: Both local CSV and Google Sheets use identical parsing for consistent experience
- **Example Sentences**: Contextual learning with target word hidden in example sentences
- **Visual Error Analysis**: Side-by-side comparison with highlighted incorrect letters
- **Pre-configured Sample**: Comes with a ready-to-use Google Sheet for immediate play
- **Advanced Filtering**: Filter words by date range, grade, and source (works for both data sources)
- **Real-time Updates**: Word count and selections update instantly as filters change
- **Internet-Based Audio**: Dictionary API (dictionaryapi.dev) with US pronunciation preference for superior quality
- **Smart Audio System**: 3-second timeout with instant fallback to computer voice if internet unavailable
- **Performance Caching**: Audio URLs cached for instant replay without re-downloading
- **Robust CSV Parsing**: Handles complex descriptions with commas and quotes
- **Bulletproof Scoring**: Impossible to cheat or get incorrect statistics
- **Clean Interface**: Streamlined design focused on learning
- **Full Keyboard Support**: Complete game playable without mouse
- **Responsive Design**: Works on tablets, phones, and computers
- **Hybrid Audio**: Best of both worlds - internet quality with offline reliability
- **Cross-Browser**: Compatible with all modern browsers
- **Testing Framework**: Utilizes Vitest for unit and integration testing.

## 🎨 Customization

### Styling
- Edit CSS in `index.html` to change colors, fonts, or layout
- Current theme: Purple background with white text for high contrast

### Difficulty Levels
- Modify percentage values in `script.js` to adjust difficulty
- Add or remove levels as needed

### Audio Settings
- Internet-based services (Google TTS and Dictionary API) provide crystal-clear professional pronunciation
- Smart fallback to computer speech with adjustable rate, pitch, and volume
- Cached for performance with 3-second timeout for reliability

## 🐛 Known Behavior & Bug Fixes

- **Smart Audio Fallback**: Seamlessly switches to computer voice if internet/dictionary API unavailable
- **CSV Flexibility**: Supports both simple and complex description formats
- **Consistent Experience**: Local and online data sources now have identical functionality

## 🔧 Network Troubleshooting

If you can't access the game from other devices:

### **Quick Diagnostics**
Run the network checker:
```bash
python3 network_check.py
```

### **Common Solutions**
1. **Firewall Issues**:
   - **macOS**: System Preferences → Security & Privacy → Firewall → Allow Python
   - **Windows**: Windows Defender → Allow an app → Add Python
   - **Linux**: `sudo ufw allow 8000` or disable firewall temporarily

2. **Network Issues**:
   - Ensure all devices are on the same WiFi network
   - Check if your router blocks device-to-device communication
   - Try accessing from the same computer first (`http://localhost:8000`)

3. **Port Issues**:
   - If port 8000 is busy, the server will show an error
   - Change the PORT variable in `server.py` to use a different port

### **Testing Steps**
1. ✅ Access works locally: `http://localhost:8000`
2. ✅ Server shows network IP when starting
3. ✅ Other device on same WiFi network
4. ✅ Use the exact IP shown by server
5. ✅ Firewall allows Python/port 8000

## 🤝 Contributing

This is an educational project perfect for:
- Adding more words to the CSV file
- Improving the styling and user interface
- Adding new educational features
- Sharing with other educators and parents

## 📄 License

This project is open source and available for educational use.

## 🎉 Acknowledgments

Created with love for young learners everywhere! Special thanks to:
- Google TTS & Dictionary API (dictionaryapi.dev) for high-quality pronunciation
- All the kids who will use this to improve their spelling skills
- Parents and teachers who make learning fun

---

**Happy Spelling!** 📚✨🎯

### 🔄 Version History
- **v2.7 (Recent Updates)**:
  - ✨ Major JavaScript modularization for improved organization and maintainability (see new File Structure).
  - 🔊 Enhanced online audio: Google TTS is now the primary source, with Dictionary API as a fallback.
  - 🧪 Integrated Vitest for JavaScript testing.
  - 🛠️ Added basic engineer commands (details might be project-specific).
  - 🐞 Numerous bug fixes including focus issues, audio playback, and UI interactions.
- **v2.6**: Unified Enter-to-continue logic and visual error comparison system
  - ✅ Fixed skip-word bug with consistent Enter controls for all answers
  - ✅ Added side-by-side comparison showing user attempt vs. correct spelling
  - ✅ Highlighted incorrect letters in bold red for easy identification
  - ✅ Unified data processing for local CSV and Google Sheets
  - ✅ Enhanced visual feedback with animated correct answer displays
- **v2.5**: Unified data source parsing for consistent local/online experience
- **v2.4**: Example sentence support with hidden target words for contextual learning
- **v2.3**: Network accessibility and pre-filled default Google Sheets URL
- **v2.2**: Advanced filtering system for Google Sheets (date, grade, source filters)
- **v2.1**: Google Sheets integration with dual data source selection
- **v2.0**: Enhanced audio system with dictionary API and caching
- **v1.9**: Full keyboard control with Space bar repeat
- **v1.8**: Bulletproof retry system and enhanced error display
- **v1.7**: Word count selection for large lists
- **v1.6**: Clean interface with prominent progress display
- **v1.5**: Robust CSV parsing for complex descriptions
- **v1.0**: Initial release with basic spelling game functionality
