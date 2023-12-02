#pragma once

#include "ESPAsyncWebServer.h"
#include <list>
namespace webServer
{
    extern AsyncWebServer server;
    extern AsyncCallbackWebHandler *stringBodyHandler(const char *uri, WebRequestMethodComposite method, std::function<void(AsyncWebServerRequest *request, String *body)> onRequest);

    void setup();
    void startWebServer();

    struct LongPollingManager
    {
        int version;

        void add(std::function<void()> callback, unsigned long timeout)
        {
            pendingRequests.push_back(std::make_tuple(callback, millis() + timeout));
        }

        ArRequestHandlerFunction handler(unsigned long timeout, std::function<void(AsyncWebServerRequest *request)> callback)
        {
            return [callback, this, timeout](AsyncWebServerRequest *request)
            {
                // get version from query parameters
                if (request->hasParam("version"))
                {
                    int expectedVersion = request->getParam("version")->value().toInt();
                    if (expectedVersion == version)
                    {
                        add([request, callback]()
                            { callback(request); },
                            timeout);
                        return;
                    }
                }
                // no version specified or version mismatch, execute callback immediately
                callback(request);
            };
        }

        void loop()
        {
            for (auto it = pendingRequests.begin(); it != pendingRequests.end();)
            {
                auto request = *it;
                if (std::get<1>(request) < millis())
                {
                    std::get<0>(request)();
                    it = pendingRequests.erase(it);
                }
                else
                {
                    it++;
                }
            }
        }

        void bump()
        {
            version++;
            for (auto request : pendingRequests)
            {
                std::get<0>(request)();
            }
            pendingRequests.clear();
        }

    private:
        std::list<std::tuple<std::function<void()>, unsigned long>> pendingRequests;
    };
}