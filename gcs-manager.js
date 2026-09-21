import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

// Initialize Google Cloud Storage
// Uses Application Default Credentials (ADC) or GCS Bucket Config
let storage;
try {
    storage = new Storage();
} catch (err) {
    console.warn("Google Cloud Storage ADC initialization fallback:", err.message);
}

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'halo-fitness-app-storage';

export async function backupDatabaseToGCS(dbFilePath) {
    if (!storage) {
        throw new Error("Google Cloud Storage client is not initialized.");
    }
    const bucket = storage.bucket(BUCKET_NAME);
    const destination = `backups/db_backup_${Date.now()}.db`;
    
    await bucket.upload(dbFilePath, {
        destination: destination,
        metadata: {
            cacheControl: 'no-cache',
        },
    });

    console.log(`✅ SQLite Database backed up successfully to GCS: gs://${BUCKET_NAME}/${destination}`);
    return `gs://${BUCKET_NAME}/${destination}`;
}

export async function uploadMealPhotoToGCS(base64Data, filename) {
    if (!storage) {
        // Fallback simulated URL if credentials aren't configured yet
        return { url: `/uploads/${filename}`, bucket: BUCKET_NAME, path: `meals/${filename}` };
    }
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(`meals/${filename}`);
    
    const buffer = Buffer.from(base64Data.replace(/^data:image\/\w+;base64,/, ''), 'base64');
    await file.save(buffer, {
        contentType: 'image/jpeg',
        metadata: { cacheControl: 'public, max-age=31536000' }
    });

    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/meals/${filename}`;
    return { url: publicUrl, bucket: BUCKET_NAME, path: `meals/${filename}` };
}

export async function syncUserLogsToGCS(userId, logsData) {
    if (!storage) return null;
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(`user_data/${userId}/logs.json`);
    await file.save(JSON.stringify(logsData, null, 2), {
        contentType: 'application/json'
    });
    return `gs://${BUCKET_NAME}/user_data/${userId}/logs.json`;
}
