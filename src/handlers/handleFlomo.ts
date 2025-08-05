import axios from 'axios';

export async function handleFlomo(markdown: string): Promise<void> {
    await axios.post(process.env.FLOMO_WEBHOOK!, {
        content: markdown
    });
}