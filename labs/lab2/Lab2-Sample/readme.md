# Lab 2 – Sample Node.js + MongoDB App

This project shows how to connect a Node.js + Express app to MongoDB Atlas and read data from the **Lab2.Agriculture** collection.

## 🚀 Quick Start
1. Pull or clone the repository  
   If you already have the repo locally:  
   `git pull origin main`  
   If not, clone it:  
   `git clone <repo-url>`  
   `cd Lab2-Sample`

2. Install dependencies  
   `npm install`

3. Create your `.env` file in the root directory:  


⚠️ Do **not** commit `.env`. It is already excluded by `.gitignore`.

4. Run the app  
`node app.js`

5. Test the endpoints  
- http://localhost:3000/agriculture → returns all documents  
- http://localhost:3000/debug/agriculture → shows a document count + sample

## 📦 Scripts
- `npm start` → runs `node app.js`  
- `npm run dev` → runs with nodemon for auto-restart  

## 📚 Useful Commands
- Update your local repo: `git pull origin main`  
- Reinstall dependencies: `rm -rf node_modules && npm install`

## 🔐 Security Reminder
- Keep `.env` private. Never commit credentials.  
- If credentials are exposed, reset the password in MongoDB Atlas.  
- For lab purposes, you may allow `0.0.0.0/0` in Atlas Network Access, but in production restrict to specific IPs.