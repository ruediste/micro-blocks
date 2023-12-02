#include "serialRequest.h"
#include <queue>
#include <Arduino.h>
#include "webServer.h"
namespace serialRequest
{
    // RX: 16
    // TX: 17
    std::tuple<String *, std::function<void(String *response)>> request;
    std::queue<std::tuple<String *, std::function<void(String *response)>>> pendingRequests;
    bool processingRequest = false;
    bool waitingForResponse = false;
    uint32_t waitingForResponseStart;

    String response;

    void queue(String *body, std::function<void(String *response)> responseHandler)
    {
        Serial.println("Queuing request " + *body);
        pendingRequests.push(std::make_tuple(body, responseHandler));
    }

    void setup()
    {
        Serial.println("Setting up Serial2...");
        Serial2.begin(9600);
        Serial.println("Setting up Serial2 done");

        webServer::server.addHandler(webServer::stringBodyHandler(
            "/api/serial",
            HTTP_POST,
            [](AsyncWebServerRequest *request, String *body)
            { serialRequest::queue(body, [request](String *response)
                                   { request->send(200, "text/plain", *response); }); }));
    }

    void loop()
    {
        if (waitingForResponse)
        {
            if (millis() - waitingForResponseStart > 1000)
            {
                // timeout reached
                Serial.println("Timeout reached");
                response.clear();
                std::get<1>(request)(&response);
                processingRequest = false;
                waitingForResponse = false;
            }
            else
            {
                while (Serial2.available() > 0)
                {
                    auto ch = Serial2.read();
                    if (ch == '\n')
                    {
                        processingRequest = false;
                        waitingForResponse = false;
                        Serial.println("Received from Serial2 and returning: " + response);
                        std::get<1>(request)(&response);
                        break;
                    }
                    response.concat((char)ch);
                }
            }
        }
        else
        {
            if (!processingRequest)
            {
                cli();
                if (!pendingRequests.empty())
                {
                    request = pendingRequests.front();
                    pendingRequests.pop();
                    processingRequest = true;
                }
                sei();
            }

            if (processingRequest)
            {
                String &requestString = *std::get<0>(request);
                Serial.println("Sending to Serial2: " + requestString);
                // clear incoming data
                while (Serial2.available())
                    Serial2.read();
                // send request
                Serial2.print(requestString + "\n");
                response.clear();
                waitingForResponse = true;
                waitingForResponseStart = millis();
            }
        }
    }
}
