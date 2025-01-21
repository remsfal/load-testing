import { sleep } from 'k6';
import { createChatSession, sendTextMessage, uploadFileMessage } from './chat-requests.js';

export let options = {
    scenarios: {
        ramping_test: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '10s', target: 1 },   // ramp up to 5 users
                { duration: '10s', target: 2 },  // then up to 10
                { duration: '10s', target: 0 },   // then back down
            ],
        },
    },
};

export default function () {
    createChatSession();
    for (let i = 0; i < 10; i++) { // Corrected syntax
        sendTextMessage();
    }
    uploadFileMessage();
    sleep(2);
}
