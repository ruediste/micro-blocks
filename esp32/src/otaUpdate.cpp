#include "webServer.h"
#include "Update.h"
#include <ArduinoOTA.h>

namespace otaUpdate
{
    void restart()
    {
        yield();
        delay(1000);
        yield();
        ESP.restart();
    }

    void setup()
    {
        webServer::server.on(
            "/api/update", HTTP_POST, [&](AsyncWebServerRequest *request)
            {
                // the request handler is triggered after the upload has finished... 
                // create the response, add header, and send response
                AsyncWebServerResponse *response = request->beginResponse((Update.hasError())?500:200, "text/plain", (Update.hasError())?"FAIL":"OK");
                response->addHeader("Connection", "close");
                response->addHeader("Access-Control-Allow-Origin", "*");
                request->send(response);
                Serial.println("Update complete, restarting...");
                restart(); },
            NULL,
            [&](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total)
            {
                // Upload handler chunks in data
                if (index == 0)
                {
                    int cmd = (request->hasParam("fileSystem")) ? U_SPIFFS : U_FLASH;
                    Serial.println(String("OTA Update Start ") + (cmd == U_SPIFFS ? "Frontend" : "Code"));
                    if (!Update.begin(UPDATE_SIZE_UNKNOWN, cmd, -1, LOW, "spiffs")) // label is ignored for the U_FLASH command
                    {                                                               // Start with max available size
                        Update.printError(Serial);
                        return request->send(400, "text/plain", "OTA could not begin");
                    }
                }

                // Write chunked data to the free sketch space
                if (len)
                {
                    if (Update.write(data, len) != len)
                    {
                        return request->send(400, "text/plain", "OTA could not begin");
                    }
                }

                if (index + len == total)
                { // if the final flag is set then this is the last frame of data
                    if (!Update.end(true))
                    { // true to set the size to the current progress
                        Update.printError(Serial);
                        return request->send(400, "text/plain", "Could not end OTA");
                    }
                }
                else
                {
                    return;
                }
            });
    }

    void loop()
    {
        ArduinoOTA.handle();
    }
}