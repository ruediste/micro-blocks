#include <Arduino.h>
#include "systemStatus.h"
#include "webServer.h"
#include "AsyncJson.h"
namespace systemStatus
{
    void setup()
    {
        webServer::server.on(
            "/api/systemStatus", HTTP_GET, [](AsyncWebServerRequest *request)
            {
                                             AsyncJsonResponse *response = new AsyncJsonResponse();
                                             JsonVariant &root = response->getRoot();
                                             root["temperature"] = temperatureRead();
                                             root["hall"] = hallRead();
                                             root["freeHeap"] = esp_get_free_heap_size();
                                             response->setLength();
                                             request->send(response); });

        webServer::server.on("/api/restart", HTTP_POST, [](AsyncWebServerRequest *request)
                             { ESP.restart(); });
    }
} // namespace systemStatus