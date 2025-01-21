# Load Testing Quarkus Test integrated with k6 Example

```java
import de.remsfal.core.model.project.TaskModel;
import de.remsfal.service.TestData;
import de.remsfal.service.boundary.authentication.SessionManager;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.jboss.logging.Logger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
public class loadtesting extends AbstractProjectResourceTest {

    @Inject
    Logger logger;

    static final String TASK_ID_1 = "5b111b34-1073-4f48-a79d-f19b17e7d56b";
    static final String TASK_ID_2 = "4b8cd355-ad07-437a-9e71-a4e2e3624957";
    static final String EXAMPLE_CHAT_SESSION_ID_1 = "64ab9ef0-25ef-4a1c-81c9-5963f7c7d211";

    @BeforeEach
    protected void setup() throws Exception {
        logger.info("Setting up test data");
        logger.info("Setting up test users and projects. User " +  TestData.USER_ID +
                " is the manager of all projects.");
        super.setupTestUsers();
        super.setupTestProjects();
        logger.info("Setting up project memberships");
        runInTransaction(() -> entityManager
                .createNativeQuery("INSERT INTO PROJECT_MEMBERSHIP (PROJECT_ID, USER_ID, MEMBER_ROLE) VALUES (?,?,?)")
                .setParameter(1, TestData.PROJECT_ID_1)
                .setParameter(2, TestData.USER_ID_2)
                .setParameter(3, "STAFF")
                .executeUpdate());
        logger.info("User " + TestData.USER_ID_2 + " is a caretaker in project " + TestData.PROJECT_ID_1);
        runInTransaction(() -> entityManager
                .createNativeQuery("INSERT INTO PROJECT_MEMBERSHIP (PROJECT_ID, USER_ID, MEMBER_ROLE) VALUES (?,?,?)")
                .setParameter(1, TestData.PROJECT_ID_1)
                .setParameter(2, TestData.USER_ID_3)
                .setParameter(3, "LESSOR")
                .executeUpdate());
        logger.info("User " + TestData.USER_ID_3 + " is a lessor in project " + TestData.PROJECT_ID_1);
        runInTransaction(() -> entityManager
                .createNativeQuery("INSERT INTO PROJECT_MEMBERSHIP (PROJECT_ID, USER_ID, MEMBER_ROLE) VALUES (?,?,?)")
                .setParameter(1, TestData.PROJECT_ID_1)
                .setParameter(2, TestData.USER_ID_4)
                .setParameter(3, "PROPRIETOR")
                .executeUpdate());
        logger.info("User " + TestData.USER_ID_4 + " is a proprietor in project " + TestData.PROJECT_ID_1);
        runInTransaction(() -> entityManager
                .createNativeQuery("INSERT INTO TASK (ID, TYPE, PROJECT_ID, TITLE, DESCRIPTION, STATUS, CREATED_BY)"
                        +
                        " VALUES (?,?,?,?,?,?,?)")
                .setParameter(1, TASK_ID_1)
                .setParameter(2, "TASK")
                .setParameter(3, TestData.PROJECT_ID_1)
                .setParameter(4, TestData.TASK_TITLE_1)
                .setParameter(5, TestData.TASK_DESCRIPTION_1)
                .setParameter(6, TaskModel.Status.OPEN.name())
                .setParameter(7, TestData.USER_ID)
                .executeUpdate());
        runInTransaction(() -> entityManager
                .createNativeQuery("INSERT INTO TASK (ID, TYPE, PROJECT_ID, TITLE, DESCRIPTION, STATUS, CREATED_BY)"
                        +
                        " VALUES (?,?,?,?,?,?,?)")
                .setParameter(1, TASK_ID_2)
                .setParameter(2, "DEFECT")
                .setParameter(3, TestData.PROJECT_ID_1)
                .setParameter(4, "DEFECT TITLE")
                .setParameter(5, "DEFECT DESCRIPTION")
                .setParameter(6, TaskModel.Status.OPEN.name())
                .setParameter(7, TestData.USER_ID)
                .executeUpdate());
    }

    @Test
    public void testLoadWithK6AndPrometheusRemoteWrite() throws Exception {
        // Build cookies from your existing logic.
        Map<String, ?> cookies = buildCookies(
                TestData.USER_ID,
                TestData.USER_EMAIL,
                Duration.ofMinutes(1000)
        );
        logger.info("Cookies: " + cookies);

        String cookieString = SessionManager.ACCESS_COOKIE_NAME + "="
                + cookies.get(SessionManager.ACCESS_COOKIE_NAME)
                + "; " + SessionManager.REFRESH_COOKIE_NAME + "="
                + cookies.get(SessionManager.REFRESH_COOKIE_NAME);
        logger.info("Cookie String: " + cookieString);

        String k6ScriptPath = "/home/example/IdeaProjects/load-testing/scenario-default.js";

        ProcessBuilder k6Pb = new ProcessBuilder(
                "k6",
                "run",
                "--out", "json=./k6_results.json",
                k6ScriptPath
        );

        // Set the environment variables for k6.
        Map<String, String> env = k6Pb.environment();
        env.put("BASE_URL", "http://localhost:8081");
        env.put("PROJECT_ID", TestData.PROJECT_ID_1);
        env.put("TASK_ID", TASK_ID_1);
        env.put("SESSION_ID", EXAMPLE_CHAT_SESSION_ID_1);
        env.put("TEST_COOKIE", cookieString);

        logger.info("Session Id" + EXAMPLE_CHAT_SESSION_ID_1);

        Process k6Process = k6Pb.start();

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
        assertEquals(0, k6ExitCode, "k6 should exit with code 0 if successful");

    }
}
```