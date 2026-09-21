import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsIn,
} from 'class-validator';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  author: string;

  @IsString()
  @IsNotEmpty()
  category: string;

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
  @IsNotEmpty()
  r2StorageKey: string;

  @IsString()
  @IsOptional()
  coverImage?: string;

  @IsString()
  @IsOptional()
  description?: string;

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

  @IsString()
  @IsIn(['published', 'draft'])
  @IsOptional()
  status?: 'published' | 'draft';
}

