#include "webServer.h"
#include "LittleFS.h"

namespace webServer
{
    AsyncWebServer server(80);

    AsyncCallbackWebHandler *stringBodyHandler(const char *uri, WebRequestMethodComposite method, std::function<void(AsyncWebServerRequest *request, String *body)> onRequest)
    {
        AsyncCallbackWebHandler *handler = new AsyncCallbackWebHandler();
        handler->setUri(uri);
        handler->setMethod(method);
        handler->onRequest(
            [onRequest](AsyncWebServerRequest *request)
            {
                String *body = ((String *)request->_tempObject);
                if (body != NULL)
                {
                    onRequest(request, body);
                }
            });
        handler->onBody(
            [](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total)
            {
                if (request->_tempObject == NULL)
                {
                    request->_tempObject = new String();
                }
                ((String *)request->_tempObject)->concat(data, len);
            });
        return handler;
    }

    bool nonApiRequest(AsyncWebServerRequest *request)
    {
        return !request->url().startsWith("/api/");
    }

    void setup()
    {
        // setup static web site serving
        server.serveStatic("/", LittleFS, "/")
            .setDefaultFile("index.html")
            .setFilter(nonApiRequest);

        server.onNotFound([](AsyncWebServerRequest *request)
                          { 
                            if (nonApiRequest(request))
                                request->send(LittleFS, "/index.html" );
                            else 
                                request->send(404); });
    }

    void startWebServer()
    {
        Serial.println("Starting webserver ...");
        server.begin();
    }
}