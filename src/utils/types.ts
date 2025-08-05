import { Context } from 'grammy';
import { type SessionFlavor } from 'grammy';

export interface SessionData {
    lastPolishedText?: string;
}

export type MyContext = Context & SessionFlavor<SessionData>;