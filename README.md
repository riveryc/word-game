# 🎯 Interactive Word Spelling Game

A fun and educational web-based spelling game designed for young learners. Kids practice spelling by filling in missing letters while getting audio pronunciation and helpful hints.

## 🌟 Features

### 🎮 Core Gameplay
- **Interactive Spelling**: Fill in missing letters directly within the word display
- **Text-to-Speech**: Computer reads each word aloud for pronunciation help
- **Smart Hints**: Descriptive clues help kids understand word meanings

### 🎚️ Difficulty Levels
Choose from 6 difficulty levels:
- **Level 1 - Easy**: 50% missing letters
- **Level 2 - Medium**: 60% missing letters  
- **Level 3 - Normal**: 70% missing letters (default)
- **Level 4 - Hard**: 80% missing letters
- **Level 5 - Expert**: 90% missing letters
- **🔥 NIGHTMARE 🔥**: 100% missing letters (ultimate challenge!)

### 📚 Educational Features
- **Vocabulary Building**: Each word includes a helpful description
- **Pronunciation Practice**: Audio playback with repeat button
- **Mistake Learning**: Shows correct spelling when wrong
- **Retry System**: Practice only the words you got wrong
- **Progress Tracking**: See your score and improvement

### 🎨 User Experience
- **Kid-Friendly Design**: Purple theme with clear, large fonts
- **Auto-Focus**: Smart input field management
- **Responsive**: Works on desktop and mobile devices
- **Accessible**: Keyboard navigation and screen reader friendly

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

5. **Start playing!** 🎉

## 📖 How to Play

### 1. **Choose Your Difficulty**
- Select from 6 difficulty levels
- Higher levels show fewer letters
- Start with Level 1-2 for beginners

### 2. **Spell the Words**
- Listen to the word pronunciation
- Read the helpful description
- Use the 🔊 Repeat button to hear the word again

### 3. **Submit Your Answer**
- Press **Enter** when ready to check your spelling
- ✅ Correct answers move on automatically
- ❌ Incorrect answers pause for learning - press Enter to continue

### 4. **Review & Retry**
- See your final score
- Use "Retry Incorrect Words" to practice missed words
- Keep trying until you master them all!

## 📁 File Structure

```
word_game/
├── index.html          # Main game interface
├── script.js           # Game logic and functionality
├── words.csv           # Word list with descriptions
├── server.py           # Simple HTTP server
└── README.md           # This file
```

## 📝 Customizing Words

Edit `words.csv` to add your own words:

```csv
word,description
cat,A small furry animal that says meow
dog,A friendly animal that barks and wags its tail
sun,The bright yellow ball in the sky that gives us light
```

**Format**: `word,description`
- Keep words age-appropriate for your target audience
- Make descriptions clear and helpful
- Avoid commas within descriptions

## 🎨 Dev Customization

### Styling
- Edit CSS in `index.html` to change colors, fonts, or layout
- Current theme: Purple background with white Verdana text

### Difficulty Levels
- Modify percentage values in `script.js` to adjust difficulty
- Add or remove levels as needed

### Audio Settings
- Adjust speech rate, pitch, and volume in the `speakWord()` function
- Currently optimized for clarity with slower speech

## 🐛 Known Issues & Features

- **Rapid Clicking**: Fast Enter presses might skip words, but they'll be marked incorrect and require retry
- **Browser Compatibility**: Text-to-speech works best in Chrome and Edge
- **Mobile**: Touch typing works, but physical keyboard recommended for best experience

## 🤝 Contributing

This is a simple educational project! Feel free to:
- Add more words to the CSV file
- Improve the styling
- Add new features
- Fix bugs
- Share with other educators

## 📄 License

This project is open source and available for educational use.

## 🎉 Acknowledgments

Created with love for young learners everywhere! Special thanks to all the kids who will use this to improve their spelling skills.

---

**Happy Spelling!** 📚✨🎯
