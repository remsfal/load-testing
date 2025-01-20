import http from 'k6/http';
import { check, sleep} from 'k6';

const BASE_URL     = __ENV.BASE_URL     || 'http://localhost:8080';
const PROJECT_ID   = __ENV.PROJECT_ID   || 'some-project-id';
const TASK_ID      = __ENV.TASK_ID      || 'some-task-id';
const SESSION_ID   = __ENV.SESSION_ID   || 'some-session-id';
const COOKIE_VALUE = __ENV.TEST_COOKIE  || '';

export function createChatSession() {
    const url = `${BASE_URL}/api/v1/projects/${PROJECT_ID}/tasks/${TASK_ID}/chats`;
    const params = {
        headers: {
            'Cookie': COOKIE_VALUE,
            'Content-Type': 'application/json',
        },
    };
    let res = http.post(url, null, params);
    check(res, {
        'createChatSession => 201': (r) => r.status === 201,
    });
    sleep(1);
}

export function sendTextMessage() {
    const url = `${BASE_URL}/api/v1/projects/${PROJECT_ID}/tasks/${TASK_ID}/chats/${SESSION_ID}/messages`;
    const payload = JSON.stringify({
        chat_session_id: SESSION_ID,
        sender_id: 'k6-sender-id',
        contentType: 'TEXT',
        content: 'Hello from k6 test!',
    });
    const params = {
        headers: {
            'Cookie': COOKIE_VALUE,
            'Content-Type': 'application/json',
        },
    };
    let res = http.post(url, payload, params);
    check(res, {
        'sendTextMessage => 201': (r) => r.status === 201,
    });
    sleep(1);
}

export function uploadFileMessage() {
    const url = `${BASE_URL}/api/v1/projects/${PROJECT_ID}/tasks/${TASK_ID}/chats/${SESSION_ID}/messages/upload`;

    // Generate 1 MB of dummy text (1,024 * 1024 = 1 MB).
    // Each character is a byte when used in this manner.
    const oneMB = new Array(1024 * 1024).fill('A').join('');

    // Wrap it in the file() helper so k6 does multipart boundaries, etc.
    let fileData = http.file(
        oneMB,        // 1 MB of "A"
        'large-file.txt', // file name
        'text/plain'  // MIME type
    );

    let params = {
        headers: {
            'Cookie': COOKIE_VALUE,
            // Don't set Content-Type manually; k6 sets multipart boundaries automatically
        },
    };

    let formData = { file: fileData };
    let res = http.post(url, formData, params);

    check(res, {
        'uploadFileMessage => 201': (r) => r.status === 201,
    });

    sleep(1);
}