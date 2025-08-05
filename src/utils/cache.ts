

export const mediaGroupCache = new Map<string, {
    fileIds: string[];
    lastUpdate: number;
}>();

export const mediaGroupTimeouts = new Map<string, NodeJS.Timeout>();