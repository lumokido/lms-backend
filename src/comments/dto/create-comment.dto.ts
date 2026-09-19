import { IsNotEmpty, IsString, IsEmail, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  authorName!: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Valid email is required' })
  authorEmail!: string;

  @IsNotEmpty({ message: 'Comment text is required' })
  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  authorAvatar?: string;
}
