import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
} from 'class-validator';

export class UpdateBookDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsString()
  @IsIn(['PDF', 'EPUB'])
  @IsOptional()
  format?: 'PDF' | 'EPUB';

  @IsNumber()
  @IsOptional()
  pages?: number;

  @IsString()
  @IsOptional()
  fileSize?: string;

  @IsString()
  @IsOptional()
  r2StorageKey?: string;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsIn(['published', 'draft'])
  @IsOptional()
  status?: 'published' | 'draft';

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  course?: string;

  @IsNumber()
  @IsOptional()
  discountPrice?: number;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  publicationInfo?: string;

  @IsOptional()
  previewSettings?: {
    allowPreview?: boolean;
    previewPagesCount?: number;
  };

  @IsOptional()
  purchasesDisabled?: boolean;
}

