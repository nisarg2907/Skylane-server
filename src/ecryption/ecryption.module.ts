import { Module } from '@nestjs/common';
import { EncryptionService } from 'src/encryption/encryption.service';

@Module({
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class EcryptionModule {}
