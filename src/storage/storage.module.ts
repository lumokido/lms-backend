import { Module, Global } from '@nestjs/common';
import { R2StorageService } from './r2-storage.service.js';

@Global()
@Module({
  providers: [R2StorageService],
  exports: [R2StorageService],
})
export class StorageModule {}
