import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

const sqlite = new SQLiteConnection(CapacitorSQLite);

class DatabaseService {
  constructor() {
    this.db = null;
    this.platform = Capacitor.getPlatform();
  }

  async init() {
    try {
      if (this.platform === 'web') {
        console.warn('Native SQLite is not fully supported on the web. Using localStorage mock fallback.');
        return;
      }
      
      const isConnected = await sqlite.isConnection('halofitness', false);
      if (isConnected.result) {
        this.db = await sqlite.retrieveConnection('halofitness', false);
      } else {
        this.db = await sqlite.createConnection('halofitness', false, 'no-encryption', 1, false);
      }
      
      await this.db.open();
      
      const schema = `
        CREATE TABLE IF NOT EXISTS profile (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          data TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          date TEXT UNIQUE NOT NULL,
          data TEXT NOT NULL
        );
      `;
      
      await this.db.execute(schema);
      console.log('Native SQLite Database Initialized');
    } catch (err) {
      console.error('Error initializing SQLite:', err);
    }
  }

  async saveProfile(profileData) {
    if (this.platform === 'web') {
      localStorage.setItem('nature_fit_profile', JSON.stringify(profileData));
      return;
    }
    
    try {
      const exists = await this.db.query('SELECT id FROM profile LIMIT 1');
      const dataStr = JSON.stringify(profileData);
      
      if (exists.values && exists.values.length > 0) {
        await this.db.run('UPDATE profile SET data = ? WHERE id = ?', [dataStr, exists.values[0].id]);
      } else {
        await this.db.run('INSERT INTO profile (data) VALUES (?)', [dataStr]);
      }
    } catch (err) {
      console.error('Error saving profile:', err);
    }
  }

  async getProfile() {
    if (this.platform === 'web') {
      const stored = localStorage.getItem('nature_fit_profile');
      return stored ? JSON.parse(stored) : null;
    }
    
    try {
      const res = await this.db.query('SELECT data FROM profile LIMIT 1');
      if (res.values && res.values.length > 0) {
        return JSON.parse(res.values[0].data);
      }
      return null;
    } catch (err) {
      console.error('Error getting profile:', err);
      return null;
    }
  }

  async saveLog(logData) {
    if (this.platform === 'web') {
      let logs = [];
      try {
        const stored = localStorage.getItem('nature_fit_logs');
        if (stored) logs = JSON.parse(stored);
      } catch (e) {}
      const existingLogIndex = logs.findIndex(l => l.date === logData.date);
      if (existingLogIndex >= 0) {
        logs[existingLogIndex] = logData;
      } else {
        logs.push(logData);
      }
      logs.sort((a, b) => new Date(b.date) - new Date(a.date));
      localStorage.setItem('nature_fit_logs', JSON.stringify(logs));
      return;
    }
    
    try {
      const date = logData.date;
      const dataStr = JSON.stringify(logData);
      
      const exists = await this.db.query('SELECT id FROM logs WHERE date = ?', [date]);
      
      if (exists.values && exists.values.length > 0) {
        await this.db.run('UPDATE logs SET data = ? WHERE id = ?', [dataStr, exists.values[0].id]);
      } else {
        await this.db.run('INSERT INTO logs (date, data) VALUES (?, ?)', [date, dataStr]);
      }
    } catch (err) {
      console.error('Error saving log:', err);
    }
  }

  async getLogs() {
    if (this.platform === 'web') {
      const stored = localStorage.getItem('nature_fit_logs');
      return stored ? JSON.parse(stored) : [];
    }
    
    try {
      const res = await this.db.query('SELECT data FROM logs ORDER BY date DESC');
      if (res.values && res.values.length > 0) {
        return res.values.map(row => JSON.parse(row.data));
      }
      return [];
    } catch (err) {
      console.error('Error getting logs:', err);
      return [];
    }
  }
}

// Expose globally
window.AppDB = new DatabaseService();
