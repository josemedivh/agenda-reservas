import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  loginSchema,
  registerSchema,
  type CurrentUserResponse,
  type LoginInput,
  type RegisterInput,
} from '@turnero/shared';
import type { Request, Response } from 'express';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe.js';
import type { SessionPrincipal } from '../application/authenticate-session.js';
import { GetCurrentUser } from '../application/get-current-user.js';
import { LogIn } from '../application/log-in.js';
import { LogOut } from '../application/log-out.js';
import { RegisterUser } from '../application/register-user.js';
import { CurrentPrincipal } from './request-context.js';
import { clearSessionCookie, readSessionToken, setSessionCookie } from './session-cookie.js';
import { SessionGuard } from './session.guard.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUser: RegisterUser,
    private readonly logIn: LogIn,
    private readonly logOut: LogOut,
    private readonly getCurrentUser: GetCurrentUser,
  ) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CurrentUserResponse> {
    const { userId, session } = await this.registerUser.execute(body);
    setSessionCookie(response, session);
    return this.getCurrentUser.execute(userId);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CurrentUserResponse> {
    const { userId, session } = await this.logIn.execute(body);
    setSessionCookie(response, session);
    return this.getCurrentUser.execute(userId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.logOut.execute(readSessionToken(request));
    clearSessionCookie(response);
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@CurrentPrincipal() principal: SessionPrincipal): Promise<CurrentUserResponse> {
    return this.getCurrentUser.execute(principal.userId);
  }
}
