import { IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class CreateBlogDto {
  @IsNotEmpty({ message: 'Title is required' })
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsNotEmpty({ message: 'Excerpt is required' })
  @IsString()
  excerpt!: string;

  @IsNotEmpty({ message: 'Article content is required' })
  @IsString()
  content!: string;

  @IsNotEmpty({ message: 'Author name is required' })
  @IsString()
  author!: string;

  @IsOptional()
  @IsString()
  authorAvatar?: string;

  @IsNotEmpty({ message: 'Category is required' })
  @IsString()
  category!: string;

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
