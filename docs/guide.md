# Guide to use k6 and a Quarkus Test to handle a load testing

This guide provides instructions for running load tests using K6 in conjunction with a Quarkus test framework.
I will use load testing on the chat service in remsfal-backend as an example. 
## k6 implementation
### Environment Variables
set these environment variables in the chat-requests.js 

- `const BASE_URL     = __ENV.BASE_URL`
- `const PROJECT_ID   = __ENV.PROJECT_ID`
- `const TASK_ID      = __ENV.TASK_ID`
- `const SESSION_ID   = __ENV.SESSION_ID`
- `const COOKIE_VALUE = __ENV.TEST_COOKIE`  

These environment variables will be set by the Quarkus Test that will be explained later. 

### Functions
Implement functions to make the http requests, as en example like this:

```javascript
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
```
### Test Scenarios
in another file like scenario-default.js define the load testing scenarios, like this:
import sleep from k6, import the functions from chat-requests.js to be called and define scenarios. 
These will be called and used in the Quarkus test. 

```javascript
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
```
## Quarkus Test Implementation
### Set up environemt
Set up the test data and the test environment. See the @BeforeEach function in
[exmaple](docs/loadtesting.md). 

### Build cookies to handle authentication for the service while load testing

```java
 Map<String, ?> cookies = buildCookies(
                TestData.USER_ID,
                TestData.USER_EMAIL,
                Duration.ofMinutes(1000)
        );
```
### set the path to your k6 scripts

```java
        String k6ScriptPath = "/home/example/IdeaProjects/load-testing/scenario-default.js";
```

### use ProcessBuilder to run k6 with the built cookies
Use the proccess builder to make the k6 command to be run
```java
ProcessBuilder k6Pb = new ProcessBuilder(
                "k6",
                "run",
                "--out", "json=./k6_results.json",
                k6ScriptPath
        );
```
in this example i just want the results as a json. 
Then set the environment variables and run the process
```java
// Set the environment variables for k6.
        Map<String, String> env = k6Pb.environment();
        env.put("BASE_URL", "http://localhost:8081");
        env.put("PROJECT_ID", TestData.PROJECT_ID_1);
        env.put("TASK_ID", TASK_ID_1);
        env.put("SESSION_ID", EXAMPLE_CHAT_SESSION_ID_1);
        env.put("TEST_COOKIE", cookieString);

        logger.info("Session Id" + EXAMPLE_CHAT_SESSION_ID_1);

        Process k6Process = k6Pb.start();
```
### Stream the logs from k6 using BufferedReader
```java
try (BufferedReader k6OutReader = new BufferedReader(new InputStreamReader(k6Process.getInputStream()));
             BufferedReader k6ErrReader = new BufferedReader(new InputStreamReader(k6Process.getErrorStream()))) {
            String line;
            while ((line = k6OutReader.readLine()) != null) {
                System.out.println("[k6 OUT] " + line);
            }
            while ((line = k6ErrReader.readLine()) != null) {
                System.err.println("[k6 ERR] " + line);
            }
        }
        int k6ExitCode = k6Process.waitFor();
        System.out.println("k6 finished with exitCode=" + k6ExitCode);
```

