import { Context } from "grammy";

export interface MediaGroupState {
    __mediaGroup?: (
        chatId: number,
        userId: number,
        groupId: string,
        fileId: string,
        taskId: string,
    ) => Promise<void>
}

export type StateFlavor = { state: MediaGroupState };
export type MyContext = Context & StateFlavor;