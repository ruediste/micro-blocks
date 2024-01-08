#include "webServer.h"
#include "AsyncJson.h"
#include "main.h"
#include "machine.h"
#include "modules/modules.h"
#include "resourcePool.h"
#include "ArduinoNvs.h"

namespace microBlocks
{

    fs::File workspaceFile;
    fs::File codeFile;
    volatile bool codeChanged = true;
    time_t startTime = 0;
    bool rebootLockCleared = false;

    void setup()
    {
        webServer::server.on(
            "/api/workspace", HTTP_GET,
            [](AsyncWebServerRequest *request)
            {
                request->send(main::dataFS, "/workspace.json", "application/json");
            });

        webServer::server.on(
            "/api/workspace", HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
            [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total)
            {
                if (!index)
                {
                    Serial.printf("Workspace start. Total: %u B\n", total);
                    workspaceFile = main::dataFS.open("/workspace-tmp.json", "w", true);
                }

                Serial.printf("Write to Workspace. Index: %u B\n", index);
                workspaceFile.write(data, len);
                if (index + len == total)
                {
                    Serial.printf("Workspace end: %u B\n", total);
                    workspaceFile.close();
                    main::dataFS.rename("/workspace-tmp.json", "/workspace.json");
                    request->send(200);
                }
            });

        webServer::server.on(
            "/api/code", HTTP_POST, [](AsyncWebServerRequest *request) {}, NULL,
            [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total)
            {
                if (!index)
                {
                    Serial.printf("code start: %u B\n", total);
                    codeFile = main::dataFS.open("/code-tmp.mkb", "w", true);
                }

                Serial.printf("Write to Code: %u B\n", total);
                codeFile.write(data, len);
                if (index + len == total)
                {
                    Serial.printf("Code end: %u B\n", total);
                    codeFile.close();
                    main::dataFS.rename("/code-tmp.mkb", "/code.mkb");
                    request->send(200);
                    codeChanged = true;
                }
            });

        machine::setup();
        modules::setup();

        codeChanged = NVS.getInt("rebootLock") == 0;
        NVS.setInt("rebootLock", 1, true);
        startTime = millis();
    }

    void loop()
    {
        if (!rebootLockCleared && millis() - startTime > 1000)
        {
            NVS.setInt("rebootLock", 0, true);
            rebootLockCleared = true;
        }

        if (codeChanged)
        {
            codeChanged = false;
            auto file = main::dataFS.open("/code.mkb", "r");
            if (!file)
            {
                Serial.println("Failed to open code file");
                return;
            }

            Serial.println("Applying new code from flash...");
            size_t size = file.size();
            uint8_t *buf = (uint8_t *)malloc(size);
            file.read(buf, size);
            file.close();

            modules::reset();
            resourcePool::clearResources();

            machine::applyCode(buf, size);
        }
        modules::loop();
        machine::loop();
    }
}