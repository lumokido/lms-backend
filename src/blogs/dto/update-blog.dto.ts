import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateBlogDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  authorAvatar?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  readTime?: string;

  @IsOptional()
  @IsIn(['published', 'draft'])
  status?: 'published' | 'draft';

  @IsOptional()
  @IsString()
  coverImage?: string;
}
