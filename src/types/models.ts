import { ProcessingMode } from "./enums.js";

export type TaskId = string;

export interface TextJobData {
    taskId: TaskId;
    chatId: number;
    userId: number;
    text: string;
    mode: ProcessingMode;

}

export interface OCRSingleJobData {
    taskId: TaskId;
    chatId: number;
    userId: number;
    fileId: string;//Telegram photo 最大尺寸的file_id
}

export interface OCRGroupJobData {
    taskId: TaskId;
    chatId: number;
    userId: number;
    groupId: string;//media_group_Id
    fileIds: string[];//同组多张图片的file_id列表
}