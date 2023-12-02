#pragma once

#include "ESPAsyncWebServer.h"

namespace serialRequest
{
    void queue(String *body, std::function<void(String *response)> responseHandler);
    void loop();
    void setup();
}