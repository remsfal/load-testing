import http from 'k6/http';
import { check, sleep} from 'k6';

const BASE_URL     = __ENV.BASE_URL     || 'http://localhost:8080';
const PROJECT_ID   = __ENV.PROJECT_ID   || 'some-project-id';
const TASK_ID      = __ENV.TASK_ID      || 'some-task-id';
const SESSION_ID   = __ENV.SESSION_ID   || 'some-session-id';
const COOKIE_VALUE = __ENV.TEST_COOKIE  || '';

export function createChatSession() {
    const url = `${BASE_URL}/api/v1/projects/${PROJECT_ID}/tasks/${TASK_ID}/chat`;
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
    const url = `${BASE_URL}/api/v1/projects/${PROJECT_ID}/tasks/${TASK_ID}/chat/${SESSION_ID}/messages`;
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
    const url = `${BASE_URL}/api/v1/projects/${PROJECT_ID}/tasks/${TASK_ID}/chat/${SESSION_ID}/messages/upload`;

    // 1) Provide the file content, the file name, and the correct MIME type:
    let fileData = http.file(
        'Hello from k6.\n',     // file content
        'hello.txt',            // file name
        'text/plain'            // explicit MIME type
    );

    // 2) Let k6 handle the multipart boundary by passing `fileData` in the body.
    // 3) Only supply necessary headers like Cookie:
    let params = {
        headers: {
            'Cookie': COOKIE_VALUE
            // DO NOT manually set 'Content-Type': k6 will do it for you
        },
    };

    let formData = { file: fileData };
    let res = http.post(url, formData, params);

    check(res, {
        'uploadFileMessage => 201': (r) => r.status === 201,
    });

    sleep(1);
}