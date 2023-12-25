#include "websocket.h"
#include "ESPAsyncWebServer.h"
#include "webServer.h"

namespace websocket
{
    AsyncWebSocket ws("/api/ws");

    std::unordered_map<MessageType, MessageEntry> lastMessages;

    void send(size_t wrappedMessageSize, uint8_t *wrappedMessageData)
    {
        MessageType type = *(MessageType *)wrappedMessageData;
        auto entry = lastMessages.find(type);
        if (entry != lastMessages.end())
        {
            if (!entry->second.dataManagedByClient)
            {
                free(entry->second.data);
                entry->second.dataManagedByClient = true;
                entry->second.dataSize = 0;
            }

            entry->second.wrappedMessageSize = wrappedMessageSize;
            entry->second.data = wrappedMessageData;
        }
        else
        {
            MessageEntry entry;
            entry.dataSize = 0;
            entry.wrappedMessageSize = wrappedMessageSize;
            entry.data = wrappedMessageData;
            entry.dataManagedByClient = true;
            lastMessages.insert({type, entry});
        }

        ws.binaryAll(wrappedMessageData, wrappedMessageSize);
    }

    void send(MessageType type, size_t messageSize,
              uint8_t *messageData)
    {
        size_t wrappedSize = sizeof(MessageType) + messageSize;
        uint8_t *wrappedData;
        auto entry = lastMessages.find(type);
        if (entry != lastMessages.end())
        {
            if (entry->second.dataManagedByClient || entry->second.dataSize < wrappedSize)
            {
                if (!entry->second.dataManagedByClient)
                {
                    free(entry->second.data);
                }
                entry->second.dataSize = wrappedSize;
                entry->second.data = (uint8_t *)malloc(wrappedSize);
                entry->second.dataManagedByClient = false;
            }

            entry->second.wrappedMessageSize = wrappedSize;
            wrappedData = entry->second.data;
        }
        else
        {
            MessageEntry entry;
            entry.dataSize = wrappedSize;
            entry.wrappedMessageSize = wrappedSize;
            entry.data = (uint8_t *)malloc(wrappedSize);
            entry.dataManagedByClient = false;
            lastMessages.insert({type, entry});
            wrappedData = entry.data;
        }

        *((MessageType *)wrappedData) = type;
        memcpy(wrappedData + sizeof(MessageType), messageData, messageSize);

        ws.binaryAll(wrappedData, wrappedSize);
    }

    void os_printf(const char *format, ...)
    {
        return;
        char buffer[256];
        va_list args;
        va_start(args, format);
        vsnprintf(buffer, sizeof(buffer), format, args);
        va_end(args);
        Serial.print(buffer);
    }

    uint8_t *receiveBuffer = nullptr;
    size_t receiveBufferSize = 0;
    size_t receiveBufferPosition = 0;

    std::unordered_map<MessageType, std::function<void(uint8_t *data, size_t size)>> incomingMessageHandlers;

    void messageReceived(uint8_t *data, size_t size)
    {
        auto type = *(MessageType *)data;
        auto handler = incomingMessageHandlers.find(type);
        if (handler != incomingMessageHandlers.end())
        {
            handler->second(data + sizeof(MessageType), size - sizeof(MessageType));
        }
    }

    void onEvent(AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len)
    {
        if (type == WS_EVT_CONNECT)
        {
            // client connected
            os_printf("ws[%s][%u] connect\n", server->url(), client->id());

            for (auto &entry : lastMessages)
            {
                client->binary(entry.second.data, entry.second.wrappedMessageSize);
            }
        }
        else if (type == WS_EVT_DISCONNECT)
        {
            // client disconnected
            os_printf("ws[%s][%u] disconnect: %u\n", server->url(), client->id());
        }
        else if (type == WS_EVT_ERROR)
        {
            // error was received from the other end
            os_printf("ws[%s][%u] error(%u): %s\n", server->url(), client->id(), *((uint16_t *)arg), (char *)data);
        }
        else if (type == WS_EVT_PONG)
        {
            // pong message was received (in response to a ping request maybe)
            os_printf("ws[%s][%u] pong[%u]: %s\n", server->url(), client->id(), len, (len) ? (char *)data : "");
        }
        else if (type == WS_EVT_DATA)
        {
            // data packet
            AwsFrameInfo *info = (AwsFrameInfo *)arg;
            if (info->final && info->index == 0 && info->len == len)
            {
                // the whole message is in a single frame and we got all of it's data
                os_printf("ws[%s][%u] %s-message[%llu]: ", server->url(), client->id(), (info->opcode == WS_TEXT) ? "text" : "binary", info->len);
                if (info->opcode == WS_TEXT)
                {
                    data[len] = 0;
                    os_printf("%s\n", (char *)data);
                }
                else
                {
                    for (size_t i = 0; i < info->len; i++)
                    {
                        os_printf("%02x ", data[i]);
                    }
                    os_printf("\n");
                }

                messageReceived(data, info->len);
            }
            else
            {
                // message is comprised of multiple frames or the frame is split into multiple packets
                if (info->index == 0)
                {
                    if (info->num == 0)
                    {
                        os_printf("ws[%s][%u] %s-message start\n", server->url(), client->id(), (info->message_opcode == WS_TEXT) ? "text" : "binary");
                        receiveBufferPosition = 0;
                    }
                    os_printf("ws[%s][%u] frame[%u] start[%llu]\n", server->url(), client->id(), info->num, info->len);
                }

                os_printf("ws[%s][%u] frame[%u] %s[%llu - %llu]: ", server->url(), client->id(), info->num, (info->message_opcode == WS_TEXT) ? "text" : "binary", info->index, info->index + len);
                if (info->message_opcode == WS_TEXT)
                {
                    data[len] = 0;
                    os_printf("%s\n", (char *)data);
                }
                else
                {
                    for (size_t i = 0; i < len; i++)
                    {
                        os_printf("%02x ", data[i]);
                    }
                    os_printf("\n");
                }

                if (receiveBuffer == nullptr || receiveBufferPosition + len > receiveBufferSize)
                {
                    receiveBufferSize = receiveBufferPosition + len;
                    receiveBuffer = (uint8_t *)realloc(receiveBuffer, receiveBufferSize);
                }

                memcpy(receiveBuffer + receiveBufferPosition, data, len);
                receiveBufferPosition += len;

                if ((info->index + len) == info->len)
                {
                    os_printf("ws[%s][%u] frame[%u] end[%llu]\n", server->url(), client->id(), info->num, info->len);
                    if (info->final)
                    {
                        os_printf("ws[%s][%u] %s-message end\n", server->url(), client->id(), (info->message_opcode == WS_TEXT) ? "text" : "binary");
                        messageReceived(receiveBuffer, receiveBufferPosition);
                    }
                }
            }
        }
    }

    void setup()
    {
        ws.onEvent(onEvent);
        webServer::server.addHandler(&ws);
    }

    void loop()
    {
        ws.cleanupClients();
    }
}