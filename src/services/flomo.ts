
import axios from 'axios';

export class FlomoAPI {
    async save(text: string, userId: number) {
        await axios.post(process.env.FLOMO_WEBHOOK!, {
            content: text
        });
    }
}