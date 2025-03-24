import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;
  private readonly ivLength = 16;

  constructor(private configService: ConfigService) {
    // Use a secret key from environment variables
    const secretKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!secretKey) {
      throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    // Create a fixed-length key using SHA-256
    this.key = crypto.createHash('sha256').update(String(secretKey)).digest();
  }

  encrypt(text: string): string {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(this.ivLength);

    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Prepend the IV to the encrypted data (we'll need it for decryption)
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedText: string): string {
    // Split the encrypted text to get the IV and the actual encrypted data
    const textParts = encryptedText.split(':');
    if (textParts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }

    // Convert the IV from hex to Buffer
    const iv = Buffer.from(textParts[0], 'hex');

    // Get the encrypted data
    const encryptedData = textParts[1];

    // Create decipher
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);

    // Decrypt the data
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
