import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

export class GoogleDriveService {
  private drive: any;
  private isConnected: boolean = false;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      // Try to get credentials from environment variables
      const credentialsJson = process.env.GOOGLE_CREDENTIALS || process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
      
      if (!credentialsJson) {
        console.warn('Google Drive credentials not found. Using offline mode.');
        return;
      }

      const credentials = JSON.parse(credentialsJson);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
      });

      this.drive = google.drive({ version: 'v3', auth });
      this.isConnected = true;
      console.log('Google Drive API initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Drive API:', error);
      this.isConnected = false;
    }
  }

  async downloadFile(fileId: string, localPath: string): Promise<boolean> {
    if (!this.isConnected) {
      console.warn('Google Drive not connected. Cannot download file.');
      return false;
    }

    try {
      const response = await this.drive.files.get({
        fileId,
        alt: 'media',
      }, { responseType: 'stream' });

      const dest = fs.createWriteStream(localPath);
      response.data.pipe(dest);

      return new Promise((resolve, reject) => {
        dest.on('finish', () => resolve(true));
        dest.on('error', reject);
      });
    } catch (error) {
      console.error(`Failed to download file ${fileId}:`, error);
      return false;
    }
  }

  async fileExists(fileId: string): Promise<boolean> {
    if (!this.isConnected) {
      return false;
    }

    try {
      await this.drive.files.get({ fileId });
      return true;
    } catch (error) {
      return false;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  async listFiles(folderId?: string): Promise<any[]> {
    if (!this.isConnected) {
      return [];
    }

    try {
      const response = await this.drive.files.list({
        q: folderId ? `'${folderId}' in parents` : undefined,
        fields: 'files(id, name, size, modifiedTime)',
      });

      return response.data.files || [];
    } catch (error) {
      console.error('Failed to list files:', error);
      return [];
    }
  }
}

export const googleDriveService = new GoogleDriveService();
