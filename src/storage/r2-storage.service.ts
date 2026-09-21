
import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

@Injectable()
export class R2StorageService {
  private readonly logger = new Logger(R2StorageService.name);
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucketName = process.env.R2_BUCKET_NAME || 'books';

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      this.logger.warn('Cloudflare R2 credentials missing in environment variables.');
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });

    this.logger.log(`Cloudflare R2 Storage initialized for bucket: ${this.bucketName}`);
  }

  /**
   * Uploads a file buffer directly to Cloudflare R2
   */
  async uploadFile(
    fileBuffer: Buffer,
    key: string,
    mimeType: string,
  ): Promise<{ key: string; size: number; mimeType: string }> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: mimeType,
      });

      await this.s3Client.send(command);
      this.logger.log(`Successfully uploaded file to R2: ${key}`);

      return {
        key,
        size: fileBuffer.length,
        mimeType,
      };
    } catch (error: any) {
      this.logger.error(`Failed to upload to R2 (${key}): ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generates a temporary, time-limited presigned URL (e.g. 5 minutes)
   * The file stays 100% private and cannot be downloaded after expiry.
   */
  async getPresignedReadUrl(key: string, expiresInSeconds: number = 300): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });
    } catch (error: any) {
      this.logger.error(`Failed to generate presigned URL for ${key}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Streams the file buffer directly through NestJS to the authenticated client
   * Completely hides Cloudflare R2 URLs from the browser network tab!
   */
  async getObjectStream(key: string): Promise<{
    stream: Readable;
    contentType?: string;
    contentLength?: number;
  }> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      return {
        stream: response.Body as Readable,
        contentType: response.ContentType,
        contentLength: response.ContentLength,
      };
    } catch (error: any) {
      this.logger.error(`Failed to stream object from R2 (${key}): ${error.message}`);
      throw error;
    }
  }

  /**
   * Deletes an object from Cloudflare R2
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.s3Client.send(command);
      this.logger.log(`Deleted object from R2: ${key}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to delete object from R2 (${key}): ${error.message}`);
      return false;
    }
  }
}
